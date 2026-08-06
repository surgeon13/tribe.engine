#!/usr/bin/env node
/**
 * Audit playable tribes against Travian-style troop role doctrine.
 *
 * Usage:
 *   node scripts/audit-troop-roles.js
 *   node scripts/audit-troop-roles.js --strict
 *   node scripts/audit-troop-roles.js --json
 *   node scripts/audit-troop-roles.js --demo-archetypes
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveTribe } from "../lib/merge.js";
import {
  auditAllTribes,
  slotRolesForArchetype,
  shapeTroopForRole,
} from "../lib/balance/troop-roles.js";
import { BALANCE_ARCHETYPES, ARCHETYPE_IDS } from "../lib/tribe-generator/custom.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const asJson = args.has("--json");
const demo = args.has("--demo-archetypes");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, rel), "utf8"));
}

function loadPlayableTribes() {
  const index = readJson("tribes/index.json");
  const base = readJson("units.base.json");
  const roster = readJson("roster.json");
  const tribeTraining = readJson("tribe-training.json");
  const logoGroups = readJson("logo-groups.json");
  const tribeLogos = readJson("tribe-logos.json");
  const logoData = {
    defaults: logoGroups.defaults,
    tribes: tribeLogos.tribes,
  };

  return index.tribes.map((entry) => {
    const raw = readJson(`tribes/${entry.file}`);
    const resolved = resolveTribe(raw, base.units, roster, tribeTraining, logoData);
    return {
      id: resolved.id,
      name: resolved.name,
      theme: resolved.theme || "",
      archetype: raw.meta?.archetype,
      troops: resolved.troops.map((t) => ({
        ref: t.ref,
        name: t.name,
        stats: t.stats,
        cost: t.cost,
      })),
    };
  });
}

/** Neutral costs used only for demo shaping display. */
const DEMO_BASE = {
  inf_t1: { stats: {}, cost: { wood: 110, clay: 95, iron: 120, crop: 35 }, cropUpkeep: 1 },
  inf_t2: { stats: {}, cost: { wood: 125, clay: 110, iron: 140, crop: 55 }, cropUpkeep: 1 },
  inf_t3: { stats: {}, cost: { wood: 160, clay: 150, iron: 210, crop: 85 }, cropUpkeep: 1 },
  scout: { stats: {}, cost: { wood: 135, clay: 150, iron: 25, crop: 40 }, cropUpkeep: 2 },
  cav_t1: { stats: {}, cost: { wood: 500, clay: 410, iron: 310, crop: 100 }, cropUpkeep: 3 },
  cav_t2: { stats: {}, cost: { wood: 550, clay: 620, iron: 760, crop: 175 }, cropUpkeep: 4 },
  cav_t3: { stats: {}, cost: { wood: 530, clay: 550, iron: 650, crop: 150 }, cropUpkeep: 4 },
};

function demoArchetypes() {
  const out = {};
  for (const id of ARCHETYPE_IDS) {
    const arch = BALANCE_ARCHETYPES[id];
    const roles = slotRolesForArchetype(id);
    const troops = {};
    for (const [ref, roleId] of Object.entries(roles)) {
      const base = DEMO_BASE[ref];
      if (!base) continue;
      const shaped = shapeTroopForRole(ref, base, roleId, arch.scale);
      troops[ref] = { roleId, stats: shaped.stats, cost: shaped.cost };
    }
    out[id] = { label: arch.label, description: arch.description, troops };
  }
  return out;
}

function main() {
  if (demo) {
    const d = demoArchetypes();
    if (asJson) {
      console.log(JSON.stringify(d, null, 2));
      return;
    }
    for (const [id, block] of Object.entries(d)) {
      console.log(`\n=== ${id} (${block.label}) ===`);
      console.log(block.description);
      for (const [ref, t] of Object.entries(block.troops)) {
        const s = t.stats;
        console.log(
          `  ${ref.padEnd(8)} ${t.roleId.padEnd(16)} atk ${String(s.attack).padStart(3)}  di ${String(s.defenseInfantry).padStart(3)}  dc ${String(s.defenseCavalry).padStart(3)}  spd ${String(s.speed).padStart(2)}  carry ${String(s.carry).padStart(3)}`
        );
      }
    }
    return;
  }

  const tribes = loadPlayableTribes();
  const report = auditAllTribes(tribes, { strict });

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Troop role audit (${tribes.length} tribes, strict=${strict})\n`);
    for (const r of report.results) {
      if (r.skipped) {
        console.log(`— ${r.id}: skipped (${r.reason})`);
        continue;
      }
      const mark = r.ok ? "OK" : "FAIL";
      console.log(`${mark}  ${r.id}${r.allowArmoredOffCav ? " [def-specialist]" : ""}`);
      for (const u of r.units.filter((x) =>
        ["inf_t1", "inf_t2", "inf_t3", "cav_t1", "cav_t2", "cav_t3"].includes(x.ref)
      )) {
        const tag = u.cavRole || u.orientation;
        console.log(`     ${u.ref.padEnd(8)} ${String(u.name).padEnd(22)} ${tag}`);
      }
      for (const i of r.issues) console.log(`   ! ${i.message}`);
      for (const w of r.warnings) console.log(`   ~ ${w.message}`);
    }
    console.log(
      `\n${report.ok ? "PASS" : "FAIL"} — ${report.failedCount} tribe(s) with role issues.`
    );
    console.log("Doctrine: data/balance/TROOP_ROLES.md");
  }

  if (!report.ok) process.exitCode = 1;
}

main();
