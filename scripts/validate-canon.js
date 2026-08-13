#!/usr/bin/env node
/**
 * Fails the build if a Travian tribe has drifted off Travian's own numbers.
 *
 * The Romans, Teutons, Gauls, Egyptians, Huns and Spartans are the game's
 * tribes, and the Natars and Nature are its NPCs. Players know these stats,
 * every combat calculator assumes them, and a Marksman that is not 110/80/70
 * is simply wrong however neatly it fits our own model. This is the gate that
 * catches a generator, a rebalance, or a well-meaning tweak putting them back
 * out of true.
 *
 * The eleventh slot in each of those tribes is ours — Travian gives ten units
 * and our roster has eleven — so it is checked differently: it has to fit the
 * roster it joins rather than match a published number.
 *
 * Usage: node scripts/validate-canon.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { combatIndex, totalCost } from "../lib/balance/anchors.js";
import { TRAVIAN_CANON, canonLock, isCanonTribe } from "../lib/balance/canon.js";
import { CORE_TRIBE_IDS } from "../lib/tribe-generator/write.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(dataDir, rel), "utf8"));

const index = readJson("tribes/index.json");
const base = readJson("units.base.json").units || {};
const errors = [];
const warnings = [];

// The dashboard and API refuse to edit or delete a "core" tribe. That list is
// maintained by hand next to the write path, so check here that it still covers
// everything the canon protects — otherwise a tribe could be frozen in the build
// and freely editable in the UI, which is worse than either alone.
for (const id of Object.keys(TRAVIAN_CANON.tribes)) {
  if (!CORE_TRIBE_IDS.includes(id)) {
    errors.push(
      `${id} is frozen by the canon but missing from CORE_TRIBE_IDS in lib/tribe-generator/write.js, so the dashboard would still let someone edit it`
    );
  }
}

const STAT_KEYS = ["attack", "defenseInfantry", "defenseCavalry", "speed", "carry"];
const COST_KEYS = ["wood", "clay", "iron", "crop"];

// The seal. Default tribes are meant to stay put unless somebody deliberately
// changes them, so changing one has to be a visible act rather than a nudge:
// re-seal with `npm run canon:seal` and the new checksum lands in the diff.
const sealed = canonLock(TRAVIAN_CANON);
if (TRAVIAN_CANON.lock !== sealed) {
  errors.push(
    `the canon's seal is broken — it reads ${TRAVIAN_CANON.lock ?? "(none)"} but its contents hash to ${sealed}. A default tribe has been edited. If that was intended, re-seal with \`npm run canon:seal\`; if not, revert data/balance/travian-canon.json.`
  );
}

let checkedTribes = 0;
let checkedUnits = 0;

for (const entry of index.tribes || []) {
  const id = entry.id;
  if (!isCanonTribe(id)) continue;
  checkedTribes += 1;

  const doc = readJson(`tribes/${entry.file}`);
  const canon = TRAVIAN_CANON.tribes[id];
  const troopByRef = new Map((doc.troops || []).map((t) => [t.ref, t]));

  for (const [ref, unit] of Object.entries(canon.units)) {
    const troop = troopByRef.get(ref);
    if (!troop) {
      errors.push(`${id} — ${unit.name} (${ref}) is missing from the roster`);
      continue;
    }
    checkedUnits += 1;
    const stats = { ...base[ref]?.stats, ...troop.overrides?.stats };
    const name = troop.overrides?.name?.en ?? base[ref]?.name?.en;

    // Every number has to be present. A gap would silently fall back to the
    // balance model at rebuild time, which is exactly the drift this prevents.
    const missing = [
      ...STAT_KEYS.filter((k) => unit.stats?.[k] == null),
      ...(unit.cost ? COST_KEYS.filter((k) => unit.cost[k] == null) : ["cost"]),
      ...(unit.cropUpkeep == null ? ["cropUpkeep"] : []),
      ...(unit.timeSeconds == null ? ["timeSeconds"] : []),
    ];
    if (missing.length) {
      errors.push(
        `${id} — ${unit.name} is missing ${missing.join(", ")} in the canon; run \`npm run canon:freeze\``
      );
    }

    if (name !== unit.name) {
      errors.push(`${id} — ${ref} is called "${name}" but Travian calls it "${unit.name}"`);
    }
    for (const key of STAT_KEYS) {
      if (unit.stats[key] == null) continue;
      if (stats[key] !== unit.stats[key]) {
        errors.push(
          `${id} — ${unit.name} ${key} is ${stats[key]}, Travian says ${unit.stats[key]}`
        );
      }
    }
    if (unit.cropUpkeep != null) {
      const crop = troop.overrides?.cropUpkeep ?? base[ref]?.cropUpkeep;
      if (crop !== unit.cropUpkeep) {
        errors.push(
          `${id} — ${unit.name} crop upkeep is ${crop}, Travian says ${unit.cropUpkeep}`
        );
      }
    }
    if (unit.cost) {
      const cost = { ...base[ref]?.cost, ...troop.overrides?.cost };
      for (const key of COST_KEYS) {
        if (cost[key] !== unit.cost[key]) {
          errors.push(
            `${id} — ${unit.name} ${key} cost is ${cost[key]}, Travian says ${unit.cost[key]}`
          );
        }
      }
    }
  }

  // The slot Travian does not fill. It exists to round our roster out, not to
  // rewrite the tribe, so it may not outclass the published units it joins.
  const ref = canon.extendedSlot;
  const troop = troopByRef.get(ref);
  if (!troop) {
    errors.push(`${id} — extended slot ${ref} is missing from the roster`);
    continue;
  }
  const stats = { ...base[ref]?.stats, ...troop.overrides?.stats };
  const name = troop.overrides?.name?.en ?? ref;
  const power = combatIndex(stats);
  const strongest = Object.entries(canon.units)
    .filter(([r]) => r !== "chief" && r !== "settler")
    .map(([, u]) => combatIndex(u.stats))
    .reduce((a, b) => Math.max(a, b), 0);

  if (power > strongest) {
    errors.push(
      `${id} — ${name} (${ref}) is our invention and outweighs every unit Travian gives the tribe (${Math.round(power)} against ${Math.round(strongest)}); it should round the roster out, not lead it`
    );
  }
  const cost = totalCost({ ...base[ref]?.cost, ...troop.overrides?.cost });
  const priced = Object.entries(canon.units).filter(([r, u]) => r !== "chief" && r !== "settler" && u.cost);
  const dearest = priced.map(([, u]) => totalCost(u.cost)).reduce((a, b) => Math.max(a, b), 0);
  // Only meaningful for something you buy by the hundred. A chief or a settler
  // outcosts the whole barracks in Travian too, and neither is an army unit.
  const armySlot = ref !== "chief" && ref !== "settler";
  if (armySlot && priced.length && cost > dearest) {
    warnings.push(
      `${id} — ${name} (${ref}) costs ${cost}, more than any unit Travian gives the tribe (${dearest})`
    );
  }
}

if (warnings.length) {
  console.warn(`[Tevel] Canon warnings (${warnings.length}):`);
  for (const w of warnings) console.warn(`  - ${w}`);
}

if (errors.length) {
  console.error(`[Tevel] Travian canon check failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `[Tevel] Travian canon OK — ${checkedUnits} published units across ${checkedTribes} tribes match ${TRAVIAN_CANON.source}`
);
