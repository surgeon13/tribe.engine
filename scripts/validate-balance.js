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
 *   3. no two tribes ship the same stat block (copy-paste rosters)
 *   4. tier ordering holds: boss > NPC guard > players > wildlife
 *   5. stats stay inside sane ranges and tiers do not go backwards
 *
 * Usage: npm run validate:balance [-- --json]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SCORED_REFS, SLOT_ANCHORS, combatIndex, totalCost } from "../lib/balance/anchors.js";
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
  console.log("Tribe power pricing — efficiency is power per unit of price, 1.00 = the anchor rate\n");
  console.log(
    "tribe".padEnd(14),
    "tier".padEnd(11),
    "power".padStart(5),
    "crop-eff".padStart(9),
    "res-eff".padStart(8),
    "combined".padStart(9)
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
      rate(Math.sqrt(t.cropEfficiency * t.resEfficiency)).padStart(9)
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
