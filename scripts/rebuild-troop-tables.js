#!/usr/bin/env node
/**
 * Regenerates every tribe's troop table from its identity spec.
 *
 * Names, descriptions, logos, and hero blocks are the flavor layer and are left
 * exactly as they are; this only rewrites the numbers — stats, cost, crop
 * upkeep, and training time — so they all come from one model instead of
 * eighteen separate hand-tunings that drifted apart.
 *
 * Usage:
 *   node scripts/rebuild-troop-tables.js            # write the tables
 *   node scripts/rebuild-troop-tables.js --dry-run  # report without writing
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SCORED_REFS, combatIndex, totalCost } from "../lib/balance/anchors.js";
import { TRAVIAN_CANON, isCanonTribe } from "../lib/balance/canon.js";
import { buildAllTables, priceUnit } from "../lib/balance/generate-troops.js";
import { TRIBE_IDENTITIES } from "../lib/balance/identities.js";
import { formatJson } from "../lib/json-format.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dryRun = process.argv.includes("--dry-run");

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(dataDir, rel), "utf8"));
const writeJson = (rel, value) => {
  if (dryRun) return;
  fs.writeFileSync(path.join(dataDir, rel), formatJson(value));
};

const index = readJson("tribes/index.json");
const training = readJson("tribe-training.json");
const { calibration, tables } = buildAllTables();

/**
 * A Travian tribe's table, transcribed rather than generated: its ten published
 * units, plus the one slot Travian leaves us to fill, which is hand-authored to
 * sit alongside them instead of towering over them.
 * @param {string} id
 */
function canonTable(id, generated) {
  const tribe = TRAVIAN_CANON.tribes[id];
  const spec = TRIBE_IDENTITIES[id];
  const out = {};
  for (const [ref, unit] of Object.entries({ ...tribe.units, ...tribe.extension })) {
    // Anything the canon leaves out stays with our model. Travian publishes no
    // meaningful speed or carry for oasis animals, which never move, and no
    // price for anything that cannot be trained.
    const stats = { ...generated?.[ref]?.stats, ...unit.stats };
    const priced =
      unit.cost && unit.cropUpkeep != null && unit.timeSeconds != null
        ? null
        : priceUnit(ref, stats, spec);
    out[ref] = {
      stats,
      cost: unit.cost ?? priced.cost,
      cropUpkeep: unit.cropUpkeep ?? priced.cropUpkeep,
      timeSeconds: unit.timeSeconds ?? priced.timeSeconds,
    };
  }
  return out;
}

const before = [];
const after = [];
let written = 0;

for (const entry of index.tribes || []) {
  const rel = `tribes/${entry.file}`;
  const doc = readJson(rel);
  const id = entry.id || doc.tribe?.id;
  const table = isCanonTribe(id) ? canonTable(id, tables[id]) : tables[id];
  if (!table) {
    console.warn(`  skipped ${id} — no identity spec`);
    continue;
  }

  const snapshot = (troops, pick) => {
    let ci = 0;
    let res = 0;
    let crop = 0;
    for (const ref of SCORED_REFS) {
      const u = pick(troops, ref);
      if (!u) continue;
      ci += combatIndex(u.stats);
      res += totalCost(u.cost);
      crop += u.cropUpkeep ?? 0;
    }
    return { id, ci: Math.round(ci), res, crop };
  };

  before.push(
    snapshot(doc.troops, (troops, ref) => {
      const t = troops.find((x) => x.ref === ref);
      return t?.overrides?.stats ? { ...t.overrides } : null;
    })
  );

  for (const troop of doc.troops || []) {
    const next = table[troop.ref];
    if (!next) continue;
    troop.overrides = troop.overrides || {};
    troop.overrides.stats = next.stats;
    // Wildlife is never trained, so it has no price and no upkeep to write.
    if (next.cost) troop.overrides.cost = next.cost;
    else delete troop.overrides.cost;
    if (next.cropUpkeep != null) troop.overrides.cropUpkeep = next.cropUpkeep;
    else delete troop.overrides.cropUpkeep;
  }

  after.push(snapshot(doc.troops, (troops, ref) => troops.find((x) => x.ref === ref)?.overrides));

  doc.meta = {
    ...doc.meta,
    balance: isCanonTribe(id)
      ? {
          model: "travian-canon",
          source: TRAVIAN_CANON.source,
          extendedSlot: TRAVIAN_CANON.tribes[id].extendedSlot,
          tier: TRIBE_IDENTITIES[id]?.tier || "player",
        }
      : {
          model: "identity-budget",
          identity: TRIBE_IDENTITIES[id].notes,
          tier: TRIBE_IDENTITIES[id].tier || "player",
        },
  };

  writeJson(rel, doc);
  written += 1;

  const slot = training.tribes?.[id];
  if (slot) {
    for (const [ref, next] of Object.entries(table)) {
      if (!slot[ref]) continue;
      slot[ref].timeSeconds = next.timeSeconds;
    }
  }
}

writeJson("tribe-training.json", training);

const byId = Object.fromEntries(before.map((b) => [b.id, b]));
console.log(
  `Rebuilt ${written} troop tables (army calibration ${calibration.inf_t1.toFixed(3)}, siege ${calibration.ram.toFixed(3)})\n`
);
console.log("tribe            combat index      resources         crop upkeep");
for (const a of after) {
  const b = byId[a.id] || { ci: 0, res: 0, crop: 0 };
  const delta = (from, to) => {
    if (!from) return "";
    const pct = ((to - from) / from) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  };
  console.log(
    a.id.padEnd(15),
    `${String(b.ci).padStart(5)} → ${String(a.ci).padEnd(5)} ${delta(b.ci, a.ci).padStart(5)}`,
    `  ${String(b.res).padStart(6)} → ${String(a.res).padEnd(6)} ${delta(b.res, a.res).padStart(5)}`,
    `  ${String(b.crop).padStart(3)} → ${String(a.crop).padEnd(3)} ${delta(b.crop, a.crop).padStart(5)}`
  );
}
if (dryRun) console.log("\n(dry run — nothing written)");
