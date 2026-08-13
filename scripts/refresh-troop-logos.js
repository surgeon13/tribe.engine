#!/usr/bin/env node
/**
 * Reassign curated troop logos for every tribe from the shared icon pools:
 * rams and catapults (siege) plus cavalry tiers and scouts (mounts).
 *
 * Updates data/tribe-logos.json for all tribes and the graphics.logo overrides
 * on generated tribes (whose tribe JSON wins over the catalog), then rebuilds
 * the dashboard payload.
 *
 * Usage: npm run tribe:refresh-logos
 */
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { resolveRepoRoot } from "../lib/repo-root.js";
import { formatJson } from "../lib/json-format.js";
import { isCoreTribe } from "../lib/tribe-generator/write.js";
import { SIEGE_LOGOS } from "../lib/tribe-generator/siege-logos.js";
import { MOUNT_LOGOS, WILDLIFE_MOUNTS } from "../lib/tribe-generator/mount-logos.js";

const root = resolveRepoRoot();
const dataDir = path.join(root, "data");

/** Slots this script owns, and the logo groups each may draw from. */
const CURATED_REFS = Object.freeze({
  ram: ["rams"],
  catapult: ["catapults"],
  cav_t1: ["cavalry"],
  cav_t2: ["cavalry"],
  cav_t3: ["cavalry"],
  scout: ["infantry", "animals"],
});

/** @returns {string[]} groups `ref` may draw from for this tribe */
function groupsFor(tribeId, ref) {
  const allowed = CURATED_REFS[ref];
  if (ref.startsWith("cav_") && WILDLIFE_MOUNTS.includes(tribeId)) {
    return [...allowed, "animals"];
  }
  return allowed;
}

async function readJson(rel) {
  return JSON.parse(await fs.readFile(path.join(dataDir, rel), "utf8"));
}

async function writeJson(rel, value) {
  await fs.writeFile(path.join(dataDir, rel), formatJson(value), "utf8");
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", "build-dashboard-data.js")], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err.trim() || out.trim() || `build exit ${code}`));
    });
  });
}

/**
 * @param {object} logoGroups
 * @param {string} tribeId
 * @param {string} ref
 * @param {string} iconPath
 */
function assertInGroups(logoGroups, tribeId, ref, iconPath) {
  const allowed = groupsFor(tribeId, ref);
  const ok = allowed.some((group) => (logoGroups.groups?.[group]?.icons || []).includes(iconPath));
  if (!ok) {
    throw new Error(
      `${iconPath} for ${tribeId}.${ref} is not listed in logo-groups ${allowed.join("/")}`
    );
  }
}

/** Sync curated logo overrides on generated tribes. Core tribes use tribe-logos.json only. */
async function syncTribeOverrides(tribeId, byRef) {
  if (isCoreTribe(tribeId)) return false;

  const rel = `tribes/${tribeId}.json`;
  let doc;
  try {
    doc = await readJson(rel);
  } catch {
    return false;
  }
  if (!Array.isArray(doc.troops)) return false;

  let changed = false;
  doc.troops = doc.troops.map((troop) => {
    const nextLogo = byRef[troop.ref];
    if (!nextLogo) return troop;
    if (troop.overrides?.graphics?.logo === nextLogo) return troop;
    changed = true;
    return {
      ...troop,
      overrides: {
        ...(troop.overrides || {}),
        graphics: {
          ...(troop.overrides?.graphics || {}),
          logo: nextLogo,
        },
      },
    };
  });

  if (changed) await writeJson(rel, doc);
  return changed;
}

async function main() {
  const logoGroups = await readJson("logo-groups.json");
  const tribeLogos = await readJson("tribe-logos.json");
  const index = await readJson("tribes/index.json");

  tribeLogos.tribes = tribeLogos.tribes || {};
  const report = [];

  for (const entry of index.tribes) {
    const tribeId = entry.id;
    const curated = { ...(SIEGE_LOGOS[tribeId] || {}), ...(MOUNT_LOGOS[tribeId] || {}) };
    const refs = Object.keys(curated).filter((ref) => ref in CURATED_REFS);
    if (!refs.length) {
      console.warn(`[skip] no curated logos for ${tribeId}`);
      continue;
    }

    for (const ref of refs) assertInGroups(logoGroups, tribeId, ref, curated[ref]);

    const prev = tribeLogos.tribes[tribeId] || {};
    const next = { ...prev };
    for (const ref of refs) next[ref] = curated[ref];

    // Scouts and cavalry share pools with the infantry slots this script does not
    // own, so check the whole roster — a tribe showing one icon twice looks broken.
    const byIcon = new Map();
    for (const [ref, icon] of Object.entries(next)) {
      if (byIcon.has(icon)) {
        throw new Error(
          `${tribeId} would show ${icon} for both ${byIcon.get(icon)} and ${ref}`
        );
      }
      byIcon.set(icon, ref);
    }

    tribeLogos.tribes[tribeId] = next;

    const catalogChanged = refs.some((ref) => prev[ref] !== curated[ref]);
    const overrideChanged = await syncTribeOverrides(tribeId, curated);
    report.push({ id: tribeId, curated, changed: catalogChanged || overrideChanged });
  }

  await writeJson("tribe-logos.json", tribeLogos);

  const buildOut = await runBuild();
  console.log(buildOut);
  console.log("[Tevel] Refreshed curated troop logos:");
  const short = (p) => (p ? p.split("/").pop().replace(/\.svg$/, "") : "-");
  for (const row of report) {
    console.log(
      `  ${row.changed ? "*" : " "} ${row.id.padEnd(14)}` +
        `ram=${short(row.curated.ram).padEnd(14)}` +
        `cat=${short(row.curated.catapult).padEnd(11)}` +
        `cav=${[row.curated.cav_t1, row.curated.cav_t2, row.curated.cav_t3].map(short).join("/").padEnd(42)}` +
        `scout=${short(row.curated.scout)}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
