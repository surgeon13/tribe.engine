/**
 * Per-slot balance anchors, measured from the six Travian-canonical cores
 * (Romans, Teutons, Gauls, Egyptians, Huns, Spartans) before the identity pass.
 *
 * These are frozen constants rather than something recomputed from the current
 * tribe files on purpose: if the anchors were derived from the tribes they
 * anchor, every rebuild would drift the whole game a little further from the
 * Travian feel it started with.
 *
 * `ci` and `res` are the median unit's combat index and total cost; `ciPerRes`
 * is combat index per 1000 resources and `ciPerCrop` is combat index
 * per point of crop upkeep — the two currencies a tribe actually pays in.
 * Slots deliberately differ: infantry buys more index per resource than cavalry,
 * which pays for speed, carry, and concentration. `minCrop` keeps a slot from
 * rounding down into an upkeep bracket its job does not belong in — a horse is
 * never a one-crop unit, however cheap the tribe makes it, and `maxCrop` keeps
 * the table readable — upkeep is a bracket, not a continuous stat. Infantry is
 * pinned to a single point of crop the way Travian does it, so an elite footman
 * pays for its quality in resources rather than in population.
 */

/** @typedef {{ attack: number, defenseInfantry: number, defenseCavalry: number, speed: number, carry: number }} Stats */

/**
 * Diagnostic combat index from data/balance/BALANCE.md.
 * @param {Stats} stats
 * @returns {number}
 */
export function combatIndex(stats) {
  return (
    (Number(stats.attack) || 0) +
    0.5 * ((Number(stats.defenseInfantry) || 0) + (Number(stats.defenseCavalry) || 0)) +
    0.1 * (Number(stats.speed) || 0) +
    0.02 * (Number(stats.carry) || 0)
  );
}

/**
 * @param {{ wood?: number, clay?: number, iron?: number, crop?: number }} cost
 * @returns {number}
 */
export function totalCost(cost) {
  if (!cost) return 0;
  return (
    (Number(cost.wood) || 0) +
    (Number(cost.clay) || 0) +
    (Number(cost.iron) || 0) +
    (Number(cost.crop) || 0)
  );
}

/**
 * @typedef {object} SlotAnchor
 * @property {number} ci Median combat index for the slot.
 * @property {number} res Median total cost for the slot.
 * @property {number} ciPerRes Combat index per 1000 resources.
 * @property {number} ciPerCrop Combat index per point of crop upkeep.
 * @property {number} crop Median crop upkeep.
 * @property {number} time Median training time in seconds.
 * @property {{ wood: number, clay: number, iron: number, crop: number }} mix Cost split.
 * @property {number} [minCrop] Floor on generated upkeep.
 * @property {number} [maxCrop] Ceiling on generated upkeep.
 */

/** @type {Record<string, SlotAnchor>} */
export const SLOT_ANCHORS = Object.freeze({
  inf_t1: {
    maxCrop: 1,
    ci: 66.5,
    res: 333,
    ciPerRes: 214,
    ciPerCrop: 66,
    crop: 1,
    time: 925,
    mix: { wood: 0.31, clay: 0.29, iron: 0.21, crop: 0.19 },
  },
  inf_t2: {
    maxCrop: 1,
    ci: 80,
    res: 450,
    ciPerRes: 176,
    ciPerCrop: 80,
    crop: 1,
    time: 1320,
    mix: { wood: 0.27, clay: 0.28, iron: 0.34, crop: 0.11 },
  },
  inf_t3: {
    maxCrop: 1,
    ci: 96.6,
    res: 520,
    ciPerRes: 190,
    ciPerCrop: 89,
    crop: 1,
    time: 1250,
    mix: { wood: 0.28, clay: 0.27, iron: 0.34, crop: 0.11 },
  },
  scout: {
    maxCrop: 2,
    ci: 16.6,
    res: 395,
    ciPerRes: 43,
    ciPerCrop: 8.4,
    crop: 1,
    time: 1360,
    mix: { wood: 0.39, clay: 0.37, iron: 0.12, crop: 0.12 },
  },
  cav_t1: {
    maxCrop: 3,
    minCrop: 2,
    ci: 139.1,
    res: 1090,
    ciPerRes: 128,
    ciPerCrop: 65,
    crop: 2,
    time: 1680,
    mix: { wood: 0.35, clay: 0.31, iron: 0.25, crop: 0.09 },
  },
  cav_t2: {
    maxCrop: 4,
    minCrop: 2,
    ci: 231.2,
    res: 1663,
    ciPerRes: 139,
    ciPerCrop: 77,
    crop: 3,
    time: 2100,
    mix: { wood: 0.29, clay: 0.31, iron: 0.31, crop: 0.09 },
  },
  cav_t3: {
    maxCrop: 4,
    minCrop: 2,
    ci: 223.9,
    res: 1660,
    ciPerRes: 138,
    ciPerCrop: 72,
    crop: 3,
    time: 2110,
    mix: { wood: 0.3, clay: 0.32, iron: 0.3, crop: 0.08 },
  },
  ram: {
    maxCrop: 3,
    minCrop: 3,
    ci: 117.9,
    res: 1830,
    ciPerRes: 62,
    ciPerCrop: 39,
    crop: 3,
    time: 4600,
    mix: { wood: 0.5, clay: 0.2, iron: 0.26, crop: 0.04 },
  },
  catapult: {
    maxCrop: 6,
    minCrop: 5,
    ci: 97.8,
    res: 3060,
    ciPerRes: 33,
    ciPerCrop: 16,
    crop: 6,
    time: 9000,
    mix: { wood: 0.31, clay: 0.46, iron: 0.2, crop: 0.03 },
  },
  chief: {
    ci: 90.4,
    res: 140450,
    ciPerRes: 0.64,
    ciPerCrop: 23,
    crop: 4,
    time: 90720,
    mix: { wood: 0.22, clay: 0.19, iron: 0.32, crop: 0.27 },
  },
  settler: {
    ci: 140.5,
    res: 14500,
    ciPerRes: 9.7,
    ciPerCrop: 140,
    crop: 1,
    time: 26920,
    mix: { wood: 0.24, clay: 0.31, iron: 0.16, crop: 0.29 },
  },
});

/**
 * What one point of crop upkeep is worth in resources, read off the anchor's
 * own two rates for the heavy cavalry slot.
 *
 * A unit is bought twice: once at the marketplace and once, forever, out of
 * the village's grain. Comparing two units on resources alone misreads the one
 * that rounded up into a higher upkeep bracket, because the model hands it a
 * resource discount in exchange — so it looks cheap while costing more.
 */
export const CROP_IN_RESOURCES = Math.round(
  (SLOT_ANCHORS.cav_t3.ciPerCrop / SLOT_ANCHORS.cav_t3.ciPerRes) * 1000
);

/**
 * Total price of a unit in both currencies, expressed in resources.
 * @param {{ wood?: number, clay?: number, iron?: number, crop?: number }} cost
 * @param {number} cropUpkeep
 */
export function pricePaid(cost, cropUpkeep) {
  return totalCost(cost) + (Number(cropUpkeep) || 0) * CROP_IN_RESOURCES;
}

/** Slots the fairness gate scores; chief and settler are expansion, not army. */
export const SCORED_REFS = Object.freeze([
  "inf_t1",
  "inf_t2",
  "inf_t3",
  "scout",
  "cav_t1",
  "cav_t2",
  "cav_t3",
  "ram",
  "catapult",
]);

/**
 * Baseline stats for slots that have no combat role: rams and catapults break
 * walls and buildings, chiefs and settlers take villages.
 * @type {Record<string, Stats>}
 */
export const UTILITY_SHAPES = Object.freeze({
  ram: { attack: 65, defenseInfantry: 30, defenseCavalry: 75, speed: 4, carry: 0 },
  catapult: { attack: 55, defenseInfantry: 60, defenseCavalry: 10, speed: 3, carry: 0 },
  chief: { attack: 40, defenseInfantry: 60, defenseCavalry: 40, speed: 4, carry: 0 },
  settler: { attack: 0, defenseInfantry: 80, defenseCavalry: 80, speed: 5, carry: 3000 },
});
