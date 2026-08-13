/**
 * Travian smithy upgrades.
 *
 * The smithy raises a unit's attack and both defence values. Travian's own
 * formula, unchanged since T4 and the one Kirilloid and the battle simulators
 * implement:
 *
 *   improved = base + (base + 300 * upkeep / 7) * (1.007^level - 1)
 *
 * where `upkeep` is the unit's base crop consumption. The published worked
 * example is a clubswinger — 40 attack, 1 crop — at level 20:
 *
 *   40 + (40 + 300/7) * (1.007^20 - 1) = 52.4048
 *
 * The upkeep term is what makes this interesting rather than a flat multiplier.
 * A cheap one-crop unit carries 300/7 ≈ 42.9 of free base to be multiplied,
 * which is more than its own attack, so it gains over 30% at level 20; a
 * three-crop knight with 150 attack gains under 28%. Small units benefit most
 * in relative terms, which is why the upgrade order in a real village is rarely
 * the same as the strength order.
 *
 * Sources: Travian: Legends support ("The effect strength depends on the unit's
 * crop consumption"), the Binary-Tools combat-system wiki, and the Unofficial
 * Travian Community's writeup of the combat maths.
 */

import { computeMetricsClient, summarizeTribeClient } from "./tribe-edit.js";

export const SMITHY_MAX_LEVEL = 20;

/** Only weapons and armour improve — not legs, saddlebags, or the treasury. */
const UPGRADED_STATS = ["attack", "defenseInfantry", "defenseCavalry"];

/**
 * @param {number} base
 * @param {number} cropUpkeep base crop consumption, before troughs or artefacts
 * @param {number} level 0–20
 */
export function smithyStat(base, cropUpkeep, level) {
  const value = Number(base) || 0;
  const lvl = Number(level) || 0;
  // A unit with no attack is not given one by sharpening its sword. Travian
  // scores scouts on hidden scouting values instead, and their listed 0 stays 0.
  if (lvl <= 0 || value <= 0) return value;
  const upkeep = Number(cropUpkeep) || 0;
  return value + (value + (300 * upkeep) / 7) * (Math.pow(1.007, lvl) - 1);
}

/**
 * A copy of the troop with upgraded stats and metrics re-derived from them.
 *
 * Travian fights with the fractional value; we round for display because every
 * other number in these tables is whole and a column of 52.4048 buys precision
 * nobody is reading.
 *
 * @param {object} troop
 * @param {number} level
 */
export function upgradeTroop(troop, level) {
  if (!level || !troop?.stats) return troop;
  const upkeep = troop.cropUpkeep ?? 1;
  const stats = { ...troop.stats };
  for (const key of UPGRADED_STATS) {
    stats[key] = Math.round(smithyStat(troop.stats[key], upkeep, level));
  }
  return {
    ...troop,
    stats,
    metrics: computeMetricsClient(stats, upkeep, troop.training, troop.totalCost),
    smithyLevel: level,
  };
}

/**
 * @param {object} tribe
 * @param {number} level
 */
export function upgradeTribe(tribe, level) {
  if (!level) return tribe;
  const troops = (tribe.troops || []).map((t) => upgradeTroop(t, level));
  return {
    ...tribe,
    troops,
    // The tribe summary is baked into the data file, so it has to be re-derived
    // or the headline "Max ATK" keeps quoting base values under an upgraded table.
    summary: summarizeTribeClient(troops),
    smithyLevel: level,
  };
}

/**
 * The spread of relative gains across a set of units, for describing a level.
 *
 * There is no single "+x%" to quote — the gain depends on each unit's upkeep
 * against its own stats — so the honest summary is the range.
 *
 * @param {object[]} tribes
 * @param {number} level
 * @returns {{ min: number, max: number } | null}
 */
export function smithyGainRange(tribes, level) {
  if (!level) return null;
  let min = Infinity;
  let max = 0;
  for (const tribe of tribes) {
    for (const troop of tribe.troops || []) {
      const upkeep = troop.cropUpkeep ?? 1;
      for (const key of UPGRADED_STATS) {
        const base = Number(troop.stats?.[key]) || 0;
        if (base <= 0) continue;
        const gain = smithyStat(base, upkeep, level) / base - 1;
        if (gain < min) min = gain;
        if (gain > max) max = gain;
      }
    }
  }
  return Number.isFinite(min) ? { min, max } : null;
}
