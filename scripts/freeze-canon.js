#!/usr/bin/env node
/**
 * Writes the derived half of the canon into the canon, and seals it.
 *
 * Travian publishes stats for its tribes but not always a price, and nothing at
 * all for oasis animals, which never move and cannot be bought. Those gaps used
 * to be filled at rebuild time by our own pricing model — which meant a default
 * tribe's costs quietly moved whenever the model or a dial somewhere else moved.
 * Defaults are supposed to be defaults, so the gaps are filled once, here, and
 * then frozen as data like everything else.
 *
 * The lock is a checksum over every number in the file. validate-canon.js
 * refuses to pass if the two disagree, so editing a default tribe means
 * deliberately re-sealing it and showing that in the diff, rather than nudging
 * a stat and hoping nobody notices.
 *
 * Usage:
 *   node scripts/freeze-canon.js            # fill gaps and re-seal
 *   node scripts/freeze-canon.js --seal     # re-seal only, change nothing else
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { canonLock } from "../lib/balance/canon.js";
import { formatJson } from "../lib/json-format.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const canonPath = path.join(dataDir, "balance", "travian-canon.json");
const sealOnly = process.argv.includes("--seal");

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(dataDir, rel), "utf8"));
const canon = JSON.parse(fs.readFileSync(canonPath, "utf8"));

const STAT_KEYS = ["attack", "defenseInfantry", "defenseCavalry", "speed", "carry"];
let filled = 0;

if (!sealOnly) {
  const index = readJson("tribes/index.json");
  const base = readJson("units.base.json").units || {};
  const training = readJson("tribe-training.json");
  const fileById = Object.fromEntries((index.tribes || []).map((t) => [t.id, t.file]));

  for (const [id, tribe] of Object.entries(canon.tribes)) {
    const doc = readJson(`tribes/${fileById[id]}`);
    const troopByRef = new Map((doc.troops || []).map((t) => [t.ref, t]));

    for (const [ref, unit] of Object.entries({ ...tribe.units, ...tribe.extension })) {
      const troop = troopByRef.get(ref);
      if (!troop) throw new Error(`${id}/${ref} is in the canon but not in the roster`);
      const current = { ...base[ref]?.stats, ...troop.overrides?.stats };

      // Anything Travian does not publish is taken from what the model last
      // produced, then never recomputed again.
      for (const key of STAT_KEYS) {
        if (unit.stats[key] == null) {
          unit.stats[key] = current[key];
          filled += 1;
        }
      }
      if (!unit.cost) {
        unit.cost = { ...base[ref]?.cost, ...troop.overrides?.cost };
        filled += 1;
      }
      if (unit.cropUpkeep == null) {
        unit.cropUpkeep = troop.overrides?.cropUpkeep ?? base[ref]?.cropUpkeep ?? 1;
        filled += 1;
      }
      if (unit.timeSeconds == null) {
        unit.timeSeconds = training.tribes?.[id]?.[ref]?.timeSeconds;
        if (unit.timeSeconds == null) throw new Error(`${id}/${ref} has no training time`);
        filled += 1;
      }
    }
  }
}

delete canon.lock;
canon.lock = canonLock(canon);
fs.writeFileSync(canonPath, formatJson(canon));

console.log(
  sealOnly
    ? `[Tevel] Re-sealed the canon: ${canon.lock}`
    : `[Tevel] Froze ${filled} derived value(s) and sealed the canon: ${canon.lock}`
);
