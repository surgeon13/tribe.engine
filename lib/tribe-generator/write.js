import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { getProfile, matchProfile, REFS, CULTURE_PROFILES } from "./profiles.js";
import { buildCustomProfile, resolveHeroName } from "./custom.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const dataDir = path.join(root, "data");

/** Original Travian-sourced factions — cannot be deleted via the applet/CLI. */
export const CORE_TRIBE_IDS = Object.freeze([
  "roman",
  "teuton",
  "gaul",
  "egyptian",
  "hun",
  "spartan",
  "natar",
  "nature",
  "median",
]);

export function isCoreTribe(id) {
  return CORE_TRIBE_IDS.includes(id);
}

/**
 * @param {string} name
 */
export function slugifyTribeId(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

async function readJson(rel) {
  return JSON.parse(await fs.readFile(path.join(dataDir, rel), "utf8"));
}

async function writeJson(rel, value) {
  const filePath = path.join(dataDir, rel);
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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
 * @param {object} opts
 * @param {string} [opts.cultureId]  preset id, or "custom"
 * @param {boolean} [opts.custom]    force custom builder
 * @param {string} [opts.historicalContext]
 * @param {string} [opts.name]
 * @param {string} [opts.id]
 * @param {string} [opts.theme]
 * @param {string} [opts.era]
 * @param {string} [opts.region]
 * @param {string} [opts.archetype]
 * @param {'playable'|'npc'} [opts.type]
 * @param {{ primary?: string, secondary?: string, notes?: string }} [opts.palette]
 * @param {Record<string, string>} [opts.troopNames]
 * @param {string} [opts.heroName]
 * @param {string} [opts.accountName] player account / in-game name (default hero name)
 * @param {string} [opts.playerName] alias of accountName
 * @param {Record<string, object>} [opts.troopOverrides]
 * @param {object} [opts.hero]
 * @param {boolean} [opts.rebuild=true]
 */
export async function createTribe(opts = {}) {
  const type = opts.type === "npc" ? "npc" : "playable";
  const wantCustom =
    opts.custom === true ||
    opts.cultureId === "custom" ||
    opts.mode === "custom";

  const heroOpts = {
    hero: opts.hero,
    heroName: opts.heroName,
    accountName: opts.accountName,
    playerName: opts.playerName,
    troopNames: opts.troopNames,
  };

  let profile = null;
  if (wantCustom) {
    if (!opts.name?.trim()) throw new Error("Custom tribe requires a display name");
    profile = buildCustomProfile({
      name: opts.name,
      theme: opts.theme,
      historicalContext: opts.historicalContext,
      era: opts.era,
      region: opts.region,
      archetype: opts.archetype,
      palette: opts.palette,
      troopNames: opts.troopNames,
      troopOverrides: opts.troopOverrides,
      ...heroOpts,
      logos: opts.logos,
      training: opts.training,
    });
  } else {
    profile = opts.cultureId ? getProfile(opts.cultureId) : null;
    if (!profile && opts.historicalContext) profile = matchProfile(opts.historicalContext);
    if (!profile && opts.name) profile = matchProfile(opts.name);
    if (!profile) {
      // Fall back to fully custom if the user supplied a name but no matching preset
      if (opts.name?.trim()) {
        profile = buildCustomProfile({
          name: opts.name,
          theme: opts.theme,
          historicalContext: opts.historicalContext,
          era: opts.era,
          region: opts.region,
          archetype: opts.archetype,
          palette: opts.palette,
          troopNames: opts.troopNames,
          troopOverrides: opts.troopOverrides,
          ...heroOpts,
        });
      } else {
        const hint = listAvailableCultures();
        throw new Error(
          `Unknown culture. Use cultureId "custom" with a name, or pick: ${hint.join(", ")}`
        );
      }
    }
  }

  const displayName = (opts.name || profile.name).trim();
  if (!displayName) throw new Error("Tribe name is required");

  const isCustomProfile = profile.id === "custom";
  const customName = Boolean(opts.name && opts.name.trim() && opts.name.trim() !== profile.name);
  let id = (
    opts.id ||
    (isCustomProfile || customName ? slugifyTribeId(displayName) : profile.id)
  ).trim();
  if (!/^[a-z][a-z0-9_]{1,39}$/.test(id)) {
    throw new Error(`Invalid tribe id "${id}" — use lowercase letters, numbers, underscore`);
  }

  const index = await readJson("tribes/index.json");
  if (index.tribes.some((t) => t.id === id)) {
    throw new Error(`Tribe id "${id}" already exists`);
  }
  const tribePath = path.join(dataDir, "tribes", `${id}.json`);
  try {
    await fs.access(tribePath);
    throw new Error(`Tribe file already exists: tribes/${id}.json`);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }

  const primary = opts.palette?.primary || profile.palette.primary;
  const secondary = opts.palette?.secondary || profile.palette.secondary;
  if (!/^#[0-9A-Fa-f]{6}$/.test(primary) || !/^#[0-9A-Fa-f]{6}$/.test(secondary)) {
    throw new Error("Palette colors must be #RRGGBB");
  }

  const theme =
    opts.theme ||
    (isCustomProfile
      ? profile.theme
      : `${profile.theme} (${profile.era}, ${profile.region})`);

  // Optional troop name / override patches on top of preset profiles too
  const namePatches = opts.troopNames || {};
  const overridePatches = opts.troopOverrides || {};

  const troops = REFS.map((ref) => {
    const def = profile.troops[ref];
    if (!def) throw new Error(`Profile ${profile.id} missing troop ${ref}`);
    const patch = overridePatches[ref] || {};
    /** @type {Record<string, unknown>} */
    const overrides = {
      name: { en: patch.name || namePatches[ref] || def.name },
      stats: patch.stats ? { ...def.stats, ...patch.stats } : { ...def.stats },
      cost: patch.cost ? { ...def.cost, ...patch.cost } : { ...def.cost },
      cropUpkeep: patch.cropUpkeep ?? def.cropUpkeep,
      graphics: {
        logo: (opts.logos && opts.logos[ref]) || profile.logos[ref],
      },
    };
    const desc = patch.description || def.description;
    if (desc) overrides.description = { en: desc };
    return { ref, overrides };
  });

  const heroName = resolveHeroName(opts);
  const heroStats = opts.hero?.stats
    ? { ...profile.hero.stats, ...opts.hero.stats }
    : { ...profile.hero.stats };

  const tribeDoc = {
    $schema: "../units.schema.json",
    version: 1,
    game: "Tevel",
    tribe: {
      id,
      name: { en: displayName },
      theme,
      graphics: { banner: `tribes/${id}/banner.png` },
    },
    palette: { primary, secondary },
    buildings: {
      usePalette: true,
      spriteRoot: `tribes/${id}/buildings`,
    },
    troops,
    hero: {
      id: `${id}_hero`,
      progression: "hero.system.json",
      role: "hero",
      category: "hero",
      name: { en: heroName },
      description: {
        en:
          opts.hero?.description ||
          `Player hero — defaults to the account's in-game name; editable later.`,
      },
      isBase: false,
      stats: heroStats,
      cost: { wood: 0, clay: 0, iron: 0, crop: 0 },
      cropUpkeep: opts.hero?.cropUpkeep ?? profile.hero.cropUpkeep,
      training: { building: "hero_mansion", timeSeconds: 0, requirements: [] },
      graphics: {
        sprite: `tribes/${id}/hero/hero.png`,
        icon: `tribes/${id}/hero/hero_icon.png`,
        portrait: `tribes/${id}/hero/hero_portrait.png`,
      },
    },
    meta: {
      generated: true,
      custom: isCustomProfile,
      cultureId: isCustomProfile ? "custom" : profile.id,
      archetype: profile.archetype || opts.archetype || null,
      era: opts.era || profile.era,
      region: opts.region || profile.region,
      historicalContext: opts.historicalContext || profile.historicalContext,
      createdAt: new Date().toISOString(),
    },
  };

  await writeJson(`tribes/${id}.json`, tribeDoc);

  index.tribes.push({
    id,
    file: `${id}.json`,
    type,
    name: { en: displayName },
  });
  await writeJson("tribes/index.json", index);

  const palettes = await readJson("tribes/palettes.json");
  palettes.palettes[id] = {
    primary,
    secondary,
    notes: opts.palette?.notes || profile.palette.notes || `${displayName} palette`,
  };
  await writeJson("tribes/palettes.json", palettes);

  const training = await readJson("tribe-training.json");
  if (type === "npc") {
    training.tribes[id] = Object.fromEntries(
      REFS.map((ref) => [ref, { building: id, timeSeconds: 0 }])
    );
  } else {
    training.tribes[id] = { ...(opts.training || profile.training) };
  }
  await writeJson("tribe-training.json", training);

  const logos = await readJson("tribe-logos.json");
  logos.tribes[id] = { ...profile.logos, ...(opts.logos || {}) };
  await writeJson("tribe-logos.json", logos);

  const heroSystem = await readJson("hero.system.json");
  heroSystem.tribeModifiers[id] = {
    fightingStrengthPerPoint: profile.fightingStrengthPerPoint,
    resourceProductionBonusPercent: profile.resourceProductionBonusPercent || 0,
    ...(type === "npc" ? { playable: false } : {}),
  };
  await writeJson("hero.system.json", heroSystem);

  let buildMessage = null;
  if (opts.rebuild !== false) {
    buildMessage = await runBuild();
  }

  return {
    ok: true,
    id,
    name: displayName,
    type,
    custom: isCustomProfile,
    cultureId: isCustomProfile ? "custom" : profile.id,
    archetype: profile.archetype || null,
    file: `data/tribes/${id}.json`,
    theme,
    palette: { primary, secondary },
    historicalContext: tribeDoc.meta.historicalContext,
    buildMessage,
  };
}

function listAvailableCultures() {
  return CULTURE_PROFILES.map((p) => p.id);
}

/**
 * Remove a non-core tribe from disk registries and rebuild dashboard data.
 * @param {string} id
 * @param {{ rebuild?: boolean }} [opts]
 */
export async function deleteTribe(id, opts = {}) {
  const tribeId = String(id || "").trim();
  if (!tribeId) throw new Error("Tribe id is required");
  if (isCoreTribe(tribeId)) {
    throw new Error(
      `Cannot delete core tribe "${tribeId}". Protected defaults: ${CORE_TRIBE_IDS.join(", ")}`
    );
  }

  const index = await readJson("tribes/index.json");
  const entry = index.tribes.find((t) => t.id === tribeId);
  if (!entry) throw new Error(`Tribe "${tribeId}" is not registered`);

  const displayName = entry.name?.en || entry.name || tribeId;
  index.tribes = index.tribes.filter((t) => t.id !== tribeId);
  await writeJson("tribes/index.json", index);

  const tribeFile = path.join(dataDir, "tribes", entry.file || `${tribeId}.json`);
  try {
    await fs.unlink(tribeFile);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }

  const palettes = await readJson("tribes/palettes.json");
  if (palettes.palettes?.[tribeId]) {
    delete palettes.palettes[tribeId];
    await writeJson("tribes/palettes.json", palettes);
  }

  const training = await readJson("tribe-training.json");
  if (training.tribes?.[tribeId]) {
    delete training.tribes[tribeId];
    await writeJson("tribe-training.json", training);
  }

  const logos = await readJson("tribe-logos.json");
  if (logos.tribes?.[tribeId]) {
    delete logos.tribes[tribeId];
    await writeJson("tribe-logos.json", logos);
  }

  const heroSystem = await readJson("hero.system.json");
  if (heroSystem.tribeModifiers?.[tribeId]) {
    delete heroSystem.tribeModifiers[tribeId];
    await writeJson("hero.system.json", heroSystem);
  }

  let buildMessage = null;
  if (opts.rebuild !== false) {
    buildMessage = await runBuild();
  }

  return {
    ok: true,
    id: tribeId,
    name: displayName,
    removedFile: `data/tribes/${entry.file || `${tribeId}.json`}`,
    buildMessage,
  };
}

/**
 * @returns {Promise<{ id: string, name: string, type: string, core: boolean, removable: boolean, generated?: boolean }[]>}
 */
export async function listTribes() {
  const index = await readJson("tribes/index.json");
  const out = [];
  for (const entry of index.tribes) {
    let generated = false;
    try {
      const raw = await readJson(`tribes/${entry.file || `${entry.id}.json`}`);
      generated = Boolean(raw?.meta?.generated);
    } catch {
      /* missing file */
    }
    const core = isCoreTribe(entry.id);
    out.push({
      id: entry.id,
      name: entry.name?.en || entry.name || entry.id,
      type: entry.type || "playable",
      core,
      removable: !core,
      generated,
    });
  }
  return out;
}
