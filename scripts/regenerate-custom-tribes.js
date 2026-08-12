#!/usr/bin/env node
/**
 * Recreate troop tables (names, stats, costs, logos, training) for non-core
 * generated tribes using the current lexicon + logo catalogs.
 *
 * - Culture-preset tribes keep profile stats/costs/hero balance (e.g. Undead buff)
 *   but refresh names from the historical troop lexicon and logos from new assets.
 * - Fully custom tribes (cultureId "custom") are rebuilt via buildCustomProfile.
 * - Core Travian defaults (Romans–Nature + Median) are never touched.
 */
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { resolveRepoRoot } from "../lib/repo-root.js";
import { REFS, getProfile } from "../lib/tribe-generator/profiles.js";
import { buildCustomProfile } from "../lib/tribe-generator/custom.js";
import {
  CULTURE_LEXICONS,
  rosterFromLexicon,
} from "../lib/tribe-generator/troop-lexicon.js";
import { CORE_TRIBE_IDS, isCoreTribe } from "../lib/tribe-generator/write.js";
import { SIEGE_LOGOS } from "../lib/tribe-generator/siege-logos.js";

const root = resolveRepoRoot();
const dataDir = path.join(root, "data");

/** Map tribe/culture ids onto lexicon pack ids when they differ. */
const CULTURE_TO_LEXICON = Object.freeze({
  viking: "norse",
  moors: "north_african",
  arab: "arab",
  nabateans: "nabatean",
  axum: "axumite",
  persian: "persian",
});

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

function pickStable(seed, items) {
  if (!items?.length) return null;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return items[h % items.length];
}

function refreshSlotLogos(tribeId, baseLogos, logoGroups) {
  const rams = logoGroups.groups?.rams?.icons || ["rams/siege-ram.svg"];
  const cats = logoGroups.groups?.catapults?.icons || ["catapults/catapult.svg"];
  const chiefs = logoGroups.groups?.chiefs?.icons || ["chiefs/scepter.svg"];
  const settlers = logoGroups.groups?.settlers?.icons || ["settlers/farmer.svg"];
  const curated = SIEGE_LOGOS[tribeId];
  return {
    ...baseLogos,
    ram: curated?.ram || pickStable(`${tribeId}:ram`, rams),
    catapult: curated?.catapult || pickStable(`${tribeId}:catapult`, cats),
    chief: pickStable(`${tribeId}:chief`, chiefs),
    settler: pickStable(`${tribeId}:settler`, settlers),
  };
}

function resolveLexiconPack(cultureId, tribeName, lore) {
  const mapped = CULTURE_TO_LEXICON[cultureId] || cultureId;
  const direct = CULTURE_LEXICONS.find((c) => c.id === mapped);
  if (direct) return direct;
  // Fall back: prefer packs whose match keywords hit the tribe name hardest
  const name = String(tribeName || "").toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const pack of CULTURE_LEXICONS) {
    let score = 0;
    for (const m of pack.match || []) {
      if (name.includes(m) || String(lore || "").toLowerCase().includes(m)) score += m.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = pack;
    }
  }
  return best;
}

function lexiconNames(tribeId, cultureId, tribeName, lore, archetype) {
  const pack = resolveLexiconPack(cultureId || tribeId, tribeName, lore);
  if (!pack) return null;
  const units = rosterFromLexicon(pack, tribeName, {
    archetype: archetype || pack.archetype || "balanced",
  });
  /** @type {Record<string, string>} */
  const names = {};
  for (const ref of REFS) {
    if (units[ref]) names[ref] = units[ref];
  }
  return { packId: pack.id, names };
}

function heroNameFromDoc(doc, displayName) {
  return (
    doc.hero?.name?.en ||
    doc.hero?.overrides?.name?.en ||
    `${String(displayName).replace(/s$/i, "")} Hero`
  );
}

/**
 * Rebuild from culture profile (stats preserved) + lexicon names + new logos.
 */
function rebuildFromProfile(tribeId, doc, profile, logoGroups) {
  const displayName = doc.tribe?.name?.en || profile.name;
  const meta = doc.meta || {};
  const lore = meta.historicalContext || profile.historicalContext;
  const named = lexiconNames(
    tribeId,
    meta.cultureId || profile.id,
    displayName,
    lore,
    meta.archetype || profile.archetype
  );
  const logos = refreshSlotLogos(tribeId, profile.logos, logoGroups);
  const heroName = heroNameFromDoc(doc, displayName);

  const troops = REFS.map((ref) => {
    const def = profile.troops[ref];
    if (!def) throw new Error(`Profile ${profile.id} missing troop ${ref}`);
    const name = named?.names?.[ref] || def.name;
    /** @type {Record<string, unknown>} */
    const overrides = {
      name: { en: name },
      stats: { ...def.stats },
      cost: { ...def.cost },
      cropUpkeep: def.cropUpkeep,
      graphics: { logo: logos[ref] },
    };
    if (def.description) {
      // Keep description flavor but swap in the new unit name when present
      overrides.description = {
        en: String(def.description).replace(def.name, name),
      };
    }
    return { ref, overrides };
  });

  return {
    troops,
    logos,
    training: { ...profile.training },
    hero: {
      ...doc.hero,
      id: doc.hero?.id || `${tribeId}_hero`,
      progression: doc.hero?.progression || "hero.system.json",
      role: "hero",
      category: "hero",
      name: { en: heroName },
      description: {
        en: profile.hero.description || doc.hero?.description?.en || `Hero for ${displayName}.`,
      },
      isBase: false,
      stats: { ...profile.hero.stats },
      cropUpkeep: profile.hero.cropUpkeep ?? doc.hero?.cropUpkeep ?? 6,
      graphics: doc.hero?.graphics || { portrait: `tribes/${tribeId}/hero/hero.png` },
    },
    theme: `${profile.theme} (${profile.era}, ${profile.region})`,
    metaPatch: {
      cultureId: profile.id,
      archetype: profile.archetype,
      era: profile.era,
      region: profile.region,
      historicalContext: profile.historicalContext,
      flavorId: named?.packId || profile.id,
      algorithms: ["troop-lexicon", "culture-profile-stats", "game-icons-logos"],
    },
    summaryArchetype: profile.archetype,
    summaryNames: Object.fromEntries(troops.map((t) => [t.ref, t.overrides.name.en])),
  };
}

/**
 * Fully custom rebuild (lexicon + archetype balance).
 */
function rebuildCustom(tribeId, doc, logoGroups) {
  const displayName = doc.tribe?.name?.en || tribeId;
  const meta = doc.meta || {};
  const heroName = heroNameFromDoc(doc, displayName);
  const profile = buildCustomProfile({
    name: displayName,
    theme: doc.tribe?.theme,
    historicalContext: meta.historicalContext,
    era: meta.era,
    region: meta.region,
    archetype: meta.archetype,
    palette: doc.palette,
    heroName,
  });
  const logos = refreshSlotLogos(tribeId, profile.logos, logoGroups);
  const troops = REFS.map((ref) => {
    const def = profile.troops[ref];
    /** @type {Record<string, unknown>} */
    const overrides = {
      name: { en: def.name },
      stats: { ...def.stats },
      cost: { ...def.cost },
      cropUpkeep: def.cropUpkeep,
      graphics: { logo: logos[ref] },
    };
    if (def.description) overrides.description = { en: def.description };
    return { ref, overrides };
  });
  return {
    troops,
    logos,
    training: { ...profile.training },
    hero: {
      ...doc.hero,
      id: doc.hero?.id || `${tribeId}_hero`,
      progression: doc.hero?.progression || "hero.system.json",
      role: "hero",
      category: "hero",
      name: { en: profile.hero.name },
      description: { en: profile.hero.description },
      isBase: false,
      stats: { ...profile.hero.stats },
      cropUpkeep: profile.hero.cropUpkeep,
      graphics: doc.hero?.graphics || { portrait: `tribes/${tribeId}/hero/hero.png` },
    },
    theme: profile.theme || doc.tribe?.theme,
    metaPatch: {
      cultureId: "custom",
      custom: true,
      archetype: profile.archetype,
      era: profile.era,
      region: profile.region,
      historicalContext: profile.historicalContext,
      flavorId: profile.meta?.flavorId,
      algorithms: ["troop-lexicon", "troop-role-balance", "game-icons-logos"],
    },
    summaryArchetype: profile.archetype,
    summaryNames: Object.fromEntries(troops.map((t) => [t.ref, t.overrides.name.en])),
  };
}

async function regenerateOne(tribeId, logoGroups) {
  if (isCoreTribe(tribeId)) {
    throw new Error(`Refusing to regenerate core tribe "${tribeId}"`);
  }

  const doc = await readJson(`tribes/${tribeId}.json`);
  const meta = doc.meta || {};
  const cultureId = meta.cultureId && meta.cultureId !== "custom" ? meta.cultureId : null;
  const profile = cultureId ? getProfile(cultureId) : null;

  const rebuilt = profile
    ? rebuildFromProfile(tribeId, doc, profile, logoGroups)
    : rebuildCustom(tribeId, doc, logoGroups);

  const next = {
    ...doc,
    tribe: {
      ...doc.tribe,
      theme: rebuilt.theme || doc.tribe?.theme,
    },
    troops: rebuilt.troops,
    hero: rebuilt.hero,
    meta: {
      ...meta,
      generated: true,
      regeneratedAt: new Date().toISOString(),
      ...rebuilt.metaPatch,
    },
  };

  await writeJson(`tribes/${tribeId}.json`, next);

  const tribeLogos = await readJson("tribe-logos.json");
  tribeLogos.tribes = tribeLogos.tribes || {};
  tribeLogos.tribes[tribeId] = { ...rebuilt.logos };
  await writeJson("tribe-logos.json", tribeLogos);

  const training = await readJson("tribe-training.json");
  training.tribes = training.tribes || {};
  training.tribes[tribeId] = { ...rebuilt.training };
  await writeJson("tribe-training.json", training);

  return {
    id: tribeId,
    mode: profile ? `profile:${profile.id}` : "custom",
    archetype: rebuilt.summaryArchetype,
    names: rebuilt.summaryNames,
    logos: {
      ram: rebuilt.logos.ram,
      catapult: rebuilt.logos.catapult,
      chief: rebuilt.logos.chief,
      settler: rebuilt.logos.settler,
    },
  };
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const index = await readJson("tribes/index.json");
  const logoGroups = await readJson("logo-groups.json");
  const targets = index.tribes
    .map((t) => t.id)
    .filter((id) => !isCoreTribe(id))
    .filter((id) => (only.length ? only.includes(id) : true));

  if (!targets.length) {
    console.log("No custom tribes to regenerate.");
    console.log(`Core (skipped): ${CORE_TRIBE_IDS.join(", ")}`);
    return;
  }

  console.log(`Regenerating ${targets.length} custom tribe(s); core untouched:`);
  console.log(`  skip: ${CORE_TRIBE_IDS.join(", ")}`);
  console.log(`  do:   ${targets.join(", ")}`);

  for (const id of targets) {
    const summary = await regenerateOne(id, logoGroups);
    console.log(
      `  ✓ ${id} (${summary.mode}, ${summary.archetype})  ram=${summary.logos.ram}  cat=${summary.logos.catapult}  settler=${summary.logos.settler}`
    );
    console.log(`      ${Object.values(summary.names).join(", ")}`);
  }

  const buildOut = await runBuild();
  console.log(buildOut || "Dashboard data rebuilt.");
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
