#!/usr/bin/env node
/**
 * Guard every troop logo referenced by the data layer:
 *   - the SVG file exists under assets/
 *   - it has a full-canvas background tile and at least one glyph shape
 *   - it declares a viewBox (so the dashboard can scale it to any cell size)
 *   - a cavalry slot draws a rider, not an animal (Nature excepted)
 *
 * Runs as part of the dashboard/Netlify build so a missing or oddly shaped
 * icon fails loudly instead of rendering as a blank tile.
 *
 * Usage: npm run validate:logos
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WILDLIFE_MOUNTS } from "../lib/tribe-generator/mount-logos.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");
const assetsDir = path.join(root, "assets");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, rel), "utf8"));
}

/** @returns {Map<string, string[]>} logo path → referencing sources */
function collectLogoRefs() {
  const refs = new Map();
  const add = (logo, source) => {
    if (!logo || typeof logo !== "string" || !logo.endsWith(".svg")) return;
    if (!refs.has(logo)) refs.set(logo, []);
    refs.get(logo).push(source);
  };

  const groups = readJson("logo-groups.json");
  for (const [group, def] of Object.entries(groups.groups || {})) {
    for (const icon of def.icons || []) add(icon, `logo-groups:${group}`);
  }
  for (const [ref, icon] of Object.entries(groups.defaults || {})) {
    add(icon, `logo-groups.defaults:${ref}`);
  }

  const tribeLogos = readJson("tribe-logos.json");
  for (const [tribeId, byRef] of Object.entries(tribeLogos.tribes || {})) {
    for (const [ref, icon] of Object.entries(byRef || {})) {
      add(icon, `tribe-logos:${tribeId}.${ref}`);
    }
  }

  const base = readJson("units.base.json");
  for (const [ref, unit] of Object.entries(base.units || {})) {
    add(unit.graphics?.logo, `units.base:${ref}`);
  }

  const index = readJson("tribes/index.json");
  for (const entry of index.tribes || []) {
    const doc = readJson(`tribes/${entry.file}`);
    for (const troop of doc.troops || []) {
      add(troop.overrides?.graphics?.logo, `tribes/${entry.file}:${troop.ref}`);
    }
  }

  return refs;
}

const CANVAS_TILE = /^m00h512v512h0z/;

/**
 * @param {string} svgText
 * @returns {string[]} problems
 */
function inspectSvg(svgText) {
  const problems = [];
  const svgTag = svgText.match(/<svg[^>]*>/i)?.[0];
  if (!svgTag) return ["missing <svg> root"];
  if (!/viewBox\s*=/.test(svgTag)) problems.push("missing viewBox");

  const shapes = [...svgText.matchAll(/<(path|rect|circle|ellipse|polygon|polyline)\b([^>]*)>/gi)];
  if (!shapes.length) problems.push("no drawable shapes");

  let tiles = 0;
  let glyphs = 0;
  for (const [, tag, attrs] of shapes) {
    if (tag.toLowerCase() === "rect") {
      const w = parseFloat(attrs.match(/\bwidth="([^"]+)"/)?.[1] || "0");
      const h = parseFloat(attrs.match(/\bheight="([^"]+)"/)?.[1] || "0");
      if (w >= 512 && h >= 512) {
        tiles += 1;
        continue;
      }
    }
    const d = (attrs.match(/\bd="([^"]*)"/)?.[1] || "").replace(/[\s,]+/g, "").toLowerCase();
    if (CANVAS_TILE.test(d)) tiles += 1;
    else glyphs += 1;
  }

  if (!tiles) problems.push("no full-canvas background tile");
  if (!glyphs) problems.push("no glyph shape (icon would render as a solid block)");
  return problems;
}

/**
 * A mounted unit should look mounted. Spreading icons across the roster had
 * put a ram on the Gallic Haeduan and a pegasus on the Hun Marauder, so those
 * tribes read as fielding two horsemen and an animal.
 * @returns {string[]} problems
 */
function checkMountedIcons() {
  const cavalry = new Set(readJson("logo-groups.json").groups?.cavalry?.icons || []);
  const problems = [];
  const tribeLogos = readJson("tribe-logos.json");

  for (const [tribeId, byRef] of Object.entries(tribeLogos.tribes || {})) {
    if (WILDLIFE_MOUNTS.includes(tribeId)) continue;
    for (const [ref, icon] of Object.entries(byRef || {})) {
      if (!ref.startsWith("cav_") || cavalry.has(icon)) continue;
      problems.push(
        `${tribeId}.${ref} rides ${icon} — a cavalry unit needs an icon from the cavalry pool`
      );
    }
  }
  return problems;
}

const refs = collectLogoRefs();
const errors = checkMountedIcons();

for (const [logo, sources] of [...refs].sort()) {
  const file = path.join(assetsDir, logo);
  if (!fs.existsSync(file)) {
    errors.push(`${logo} — file not found (referenced by ${sources.join(", ")})`);
    continue;
  }
  const problems = inspectSvg(fs.readFileSync(file, "utf8"));
  if (problems.length) {
    errors.push(`${logo} — ${problems.join("; ")} (referenced by ${sources.join(", ")})`);
  }
}

if (errors.length) {
  console.error(`[Tevel] Troop logo validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`[Tevel] Validated ${refs.size} troop logo assets — all render-ready`);
