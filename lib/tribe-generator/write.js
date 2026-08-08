import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { getProfile, matchProfile, REFS, CULTURE_PROFILES } from "./profiles.js";
import { buildCustomProfile, resolveHeroName } from "./custom.js";
import { attachAssetUrls, resolveTribe } from "../merge.js";
import { resolveRepoRoot } from "../repo-root.js";

const root = resolveRepoRoot();
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
  const persist = opts.persist !== false;
  if (persist && index.tribes.some((t) => t.id === id)) {
    throw new Error(`Tribe id "${id}" already exists`);
  }
  const tribePath = path.join(dataDir, "tribes", `${id}.json`);
  if (persist) {
    try {
      await fs.access(tribePath);
      throw new Error(`Tribe file already exists: tribes/${id}.json`);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
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

  const trainingByRef =
    type === "npc"
      ? Object.fromEntries(REFS.map((ref) => [ref, { building: id, timeSeconds: 0 }]))
      : { ...(opts.training || profile.training) };
  const logosByRef = { ...profile.logos, ...(opts.logos || {}) };

  // Netlify / preview: resolve a dashboard tribe without writing the repo.
  if (!persist) {
    const dashboardTribe = await resolveDashboardTribe(
      tribeDoc,
      type,
      trainingByRef,
      logosByRef
    );
    return {
      ok: true,
      id,
      name: displayName,
      type,
      custom: isCustomProfile,
      cultureId: isCustomProfile ? "custom" : profile.id,
      archetype: profile.archetype || null,
      file: null,
      theme,
      palette: { primary, secondary },
      historicalContext: tribeDoc.meta.historicalContext,
      persisted: false,
      sessionOnly: true,
      dashboardTribe: {
        ...dashboardTribe,
        sessionOnly: true,
        persisted: false,
      },
      buildMessage: null,
    };
  }

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
  training.tribes[id] = trainingByRef;
  await writeJson("tribe-training.json", training);

  const logos = await readJson("tribe-logos.json");
  logos.tribes[id] = logosByRef;
  await writeJson("tribe-logos.json", logos);

  const heroSystem = await readJson("hero.system.json");
  heroSystem.tribeModifiers[id] = {
    fightingStrengthPerPoint: profile.fightingStrengthPerPoint,
    resourceProductionBonusPercent: profile.resourceProductionBonusPercent || 0,
    ...(type === "npc" ? { playable: false } : {}),
  };
  await writeJson("hero.system.json", heroSystem);

  let buildMessage = null;
  let buildWarning = null;
  if (opts.rebuild !== false) {
    try {
      buildMessage = await runBuild();
    } catch (e) {
      // Disk write already succeeded — still return a usable tribe so the UI can show it.
      buildWarning = e?.message || String(e);
    }
  }

  const dashboardTribe = await resolveDashboardTribe(
    tribeDoc,
    type,
    trainingByRef,
    logosByRef
  );

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
    persisted: true,
    sessionOnly: false,
    dashboardTribe: {
      ...dashboardTribe,
      sessionOnly: false,
      persisted: true,
    },
    buildMessage,
    buildWarning,
  };
}

function listAvailableCultures() {
  return CULTURE_PROFILES.map((p) => p.id);
}

/**
 * Resolve a tribe document into a dashboard-ready tribe (with asset URLs).
 * @param {object} tribeDoc
 * @param {'playable'|'npc'} type
 * @param {Record<string, object>} [trainingByRef]
 * @param {Record<string, string>} [logosByRef]
 */
async function resolveDashboardTribe(tribeDoc, type, trainingByRef, logosByRef) {
  const id = tribeDoc.tribe.id;
  const base = await readJson("units.base.json");
  const roster = await readJson("roster.json");
  const tribeTraining = await readJson("tribe-training.json");
  const logoGroups = await readJson("logo-groups.json");
  const tribeLogos = await readJson("tribe-logos.json");
  const trainingForResolve = {
    ...tribeTraining,
    tribes: {
      ...(tribeTraining.tribes || {}),
      [id]:
        trainingByRef ||
        tribeTraining.tribes?.[id] ||
        (type === "npc"
          ? Object.fromEntries(REFS.map((ref) => [ref, { building: id, timeSeconds: 0 }]))
          : {}),
    },
  };
  const logoData = {
    defaults: logoGroups.defaults,
    tribes: {
      ...(tribeLogos.tribes || {}),
      [id]: logosByRef || tribeLogos.tribes?.[id] || {},
    },
  };
  const resolved = attachAssetUrls(
    resolveTribe(tribeDoc, base.units, roster, trainingForResolve, logoData)
  );
  return {
    ...resolved,
    type,
    palette: tribeDoc.palette || resolved.palette,
  };
}

/**
 * Update an existing non-core tribe (names, theme, palette, troop stats/costs).
 * On Netlify (persist=false) returns a resolved dashboardTribe for session storage.
 *
 * @param {string} id
 * @param {object} opts
 * @param {string} [opts.name]
 * @param {string} [opts.theme]
 * @param {'playable'|'npc'} [opts.type]
 * @param {{ primary?: string, secondary?: string, notes?: string }} [opts.palette]
 * @param {Record<string, string>} [opts.troopNames]
 * @param {Record<string, { name?: string, stats?: object, cost?: object, cropUpkeep?: number, description?: string }>} [opts.troopOverrides]
 * @param {object} [opts.hero]
 * @param {string} [opts.heroName]
 * @param {boolean} [opts.persist]
 * @param {boolean} [opts.rebuild]
 */
export async function updateTribe(id, opts = {}) {
  const tribeId = String(id || "").trim();
  if (!tribeId) throw new Error("Tribe id is required");
  if (isCoreTribe(tribeId)) {
    throw new Error(
      `Cannot edit core tribe "${tribeId}". Protected defaults: ${CORE_TRIBE_IDS.join(", ")}`
    );
  }

  const persist = opts.persist !== false;
  const troopOverrides = opts.troopOverrides || {};
  const namePatches = opts.troopNames || {};

  // Session / preview path: rebuild a resolved tribe from the submitted overrides.
  if (!persist) {
    const displayName = String(opts.name || tribeId).trim();
    if (!displayName) throw new Error("Tribe name is required");
    const result = await createTribe({
      custom: true,
      cultureId: "custom",
      id: tribeId,
      name: displayName,
      theme: opts.theme,
      historicalContext: opts.historicalContext || opts.theme || displayName,
      era: opts.era,
      region: opts.region,
      archetype: opts.archetype,
      type: opts.type === "npc" ? "npc" : "playable",
      palette: opts.palette,
      troopNames: namePatches,
      troopOverrides,
      hero: opts.hero,
      heroName: opts.heroName,
      accountName: opts.accountName || opts.playerName,
      playerName: opts.playerName,
      logos: opts.logos,
      training: opts.training,
      persist: false,
      rebuild: false,
    });
    return {
      ...result,
      updated: true,
      sessionOnly: true,
      persisted: false,
      message: `Updated ${result.name} (browser session)`,
    };
  }

  let tribeDoc;
  try {
    tribeDoc = await readJson(`tribes/${tribeId}.json`);
  } catch (e) {
    if (e.code === "ENOENT") {
      throw new Error(`Tribe "${tribeId}" not found on disk — recreate it, then edit`);
    }
    throw e;
  }

  const index = await readJson("tribes/index.json");
  const entry = index.tribes.find((t) => t.id === tribeId);
  if (!entry) throw new Error(`Tribe "${tribeId}" is not registered`);

  const type = opts.type === "npc" || opts.type === "playable" ? opts.type : entry.type || "playable";
  const displayName = String(opts.name || tribeDoc.tribe?.name?.en || tribeId).trim();
  tribeDoc.tribe.name = { en: displayName };
  if (opts.theme != null && String(opts.theme).trim()) {
    tribeDoc.tribe.theme = String(opts.theme).trim();
  }

  if (opts.palette?.primary || opts.palette?.secondary) {
    const primary = opts.palette.primary || tribeDoc.palette?.primary;
    const secondary = opts.palette.secondary || tribeDoc.palette?.secondary;
    if (!/^#[0-9A-Fa-f]{6}$/.test(primary) || !/^#[0-9A-Fa-f]{6}$/.test(secondary)) {
      throw new Error("Palette colors must be #RRGGBB");
    }
    tribeDoc.palette = {
      ...(tribeDoc.palette || {}),
      primary,
      secondary,
      ...(opts.palette.notes ? { notes: opts.palette.notes } : {}),
    };
  }

  for (const troop of tribeDoc.troops || []) {
    const ref = troop.ref;
    const patch = troopOverrides[ref] || {};
    const ov = troop.overrides || (troop.overrides = {});
    const nextName = patch.name || namePatches[ref];
    if (nextName) ov.name = { en: String(nextName) };
    if (patch.stats && typeof patch.stats === "object") {
      ov.stats = { ...(ov.stats || {}), ...sanitizeStats(patch.stats) };
    }
    if (patch.cost && typeof patch.cost === "object") {
      ov.cost = { ...(ov.cost || {}), ...sanitizeCost(patch.cost) };
    }
    if (patch.cropUpkeep != null) ov.cropUpkeep = clampInt(patch.cropUpkeep, 0, 20);
    if (patch.description) ov.description = { en: String(patch.description) };
  }

  if (opts.heroName || opts.hero?.name || opts.hero?.stats || opts.accountName || opts.playerName) {
    const heroName = resolveHeroName({
      hero: opts.hero,
      heroName: opts.heroName,
      accountName: opts.accountName,
      playerName: opts.playerName,
    });
    if (heroName && heroName !== "Hero") {
      tribeDoc.hero.name = { en: heroName };
    }
    if (opts.hero?.stats) {
      tribeDoc.hero.stats = { ...(tribeDoc.hero.stats || {}), ...sanitizeStats(opts.hero.stats) };
    }
    if (opts.hero?.cropUpkeep != null) {
      tribeDoc.hero.cropUpkeep = clampInt(opts.hero.cropUpkeep, 0, 20);
    }
  }

  tribeDoc.meta = {
    ...(tribeDoc.meta || {}),
    updatedAt: new Date().toISOString(),
    edited: true,
  };

  await writeJson(`tribes/${tribeId}.json`, tribeDoc);

  entry.name = { en: displayName };
  entry.type = type;
  await writeJson("tribes/index.json", index);

  if (tribeDoc.palette?.primary && tribeDoc.palette?.secondary) {
    const palettes = await readJson("tribes/palettes.json");
    palettes.palettes[tribeId] = {
      ...(palettes.palettes[tribeId] || {}),
      primary: tribeDoc.palette.primary,
      secondary: tribeDoc.palette.secondary,
      notes: tribeDoc.palette.notes || palettes.palettes[tribeId]?.notes || `${displayName} palette`,
    };
    await writeJson("tribes/palettes.json", palettes);
  }

  let buildMessage = null;
  let buildWarning = null;
  if (opts.rebuild !== false) {
    try {
      buildMessage = await runBuild();
    } catch (e) {
      buildWarning = e?.message || String(e);
    }
  }

  const dashboardTribe = await resolveDashboardTribe(tribeDoc, type);

  return {
    ok: true,
    id: tribeId,
    name: displayName,
    type,
    custom: Boolean(tribeDoc.meta?.custom),
    cultureId: tribeDoc.meta?.cultureId || "custom",
    archetype: tribeDoc.meta?.archetype || null,
    file: `data/tribes/${tribeId}.json`,
    theme: tribeDoc.tribe.theme,
    palette: tribeDoc.palette,
    historicalContext: tribeDoc.meta?.historicalContext,
    persisted: true,
    sessionOnly: false,
    updated: true,
    dashboardTribe: {
      ...dashboardTribe,
      sessionOnly: false,
      persisted: true,
    },
    buildMessage,
    buildWarning,
    message: `Updated ${displayName}`,
  };
}

function clampInt(n, min, max) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function sanitizeStats(stats) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const key of ["attack", "defenseInfantry", "defenseCavalry", "speed", "carry"]) {
    if (stats[key] == null || stats[key] === "") continue;
    out[key] = clampInt(stats[key], 0, 500);
  }
  return out;
}

function sanitizeCost(cost) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const key of ["wood", "clay", "iron", "crop"]) {
    if (cost[key] == null || cost[key] === "") continue;
    out[key] = clampInt(cost[key], 0, 50000);
  }
  return out;
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
