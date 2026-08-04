import { assetUrl, resolveUnitGraphics } from "./graphics-paths.js";

/**
 * Deep-merge plain objects (tribe overrides into base units). * @param {Record<string, unknown>} target
 * @param {Record<string, unknown>} source
 * @returns {Record<string, unknown>}
 */
export function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof out[key] === "object" &&
      out[key] !== null &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(/** @type {Record<string, unknown>} */ (out[key]), val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

/**
 * @param {{ wood?: number, clay?: number, iron?: number, crop?: number }} cost
 */
export function totalCost(cost = {}) {
  return (cost.wood || 0) + (cost.clay || 0) + (cost.iron || 0) + (cost.crop || 0);
}

const BUILDING_LABELS = {
  barracks: "Barracks",
  stable: "Stable",
  workshop: "Workshop",
  residence: "Residence / Palace",
  hero_mansion: "Hero's Mansion",
  natar: "Not trainable",
  nature: "Not trainable",
};

/**
 * @param {number | null | undefined} seconds
 * @returns {string | null}
 */
export function formatTrainingTime(seconds) {
  if (seconds == null || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

/**
 * @param {object} training
 */
export function normalizeTraining(training = {}) {
  const building = training.building || "barracks";
  const timeSeconds = training.timeSeconds ?? 0;
  return {
    building,
    buildingLabel: BUILDING_LABELS[building] || building,
    timeSeconds,
    timeFormatted: formatTrainingTime(timeSeconds),
    requirements: training.requirements || [],
  };
}

/**
 * Derived metrics for dashboard / balance tools.
 * @param {{ attack?: number, defenseInfantry?: number, defenseCavalry?: number, speed?: number, carry?: number }} stats
 * @param {number} cropUpkeep
 * @param {object} [training]
 * @param {number} [resourceCost]
 */
export function computeMetrics(stats = {}, cropUpkeep = 1, training = {}, resourceCost = 0) {
  const attack = stats.attack ?? 0;
  const defInf = stats.defenseInfantry ?? 0;
  const defCav = stats.defenseCavalry ?? 0;
  const speed = stats.speed ?? 0;
  const carry = stats.carry ?? 0;
  const upkeep = cropUpkeep || 1;
  const trainTimeSeconds = training?.timeSeconds ?? 0;

  return {
    offense: attack,
    defenseInfantry: defInf,
    defenseCavalry: defCav,
    defenseCombined: Math.round((defInf + defCav) / 2),
    defenseTotal: defInf + defCav,
    speed,
    carry,
    cropUpkeep: upkeep,
    attackPerCrop: upkeep > 0 ? Math.round((attack / upkeep) * 10) / 10 : attack,
    defensePerCrop:
      upkeep > 0 ? Math.round(((defInf + defCav) / upkeep) * 10) / 10 : defInf + defCav,
    trainTimeSeconds,
    trainTimeFormatted: training?.timeFormatted ?? formatTrainingTime(trainTimeSeconds),
    resourceCost: resourceCost || 0,
  };
}

/**
 * @param {Record<string, object>} baseUnits
 * @param {Array<{ ref: string, overrides?: object }>} troopRefs
 * @param {Array<{ slot: number, role: string, baseUnitId: string }>} rosterSlots
 * @param {string} [tribeId]
 * @param {{ tribes?: Record<string, Record<string, object>> }} [tribeTraining]
 * @param {{ defaults?: Record<string, string>, tribes?: Record<string, Record<string, string>> }} [logoData]
 */
export function resolveTroops(baseUnits, troopRefs, rosterSlots, tribeId, tribeTraining, logoData) {
  const trainingByRef = tribeId ? tribeTraining?.tribes?.[tribeId] : null;

  return troopRefs.map((entry, i) => {
    const base = baseUnits[entry.ref];
    if (!base) throw new Error(`Unknown unit ref: ${entry.ref}`);
    const merged = deepMerge(structuredClone(base), entry.overrides || {});
    const patch = trainingByRef?.[entry.ref];
    if (patch) {
      merged.training = deepMerge(/** @type {object} */ (merged.training) || {}, patch);
    }
    const slotMeta = rosterSlots[i] || {};
    const stats = /** @type {object} */ (merged.stats) || {};
    const cropUpkeep = /** @type {number} */ (merged.cropUpkeep) ?? 1;
    const cost = /** @type {object} */ (merged.cost) || {};
    const training = normalizeTraining(/** @type {object} */ (merged.training));
    const graphics = resolveUnitGraphics(
      tribeId,
      entry.ref,
      /** @type {object} */ (entry.overrides?.graphics) || {},
      /** @type {object} */ (base.graphics) || {},
      logoData
    );

    return {
      slot: slotMeta.slot ?? merged.slot,
      role: slotMeta.role ?? merged.role,
      ref: entry.ref,
      id: merged.id,
      name: merged.name?.en || merged.name || merged.id,
      category: merged.category,
      stats,
      cost,
      cropUpkeep,
      totalCost: totalCost(cost),
      training,
      graphics,
      metrics: computeMetrics(stats, cropUpkeep, training, totalCost(cost)),
    };
  });
}

/**
 * Tribe-level summary from resolved troops.
 * @param {ReturnType<typeof resolveTroops>} troops
 */
export function summarizeTribe(troops) {
  const combat = troops.filter((t) => !["settler", "chief"].includes(t.role));
  const max = (fn) => Math.max(0, ...combat.map(fn));
  const sum = (fn) => combat.reduce((a, t) => a + fn(t), 0);

  return {
    unitCount: troops.length,
    maxAttack: max((t) => t.metrics.offense),
    maxDefenseInfantry: max((t) => t.metrics.defenseInfantry),
    maxDefenseCavalry: max((t) => t.metrics.defenseCavalry),
    maxSpeed: max((t) => t.metrics.speed),
    maxCarry: max((t) => t.metrics.carry),
    avgAttack: Math.round(sum((t) => t.metrics.offense) / (combat.length || 1)),
    avgDefenseCombined: Math.round(
      sum((t) => t.metrics.defenseCombined) / (combat.length || 1)
    ),
    totalCropUpkeep: troops.reduce((a, t) => a + t.cropUpkeep, 0),
  };
}

/**
 * @param {object} tribeFile - parsed tribe JSON
 * @param {Record<string, object>} baseUnits
 * @param {object} roster
 * @param {{ tribes?: Record<string, Record<string, object>> }} [tribeTraining]
 * @param {{ defaults?: Record<string, string>, tribes?: Record<string, Record<string, string>> }} [logoData]
 */
export function resolveTribe(tribeFile, baseUnits, roster, tribeTraining, logoData) {
  const tribeId = tribeFile.tribe.id;
  const troops = resolveTroops(baseUnits, tribeFile.troops, roster.slots, tribeId, tribeTraining, logoData);
  const hero = tribeFile.hero
    ? {
        ...tribeFile.hero,
        name: tribeFile.hero.name?.en || tribeFile.hero.id,
        cost: tribeFile.hero.cost || {},
        training: normalizeTraining(tribeFile.hero.training),
        metrics: computeMetrics(
          tribeFile.hero.stats,
          tribeFile.hero.cropUpkeep,
          normalizeTraining(tribeFile.hero.training),
          totalCost(tribeFile.hero.cost)
        ),
        totalCost: totalCost(tribeFile.hero.cost),
      }
    : null;

  const banner =
    tribeFile.tribe.graphics?.banner || `tribes/${tribeId}/banner.png`;

  return {
    id: tribeId,
    name: tribeFile.tribe.name?.en || tribeFile.tribe.id,
    type: tribeFile.type || "playable",
    theme: tribeFile.tribe.theme,
    palette: tribeFile.palette,
    graphics: { banner },
    summary: summarizeTribe(troops),
    troops,
    hero,
  };
}

/**
 * Attach browser-ready asset URLs after merge.
 * @param {ReturnType<typeof resolveTribe>} tribe
 * @param {string} [assetBase="/assets"]
 */
export function attachAssetUrls(tribe, assetBase = "/assets") {
  for (const troop of tribe.troops) {
    troop.graphicsUrls = {
      icon: assetUrl(assetBase, troop.graphics.icon),
      sprite: assetUrl(assetBase, troop.graphics.sprite),
      logo: assetUrl(assetBase, troop.graphics.logo),
      baseIcon: assetUrl(assetBase, troop.graphics.baseIcon),
      baseSprite: assetUrl(assetBase, troop.graphics.baseSprite),
      baseLogo: assetUrl(assetBase, troop.graphics.baseLogo),
    };
  }
  tribe.graphicsUrls = {
    banner: assetUrl(assetBase, tribe.graphics.banner),
  };
  if (tribe.hero?.graphics) {
    tribe.hero.graphicsUrls = {
      icon: assetUrl(assetBase, tribe.hero.graphics.icon),
      sprite: assetUrl(assetBase, tribe.hero.graphics.sprite),
      portrait: assetUrl(assetBase, tribe.hero.graphics.portrait),
    };
  }
  return tribe;
}
