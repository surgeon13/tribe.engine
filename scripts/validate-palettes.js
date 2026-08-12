#!/usr/bin/env node
/**
 * Guard every tribe palette so its colors are actually visible:
 *   - both colors parse as hex
 *   - primary on secondary clears WCAG non-text contrast, because the troop
 *     logo paints the primary glyph straight onto a secondary-colored tile
 *   - tribes/palettes.json and the tribe doc agree (drift produces one color
 *     in the roster list and another in the logo)
 *
 * Runs as part of the dashboard/Netlify build, next to validate-logo-assets.js,
 * so a muddy pairing fails loudly instead of shipping an invisible icon.
 *
 * Usage: npm run validate:palettes
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  contrastRatio,
  MIN_GRAPHIC_CONTRAST,
  MIN_TEXT_CONTRAST,
  parseHex,
} from "../dashboard/color.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, rel), "utf8"));
}

const catalog = readJson("tribes/palettes.json").palettes || {};
const index = readJson("tribes/index.json");

/** tribeId → palette from the tribe doc (the file the merge layer resolves from) */
const docPalettes = new Map();
for (const entry of index.tribes || []) {
  const doc = readJson(`tribes/${entry.file}`);
  if (doc.palette) docPalettes.set(entry.id || doc.id, { ...doc.palette, file: entry.file });
}

const errors = [];
const warnings = [];
const report = [];

for (const [id, palette] of Object.entries(catalog)) {
  const { primary, secondary } = palette;
  if (!parseHex(primary) || !parseHex(secondary)) {
    errors.push(`${id} — palette needs two hex colors (got primary=${primary}, secondary=${secondary})`);
    continue;
  }

  const doc = docPalettes.get(id);
  if (doc && (doc.primary !== primary || doc.secondary !== secondary)) {
    errors.push(
      `${id} — tribes/palettes.json (${primary}/${secondary}) disagrees with tribes/${doc.file} (${doc.primary}/${doc.secondary})`
    );
  }

  const ratio = contrastRatio(primary, secondary);
  if (ratio < MIN_GRAPHIC_CONTRAST) {
    errors.push(
      `${id} — primary ${primary} on secondary ${secondary} is ${ratio.toFixed(2)}:1; the logo glyph disappears into its tile (need ${MIN_GRAPHIC_CONTRAST}:1)`
    );
  } else if (ratio < MIN_TEXT_CONTRAST) {
    warnings.push(`${id} — ${primary} on ${secondary} is only ${ratio.toFixed(2)}:1 (fine for glyphs, thin detail will be soft)`);
  }
  report.push([id, ratio]);
}

for (const [id, palette] of docPalettes) {
  if (!catalog[id]) {
    errors.push(`${id} — tribes/${palette.file} has a palette but tribes/palettes.json does not`);
  }
}

if (warnings.length) {
  console.warn(`[Tevel] Palette contrast warnings (${warnings.length}):`);
  for (const w of warnings) console.warn(`  - ${w}`);
}

if (errors.length) {
  console.error(`[Tevel] Palette validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const worst = report.sort((a, b) => a[1] - b[1])[0];
console.log(
  `[Tevel] Validated ${report.length} tribe palettes — all readable (lowest: ${worst[0]} at ${worst[1].toFixed(2)}:1)`
);
