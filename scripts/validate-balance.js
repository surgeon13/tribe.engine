#!/usr/bin/env node
/**
 * Fairness gate for the troop tables.
 *
 * Identity is free, price is not: a tribe may put its combat index wherever it
 * likes, but it has to pay the anchor rate for it in crop and in resources. This
 * checks the payment, so a well-meant buff cannot quietly turn into a tribe that
 * is both stronger and cheaper than everyone else.
 *
 * Checks, in order of how loudly they fail:
 *   1. every identity spec's crop pressure stays inside the allowed range
 *   2. every player tribe's realized power price sits inside the tolerance band
 *   3. every tribe's heavy cavalry is its strongest and dearest army unit
 *   4. no slot is filler — every unit is the best pick for something
 *   5. no two tribes ship the same stat block (copy-paste rosters)
 *   6. tier ordering holds: boss > NPC guard > players > wildlife
 *   7. stats stay inside sane ranges and tiers do not go backwards
 *
 * Usage: npm run validate:balance [-- --json]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  SCORED_REFS,
  SLOT_ANCHORS,
  combatIndex,
  pricePaid,
  totalCost,
} from "../lib/balance/anchors.js";
import { isCanonTribe } from "../lib/balance/canon.js";
import {
  CROP_PRESSURE_RANGE,
  FAIRNESS_TOLERANCE,
  POWER_TIERS,
  TRIBE_IDENTITIES,
} from "../lib/balance/identities.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const asJson = process.argv.includes("--json");

const index = JSON.parse(fs.readFileSync(path.join(dataDir, "tribes/index.json"), "utf8"));
const baseUnits = JSON.parse(fs.readFileSync(path.join(dataDir, "units.base.json"), "utf8"));
const baseById = baseUnits.units || {};

const errors = [];
const warnings = [];

/** @type {Array<{ id: string, tier: string, cropEfficiency: number, resEfficiency: number, power: number, troops: Map<string, any> }>} */
const tribes = [];

for (const entry of index.tribes || []) {
  const doc = JSON.parse(fs.readFileSync(path.join(dataDir, "tribes", entry.file), "utf8"));
  const id = entry.id || doc.tribe?.id;
  const spec = TRIBE_IDENTITIES[id];
  const troops = new Map();
  for (const t of doc.troops || []) {
    const base = baseById[t.ref] || {};
    troops.set(t.ref, {
      stats: { ...base.stats, ...t.overrides?.stats },
      cost: { ...base.cost, ...t.overrides?.cost },
      cropUpkeep: t.overrides?.cropUpkeep ?? base.cropUpkeep ?? 1,
      name: t.overrides?.name?.en || base.name?.en || t.ref,
    });
  }

  let ci = 0;
  let crop = 0;
  let res = 0;
  let anchorCi = 0;
  for (const ref of SCORED_REFS) {
    const u = troops.get(ref);
    if (!u) continue;
    ci += combatIndex(u.stats);
    crop += u.cropUpkeep;
    res += totalCost(u.cost);
    anchorCi += SLOT_ANCHORS[ref].ci;
  }

  // What the anchor would charge for exactly this much power.
  let anchorCrop = 0;
  let anchorRes = 0;
  for (const ref of SCORED_REFS) {
    const u = troops.get(ref);
    if (!u) continue;
    const unitCi = combatIndex(u.stats);
    anchorCrop += unitCi / SLOT_ANCHORS[ref].ciPerCrop;
    anchorRes += (unitCi / SLOT_ANCHORS[ref].ciPerRes) * 1000;
  }

  tribes.push({
    id,
    // Travian's own tribes are transcribed, not designed here. They are the
    // reference our anchors were measured from, so holding them to our model's
    // invariants would be marking the ruler against the thing it measures.
    canon: isCanonTribe(id),
    tier: spec?.tier || (spec ? "player" : "unspecified"),
    // >1 means the tribe gets more power per unit of that currency than the anchor.
    cropEfficiency: crop ? anchorCrop / crop : 0,
    resEfficiency: res ? anchorRes / res : 0,
    power: anchorCi ? ci / anchorCi : 0,
    troops,
  });
}

for (const [id, spec] of Object.entries(TRIBE_IDENTITIES)) {
  const pressure = spec.cropPressure ?? 1;
  if (pressure < CROP_PRESSURE_RANGE[0] || pressure > CROP_PRESSURE_RANGE[1]) {
    errors.push(
      `${id} — cropPressure ${pressure} is outside ${CROP_PRESSURE_RANGE.join("–")}; shifting this much power onto one currency breaks the pricing model`
    );
  }
}

for (const t of tribes) {
  if (t.canon) continue;
  if (t.tier === "unspecified") {
    // The median tribe is derived from the cores by compute-median-tribe.js, so
    // it has no identity of its own to price — it *is* the reference point.
    if (t.id !== "median") {
      warnings.push(`${t.id} — no identity spec, so its table is not covered by the fairness gate`);
    }
    continue;
  }
  if (t.tier !== "player") continue;

  const combined = Math.sqrt(t.cropEfficiency * t.resEfficiency);
  if (Math.abs(combined - 1) > FAIRNESS_TOLERANCE) {
    const verdict = combined > 1 ? "more" : "less";
    errors.push(
      `${t.id} — gets ${combined.toFixed(2)}× the anchor's power per unit of price, i.e. ${verdict} army than everyone else for the same outlay (crop ${t.cropEfficiency.toFixed(2)}, resources ${t.resEfficiency.toFixed(2)}); allowed band is ${(1 - FAIRNESS_TOLERANCE).toFixed(2)}–${(1 + FAIRNESS_TOLERANCE).toFixed(2)}`
    );
  }
  if (t.cropEfficiency > 1.22 || t.cropEfficiency < 0.82) {
    warnings.push(
      `${t.id} — crop efficiency ${t.cropEfficiency.toFixed(2)}× the anchor is a large identity swing; it should be paid for in resources`
    );
  }
}

const players = tribes.filter((t) => t.tier === "player");
const tierPower = (tier) => POWER_TIERS[tier] ?? 1;
const strongestPlayer = Math.max(...players.map((t) => t.power));
for (const t of tribes) {
  if (t.tier === "player" || t.tier === "unspecified") continue;
  const expected = tierPower(t.tier);
  if (expected > 1 && t.power <= strongestPlayer) {
    errors.push(
      `${t.id} — ${t.tier} tier should out-fight every player roster, but its power index (${t.power.toFixed(2)}) is at or below the strongest player (${strongestPlayer.toFixed(2)})`
    );
  }
  if (expected < 1 && t.power >= strongestPlayer) {
    errors.push(`${t.id} — wildlife should sit below player rosters, got ${t.power.toFixed(2)}`);
  }
}

const boss = tribes.find((t) => t.tier === "boss");
const guard = tribes.find((t) => t.tier === "guard");
if (boss && guard && boss.power <= guard.power) {
  errors.push(
    `${boss.id} — boss tier must out-fight the ${guard.id} garrison (${boss.power.toFixed(2)} vs ${guard.power.toFixed(2)})`
  );
}

// The tier-3 horse is what a tribe is built around, so it has to read that way
// in the roster: strongest, dearest, and best at whichever job its role gives
// it. Siege and expansion are excluded — a catapult outcosts a Caesaris in
// Travian too, and neither is an army unit you mass.
const ARMY_REFS = SCORED_REFS.filter((ref) => ref !== "ram" && ref !== "catapult");
for (const t of tribes) {
  if (t.canon) continue;
  // The median tribe is the per-slot median of the cores, not a design. Travian
  // does not make every tribe's third horse its best one — Rome's third horse
  // is our anvil and the Teutons' is our raider — so the median honestly comes
  // out without a centerpiece, and demanding one would only mean fudging it.
  if (t.tier === "unspecified") continue;
  const horse = t.troops.get("cav_t3");
  if (!horse) continue;
  const rivals = ARMY_REFS.filter((ref) => ref !== "cav_t3" && t.troops.has(ref));
  const defense = (u) => 0.5 * ((u.stats.defenseInfantry || 0) + (u.stats.defenseCavalry || 0));
  const offensive = (horse.stats.attack || 0) >= defense(horse);
  const axis = offensive ? (u) => u.stats.attack || 0 : defense;

  const best = Math.max(...rivals.map((ref) => combatIndex(t.troops.get(ref).stats)));
  t.lead = combatIndex(horse.stats) / best;

  const stronger = rivals.find((ref) => combatIndex(t.troops.get(ref).stats) >= combatIndex(horse.stats));
  if (stronger) {
    errors.push(
      `${t.id} — ${horse.name} is the heavy cavalry but ${t.troops.get(stronger).name} (${stronger}) out-fights it; the last stable unlock has to be the tribe's centerpiece`
    );
  }
  const better = rivals.find((ref) => axis(t.troops.get(ref)) > axis(horse));
  if (better) {
    errors.push(
      `${t.id} — ${horse.name} leans ${offensive ? "offensive" : "defensive"} but ${t.troops.get(better).name} (${better}) beats it on ${offensive ? "attack" : "defense"}; a centerpiece should top the column it is built for`
    );
  }
  // Wildlife is not trained, so its price is not a promise to anyone. Price is
  // resources plus upkeep: the centerpiece often rounds up into a higher crop
  // bracket and takes a resource discount for it, so the market columns alone
  // would call it the cheaper unit.
  if (t.tier !== "wild") {
    const paid = (u) => pricePaid(u.cost, u.cropUpkeep);
    const dearer = rivals.find((ref) => paid(t.troops.get(ref)) > paid(horse));
    if (dearer) {
      const rival = t.troops.get(dearer);
      errors.push(
        `${t.id} — ${horse.name} costs ${paid(horse)} (${totalCost(horse.cost)} plus ${horse.cropUpkeep} crop) but ${rival.name} (${dearer}) costs ${paid(rival)} (${totalCost(rival.cost)} plus ${rival.cropUpkeep} crop); the centerpiece should be the most expensive unit in the barracks`
      );
    }
  }
}

// No slot should be filler. A unit earns its place by being the best pick for
// something, so these are the columns a player actually shops on: a raw stat
// when they want the biggest single unit, and the same stat per crop or per
// resource when population or money is the constraint.
const SHOP_COLUMNS = {
  attack: (u) => u.stats.attack || 0,
  "defence vs infantry": (u) => u.stats.defenseInfantry || 0,
  "defence vs cavalry": (u) => u.stats.defenseCavalry || 0,
  "total defence": (u) => (u.stats.defenseInfantry || 0) + (u.stats.defenseCavalry || 0),
  power: (u) => combatIndex(u.stats),
  speed: (u) => u.stats.speed || 0,
  carry: (u) => u.stats.carry || 0,
};
for (const [name, read] of Object.entries({ ...SHOP_COLUMNS })) {
  SHOP_COLUMNS[`${name} per crop`] = (u) => read(u) / (u.cropUpkeep || 1);
  SHOP_COLUMNS[`${name} per resource`] = (u) => read(u) / Math.max(1, totalCost(u.cost));
}

// Scouts sit out: nobody weighs a scout against a battle horse, and letting
// the fastest unit in the game hold the speed crown would make every light
// cavalry look like filler when its job is raiding, not racing.
const BATTLE_REFS = ARMY_REFS.filter((ref) => ref !== "scout");

for (const t of tribes) {
  // Travian ships what it ships; flagging its filler is noise we cannot act on.
  if (t.canon) continue;
  const army = BATTLE_REFS.filter((ref) => t.troops.has(ref));
  for (const ref of army) {
    const unit = t.troops.get(ref);
    const rivals = army.filter((o) => o !== ref).map((o) => t.troops.get(o));

    // Outright dominated: another unit is at least as good everywhere and
    // costs no more in either currency. Nobody could defend training this.
    const dominator = rivals.find(
      (r) =>
        ["attack", "defenseInfantry", "defenseCavalry", "speed", "carry"].every(
          (k) => (r.stats[k] || 0) >= (unit.stats[k] || 0)
        ) &&
        totalCost(r.cost) <= totalCost(unit.cost) &&
        (r.cropUpkeep ?? 0) <= (unit.cropUpkeep ?? 0)
    );
    if (dominator) {
      errors.push(
        `${t.id} — ${unit.name} (${ref}) is matched or beaten on every stat by ${dominator.name} for no more crop and no more resources, so nobody would ever train it`
      );
      continue;
    }

    // Best at nothing: not dominated, but tops no column either, so for any
    // goal a player has some other unit in the same roster serves it better.
    const tops = Object.entries(SHOP_COLUMNS)
      .filter(([, read]) => rivals.every((r) => read(unit) >= read(r)))
      .map(([name]) => name);
    if (!tops.length) {
      warnings.push(
        `${t.id} — ${unit.name} (${ref}) tops no column: it is not the best pick for any stat, nor per crop, nor per resource, so the slot is filler`
      );
    }
  }
}

const signatures = new Map();
for (const t of tribes) {
  const sig = JSON.stringify([...t.troops.entries()].map(([ref, u]) => [ref, u.stats]));
  if (signatures.has(sig)) {
    errors.push(`${t.id} — ships the same stat block as ${signatures.get(sig)}; give it its own identity`);
  }
  signatures.set(sig, t.id);
}

for (const t of tribes) {
  // Oasis animals never march and NPC birds are allowed to be uncatchable.
  const speedRange = t.tier === "wild" ? [1, 26] : t.tier === "player" ? [3, 22] : [3, 26];
  for (const [ref, u] of t.troops) {
    const s = u.stats;
    if (s.speed < speedRange[0] || s.speed > speedRange[1]) {
      errors.push(`${t.id}/${ref} — speed ${s.speed} is outside ${speedRange[0]}–${speedRange[1]}`);
    }
    if (s.carry < 0 || (s.carry > 260 && ref !== "settler")) {
      errors.push(`${t.id}/${ref} — carry ${s.carry} is outside 0–260`);
    }
    if ((u.cropUpkeep ?? 0) < 0) errors.push(`${t.id}/${ref} — negative crop upkeep`);
  }
  for (const family of [["inf_t1", "inf_t2", "inf_t3"], ["cav_t1", "cav_t2", "cav_t3"]]) {
    const tiers = family.map((ref) => t.troops.get(ref)).filter(Boolean);
    if (tiers.length < 3) continue;
    const [t1, t2, t3] = tiers.map((u) => combatIndex(u.stats));
    // Players read the slot number as a rank, so the tier-3 unit should be the
    // one worth unlocking. Tier 2 may sit below tier 1 when it trades power for
    // a defensive job, but the top of the tree should not.
    if (t3 < Math.max(t1, t2)) {
      warnings.push(
        `${t.id} — ${family[2]} (${tiers[2].name}) is weaker than an earlier tier; the last unlock in a family should be its best`
      );
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ ok: errors.length === 0, errors, warnings, tribes: tribes.map(({ troops, ...rest }) => rest) }, null, 2));
} else {
  console.log(
    "Tribe power pricing — efficiency is power per unit of price, 1.00 = the anchor rate.\n" +
      "cav-lead is how far the heavy cavalry out-fights the next best army unit.\n"
  );
  console.log(
    "tribe".padEnd(14),
    "tier".padEnd(11),
    "power".padStart(5),
    "crop-eff".padStart(9),
    "res-eff".padStart(8),
    "combined".padStart(9),
    "cav-lead".padStart(9)
  );
  for (const t of [...tribes].sort((a, b) => b.power - a.power)) {
    // Wildlife eats no crop, so its crop rate is not a number worth printing.
    const rate = (n) => (n ? n.toFixed(2) : "—");
    console.log(
      t.id.padEnd(14),
      t.tier.padEnd(11),
      t.power.toFixed(2).padStart(5),
      rate(t.cropEfficiency).padStart(9),
      rate(t.resEfficiency).padStart(8),
      rate(Math.sqrt(t.cropEfficiency * t.resEfficiency)).padStart(9),
      (t.lead ? `${t.lead.toFixed(2)}x` : "—").padStart(9)
    );
  }
  console.log("");
  if (warnings.length) {
    console.warn(`[Tevel] Balance warnings (${warnings.length}):`);
    for (const w of warnings) console.warn(`  - ${w}`);
  }
}

if (errors.length) {
  console.error(`[Tevel] Balance validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

if (!asJson) {
  console.log(`[Tevel] Balance OK — ${players.length} player tribes within ±${FAIRNESS_TOLERANCE * 100}% of the anchor price, tiers ordered`);
}
