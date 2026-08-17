import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { attachAssetUrls, resolveTribe } from "../lib/merge.js";
import { computeFairness } from "../lib/balance/fairness.js";
import { FAIRNESS_TOLERANCE, TRIBE_IDENTITIES } from "../lib/balance/identities.js";
import { isCanonTribe } from "../lib/balance/canon.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, rel), "utf8"));
}

const base = readJson("units.base.json");
const roster = readJson("roster.json");
const index = readJson("tribes/index.json");
const heroSystem = readJson("hero.system.json");
const palettes = readJson("tribes/palettes.json");
const tribeTraining = readJson("tribe-training.json");
const logoGroups = readJson("logo-groups.json");
const tribeLogos = readJson("tribe-logos.json");
const logoData = {
  defaults: logoGroups.defaults,
  tribes: tribeLogos.tribes,
};

const tribes = index.tribes.map((entry) => {
  const raw = readJson(`tribes/${entry.file}`);
  const resolved = attachAssetUrls(
    resolveTribe(raw, base.units, roster, tribeTraining, logoData)
  );
  const troopsByRef = {};
  for (const t of resolved.troops) {
    troopsByRef[t.ref] = {
      stats: t.stats,
      cropUpkeep: t.cropUpkeep,
      cost: t.cost,
      trainSeconds: t.training?.timeSeconds,
    };
  }
  const spec = TRIBE_IDENTITIES[entry.id];
  const tier = spec?.tier || (spec ? "player" : "unspecified");
  return {
    ...resolved,
    type: entry.type,
    palette: raw.palette || palettes.palettes[entry.id],
    // Price-fairness diagnostics (same math as `npm run validate:balance`):
    // how this tribe's army compares to the six-core anchor rate in raw
    // power and in each of the three currencies a unit is actually paid
    // for in. 1.00 = exactly the anchor rate. `checked` mirrors the
    // validator's own exemptions — Travian's own tribes are transcribed,
    // not designed, and NPC/boss tiers are deliberately not fair, so
    // neither is held to the band.
    balance: {
      ...computeFairness(troopsByRef),
      tolerance: FAIRNESS_TOLERANCE,
      checked: !isCanonTribe(entry.id) && tier === "player",
    },
  };
});

const payload = {
  version: 1,
  game: "Tevel",
  // Relative so the PWA / GitHub Pages site root resolves correctly.
  assetBase: "assets",
  generatedAt: new Date().toISOString(),
  // Each slot carries the generic name of the thing it holds ("Infantry I",
  // "Cavalry III") alongside its ref. Comparison charts label their rows with
  // it, because a row that spans six tribes cannot be called "Legionnaire".
  roster: roster.slots.map((slot) => ({
    ...slot,
    label: base.units[slot.baseUnitId]?.name?.en || slot.baseUnitId,
  })),
  logoGroups: logoGroups.groups,
  heroSystem: {
    maxLevel: heroSystem.leveling.maxLevel,
    attributePointsPerLevel: heroSystem.leveling.attributePointsPerLevel,
    attributes: heroSystem.attributes,
    tribeModifiers: heroSystem.tribeModifiers,
  },
  tribes,
};

const outDir = path.join(root, "dashboard");
fs.mkdirSync(outDir, { recursive: true });
const json = JSON.stringify(payload, null, 2);
fs.writeFileSync(path.join(outDir, "data.json"), json);
fs.writeFileSync(
  path.join(outDir, "generated-data.js"),
  `/** Auto-generated — do not edit. Run npm run build:data */\nexport default ${JSON.stringify(payload)};\n`
);
console.log(`Wrote dashboard/data.json (${tribes.length} tribes)`);
