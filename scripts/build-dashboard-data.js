import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { attachAssetUrls, resolveTribe } from "../lib/merge.js";

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

const tribes = index.tribes.map((entry) => {
  const raw = readJson(`tribes/${entry.file}`);
  const resolved = attachAssetUrls(
    resolveTribe(raw, base.units, roster, tribeTraining)
  );
  return {
    ...resolved,
    type: entry.type,
    palette: raw.palette || palettes.palettes[entry.id],
  };
});

const payload = {
  version: 1,
  game: "Tevel",
  assetBase: "/assets",
  generatedAt: new Date().toISOString(),
  roster: roster.slots,
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
