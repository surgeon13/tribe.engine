/**
 * Puts unit numbers on the five-point grid Travian itself uses.
 *
 * This is not a house style imposed on the game — it is measured from it. Of
 * the 80 published units in data/balance/travian-canon.json, every attack
 * value, every cost, and every carrying capacity outside the oasis animals is
 * a multiple of five, as is every defence value bar three strays. Players read
 * these tables constantly and compare them across tribes, and a roster of 37s
 * and 68s next to Travian's 35s and 70s reads as noise where theirs reads as
 * design.
 *
 * Speed is deliberately exempt, for the same reason: Travian's own speeds are
 * 3, 4, 6, 7, 9, 13, 16, 19. The scale is far too short to round — five would
 * be a third of a typical horse and would collapse the light, medium and heavy
 * distinction into two values. Crop upkeep (1–6) is exempt for the same
 * reason, and training times, which Travian leaves at arbitrary seconds.
 *
 * The generators quantize before pricing rather than after. Cost here is
 * derived from a unit's combat index, so rounding the stats afterwards would
 * leave every unit priced for a unit slightly different from the one shown.
 */

/** @typedef {import("./anchors.js").Stats} Stats */

/** The grid. Attack, defence, carry and every resource cost land on it. */
export const STAT_STEP = 5;

/**
 * Nearest point on the grid.
 * @param {number} n
 * @param {number} [step]
 */
export function toStep(n, step = STAT_STEP) {
  return Math.round(n / step) * step;
}

/**
 * The next point on the grid at or above `n`.
 * @param {number} n
 * @param {number} [step]
 */
export function stepUp(n, step = STAT_STEP) {
  return Math.ceil(n / step) * step;
}

/**
 * @param {number} n
 * @returns {boolean}
 */
export function onStep(n) {
  return Number.isFinite(n) && n % STAT_STEP === 0;
}

/**
 * A stat that exists is worth at least one step; a stat that does not stays at
 * zero. Rounding a 2-attack unit down to nothing would delete the difference
 * between it and a scout, and Travian's own floor is 5 rather than 1.
 * @param {number} n
 */
function quantizeStat(n) {
  const value = Number(n) || 0;
  if (value <= 0) return 0;
  return Math.max(STAT_STEP, toStep(value));
}

/**
 * @param {Stats} stats
 * @returns {Stats}
 */
export function quantizeStats(stats) {
  return {
    ...stats,
    attack: quantizeStat(stats.attack),
    defenseInfantry: quantizeStat(stats.defenseInfantry),
    defenseCavalry: quantizeStat(stats.defenseCavalry),
    // Left alone on purpose — see the note at the top of this file.
    speed: Math.round(Number(stats.speed) || 0),
    carry: quantizeStat(stats.carry),
  };
}

/**
 * @param {{ wood?: number, clay?: number, iron?: number, crop?: number }} cost
 */
export function quantizeCost(cost) {
  const out = {};
  for (const key of ["wood", "clay", "iron", "crop"]) {
    if (cost?.[key] == null) continue;
    out[key] = quantizeStat(cost[key]);
  }
  return out;
}

/**
 * The combat index, repeated here rather than imported so this module stays a
 * leaf that anything in the balance layer can depend on.
 * @param {Stats} stats
 */
function index(stats) {
  return (
    (stats.attack || 0) +
    0.5 * ((stats.defenseInfantry || 0) + (stats.defenseCavalry || 0)) +
    0.1 * (stats.speed || 0) +
    0.02 * (stats.carry || 0)
  );
}

/**
 * Add one step along a unit's growth axis, keeping the shape its role gave it.
 * Returns null when there is nowhere left to grow.
 *
 * @param {Stats} stats
 * @param {'attack'|'defense'} side
 * @param {number} ceiling
 * @returns {Stats | null}
 */
function bump(stats, side, ceiling) {
  if (side === "attack") {
    if (!stats.attack || stats.attack >= ceiling) return null;
    return { ...stats, attack: stats.attack + STAT_STEP };
  }
  // Grow the side the unit already leans on, so a wall that stops infantry
  // stays a wall that stops infantry. Only spill over when that side is full.
  const order =
    stats.defenseInfantry >= stats.defenseCavalry
      ? ["defenseInfantry", "defenseCavalry"]
      : ["defenseCavalry", "defenseInfantry"];
  const key = order.find((k) => stats[k] < ceiling);
  return key ? { ...stats, [key]: stats[key] + STAT_STEP } : null;
}

/**
 * Round a centerpiece onto the grid without letting the rounding eat the lead
 * it was just grown for.
 *
 * Quantizing costs a unit up to half a step on each stat, which is small but
 * lands on the one unit in the roster whose whole job is defined by a margin:
 * the heavy cavalry has to out-fight everything else by a stated factor, and
 * the build fails if it merely ties. So the rounding is checked rather than
 * trusted, and topped back up a step at a time when it comes up short.
 *
 * @param {Stats} unit already-grown, unrounded stats
 * @param {number} floorIndex combat index the unit must reach
 * @param {'attack'|'defense'|'both'} axis
 * @param {number} ceiling
 * @returns {Stats}
 */
export function settleCenterpiece(unit, floorIndex, axis, ceiling) {
  let stats = quantizeStats(unit);
  // A hammer grows its attack and a wall its defence; the armoured knight whose
  // job is to fight on both sides of the wall alternates, so it keeps doing both.
  const hasAttack = stats.attack > 0;
  const preferred =
    !hasAttack ? ["defense"] : axis === "both" ? ["attack", "defense"] : axis === "attack" ? ["attack"] : ["defense"];

  // Bounded because a unit pinned at the ceiling on every axis cannot grow.
  // That is a real outcome, and the balance gate reports it rather than hanging.
  for (let i = 0; i < 500 && index(stats) < floorIndex; i++) {
    const order = [preferred[i % preferred.length], "attack", "defense"];
    const next = order.reduce((found, side) => found || bump(stats, side, ceiling), null);
    if (!next) break;
    stats = next;
  }
  return stats;
}
