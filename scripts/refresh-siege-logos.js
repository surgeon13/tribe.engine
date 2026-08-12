#!/usr/bin/env node
/**
 * Reassign ram + catapult logos for every tribe from assets/rams and assets/catapults.
 * Updates data/tribe-logos.json and generated-tribe graphics.logo overrides, then rebuilds dashboard.
 *
 * Usage: npm run tribe:refresh-siege-logos
 */
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { resolveRepoRoot } from "../lib/repo-root.js";
import { isCoreTribe } from "../lib/tribe-generator/write.js";
import { SIEGE_LOGOS } from "../lib/tribe-generator/siege-logos.js";

const root = resolveRepoRoot();
const dataDir = path.join(root, "data");

async function readJson(rel) {
  return JSON.parse(await fs.readFile(path.join(dataDir, rel), "utf8"));
}

async function writeJson(rel, value) {
  await fs.writeFile(path.join(dataDir, rel), `${JSON.stringify(value, null, 2)}\n`, "utf8");
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
 * @param {string} iconPath
 * @param {"rams"|"catapults"} group
 */
function assertInGroup(logoGroups, iconPath, group) {
  const icons = logoGroups.groups?.[group]?.icons || [];
  if (!icons.includes(iconPath)) {
    throw new Error(`${iconPath} is not listed in logo-groups ${group}`);
  }
}

/** Sync ram/catapult logo overrides on generated tribes. Core tribes use tribe-logos.json only. */
async function syncTribeOverrides(tribeId, siege) {
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
    if (troop.ref !== "ram" && troop.ref !== "catapult") return troop;
    const nextLogo = siege[troop.ref];
    const prev = troop.overrides?.graphics?.logo;
    if (prev === nextLogo) return troop;
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
    const siege = SIEGE_LOGOS[tribeId];
    if (!siege) {
      console.warn(`[skip] no curated siege logos for ${tribeId}`);
      continue;
    }
    assertInGroup(logoGroups, siege.ram, "rams");
    assertInGroup(logoGroups, siege.catapult, "catapults");

    const prev = tribeLogos.tribes[tribeId] || {};
    tribeLogos.tribes[tribeId] = {
      ...prev,
      ram: siege.ram,
      catapult: siege.catapult,
    };

    const overrideChanged = await syncTribeOverrides(tribeId, siege);
    report.push({
      id: tribeId,
      ram: siege.ram,
      catapult: siege.catapult,
      changed:
        prev.ram !== siege.ram || prev.catapult !== siege.catapult || overrideChanged,
    });
  }

  await writeJson("tribe-logos.json", tribeLogos);

  const buildOut = await runBuild();
  console.log(buildOut);
  console.log("[Tevel] Refreshed ram/catapult logos:");
  for (const row of report) {
    const mark = row.changed ? "*" : " ";
    console.log(
      `  ${mark} ${row.id.padEnd(14)} ram=${row.ram.replace(/^rams\//, "")}  catapult=${row.catapult.replace(/^catapults\//, "")}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
