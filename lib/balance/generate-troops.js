/**
 * Turns a tribe identity (lib/balance/identities.js) into a full troop table.
 *
 * The pipeline is deliberately one-directional so that every number in the game
 * can be traced back to a design decision:
 *
 *   role shape  →  identity dials  →  stats
 *   stats       →  combat index    →  crop upkeep  →  resource cost  →  train time
 *
 * Cost is derived from power rather than authored next to it, which is what
 * stops a tribe from quietly being both stronger and cheaper. The only way to
 * make a unit cheaper here is to make it weaker, or to pay for it in crop.
 */

import {
  SLOT_ANCHORS,
  UTILITY_SHAPES,
  combatIndex,
} from "./anchors.js";
import { POWER_TIERS, TRIBE_IDENTITIES } from "./identities.js";
import {
  CAV_REFS,
  CENTERPIECE_AXIS,
  CENTERPIECE_LEAD,
  INF_REFS,
  STAT_CEILING,
  ROLE_SHAPES,
  liftToCenterpiece,
} from "./troop-roles.js";

/** @typedef {import("./anchors.js").Stats} Stats */

/** Tier 3 is the trained veteran of a family, tier 1 the levy. */
const INF_TIER = Object.freeze({ inf_t1: 0.92, inf_t2: 1, inf_t3: 1.1 });
/**
 * Each horse owns a column, so a player can say what it is for in one line:
 * the first outruns everything, the second hauls the most and is what a raid
 * is actually made of, and the third is the centerpiece that wins the fight.
 *
 * Splitting speed and carry between the first two is the whole point. When the
 * light horse held both crowns the middle one was quietly best at nothing —
 * slower and lighter than the scout-cavalry, weaker than the heavy — which is
 * a slot no one has a reason to train.
 */
const CAV_TIER = Object.freeze({
  cav_t1: { atk: 0.78, def: 0.84, speed: 1.18, carry: 0.92 },
  cav_t2: { atk: 0.96, def: 0.96, speed: 0.98, carry: 1.24 },
  cav_t3: { atk: 1.2, def: 1.16, speed: 0.95, carry: 0.85 },
});

const COMBAT_REFS = Object.freeze([...INF_REFS, "scout", ...CAV_REFS]);
const SIEGE_REFS = Object.freeze(["ram", "catapult"]);
export const ALL_REFS = Object.freeze([...COMBAT_REFS, ...SIEGE_REFS, "chief", "settler"]);

/** Chiefs cost the same everywhere; conquering is not where tribes differ. */
const CHIEF_COST = 140450;
const SETTLER_COST = 14500;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const roundTo = (n, step) => Math.round(n / step) * step;

/**
 * @param {Record<string, number>} mix
 * @param {Record<string, number> | undefined} bias
 * @returns {{ wood: number, clay: number, iron: number, crop: number }}
 */
function biasedMix(mix, bias) {
  const out = {};
  let sum = 0;
  for (const key of ["wood", "clay", "iron", "crop"]) {
    out[key] = mix[key] * (bias?.[key] ?? 1);
    sum += out[key];
  }
  for (const key of Object.keys(out)) out[key] /= sum;
  return out;
}

/**
 * @param {number} total
 * @param {Record<string, number>} mix
 * @param {number} step
 */
function splitCost(total, mix, step) {
  const cost = {};
  for (const key of ["wood", "clay", "iron", "crop"]) {
    cost[key] = Math.max(step, roundTo(total * mix[key], step));
  }
  return cost;
}

/**
 * Shape one combat slot from its role, before pricing.
 * @param {string} ref
 * @param {string} roleId
 * @param {import("./identities.js").TRIBE_IDENTITIES[string]} spec
 * @param {number} calibration
 */
function shapeStats(ref, roleId, spec, calibration) {
  const shape = ROLE_SHAPES[roleId];
  if (!shape) throw new Error(`${ref}: unknown role ${roleId}`);

  const dials = { ...spec.shape, ...(spec.slotShapes?.[ref] || {}) };
  const isCav = CAV_REFS.includes(ref);
  const tierPower = POWER_TIERS[spec.tier || "player"];
  const eliteness = spec.eliteness ?? 1;

  const atkDial = (isCav ? dials.cavAtk : dials.infAtk) ?? 1;
  const defDial = (isCav ? dials.cavDef : dials.infDef) ?? 1;
  const tier = isCav ? CAV_TIER[ref] : { atk: INF_TIER[ref] ?? 1, def: INF_TIER[ref] ?? 1, speed: 1, carry: 1 };

  // Eliteness and tier grow the unit; speed and carry are profile, not size.
  const power = eliteness * tierPower * calibration;
  const attack = shape.stats.attack * atkDial * tier.atk * power;
  const defInf = shape.stats.defenseInfantry * defDial * tier.def * power;
  const defCav = shape.stats.defenseCavalry * defDial * tier.def * power;
  const speed = shape.stats.speed * (dials.speed ?? 1) * tier.speed;
  const carry = shape.stats.carry * (dials.carry ?? 1) * tier.carry;

  return {
    attack: ref === "scout" ? 0 : clamp(Math.round(attack), 1, STAT_CEILING.attack),
    defenseInfantry: clamp(Math.round(defInf), 5, STAT_CEILING.defense),
    defenseCavalry: clamp(Math.round(defCav), 5, STAT_CEILING.defense),
    speed: clamp(Math.round(speed), 3, 22),
    carry: clamp(Math.round(carry), 0, 260),
  };
}

/**
 * Grow the heavy cavalry until it leads the roster by {@link CENTERPIECE_LEAD}.
 *
 * Only the combat stats move, and they move together, so the unit keeps the
 * shape its role gave it: a defensive top horse gets harder to kill rather
 * than turning into a hammer, and an offensive one just hits harder. Speed and
 * carry are profile rather than size and are left alone.
 *
 * Growing it also prices it, since cost is derived from power downstream —
 * which is what makes the centerpiece the tribe's most expensive unit instead
 * of merely its strongest.
 *
 * @param {Record<string, Stats>} stats every shaped combat slot
 * @param {import("./identities.js").TRIBE_IDENTITIES[string]} spec
 * @returns {Stats}
 */
function liftCenterpiece(stats, spec) {
  const rival = Math.max(
    ...COMBAT_REFS.filter((ref) => ref !== "cav_t3").map((ref) => combatIndex(stats[ref]))
  );
  const { stats: lifted } = liftToCenterpiece(
    stats.cav_t3,
    rival,
    spec.centerpiece ?? CENTERPIECE_LEAD,
    CENTERPIECE_AXIS[spec.slotRoles.cav_t3] ?? "both"
  );
  return {
    ...lifted,
    attack: lifted.attack ? clamp(lifted.attack, 1, STAT_CEILING.attack) : 0,
    defenseInfantry: clamp(lifted.defenseInfantry, 5, STAT_CEILING.defense),
    defenseCavalry: clamp(lifted.defenseCavalry, 5, STAT_CEILING.defense),
  };
}

/**
 * Rams, catapults, chiefs, and settlers: same identity dials, different job.
 * @param {string} ref
 * @param {import("./identities.js").TRIBE_IDENTITIES[string]} spec
 */
function shapeUtilityStats(ref, spec, calibration = 1) {
  const base = UTILITY_SHAPES[ref];
  const tierPower = POWER_TIERS[spec.tier || "player"];
  const siege = SIEGE_REFS.includes(ref) ? (spec.siege ?? 1) * calibration : 1;
  const scale = siege * tierPower;
  const out = {
    attack: Math.round(base.attack * scale),
    defenseInfantry: Math.round(base.defenseInfantry * scale),
    defenseCavalry: Math.round(base.defenseCavalry * scale),
    speed: base.speed,
    carry: base.carry,
  };
  if (ref === "settler") {
    out.attack = 0;
    out.defenseInfantry = base.defenseInfantry;
    out.defenseCavalry = base.defenseCavalry;
  }
  return out;
}

/**
 * Price a unit in the two currencies, then in the four resources.
 * @param {string} ref
 * @param {{ attack: number, defenseInfantry: number, defenseCavalry: number, speed: number, carry: number }} stats
 * @param {import("./identities.js").TRIBE_IDENTITIES[string]} spec
 */
function priceUnit(ref, stats, spec) {
  const anchor = SLOT_ANCHORS[ref];
  const ci = combatIndex(stats);
  const mix = biasedMix(anchor.mix, spec.mixBias);
  const noUpkeep = spec.tier === "wild";

  let cropUpkeep = 0;
  let resPressure = 1;
  if (!noUpkeep) {
    cropUpkeep = clamp(
      Math.round(ci / (anchor.ciPerCrop * (spec.cropPressure ?? 1))),
      anchor.minCrop ?? 1,
      anchor.maxCrop ?? 8
    );
    // Crop upkeep is a small integer bracket, so what a unit really costs in
    // population lands wherever rounding puts it. Resources then settle the
    // difference: a unit that came out cheap in crop pays more per point of
    // power in wood and iron, and vice versa. That is the whole fairness
    // mechanism — power always costs the same, only the currency mix moves.
    const realizedCrop = ci / (anchor.ciPerCrop * cropUpkeep);
    resPressure = clamp(1 / realizedCrop, 0.72, 1.38);
  }

  const total = (ci / (anchor.ciPerRes * resPressure)) * 1000;
  const step = total > 4000 ? 50 : total > 800 ? 10 : 5;
  const cost = splitCost(total, mix, step);
  const timeSeconds = Math.round(
    (anchor.time * Math.pow(total / anchor.res, 0.65) * (spec.trainBias ?? 1)) / 5
  ) * 5;

  return { cost, cropUpkeep, timeSeconds, ci };
}

/**
 * @param {string} ref
 * @param {import("./identities.js").TRIBE_IDENTITIES[string]} spec
 */
function priceExpansion(ref, stats, spec) {
  const anchor = SLOT_ANCHORS[ref];
  const mix = biasedMix(anchor.mix, spec.mixBias);
  const base = ref === "chief" ? CHIEF_COST : SETTLER_COST;
  const total = ref === "chief" ? base : Math.round(base * (spec.eliteness ?? 1));
  return {
    cost: splitCost(total, mix, ref === "chief" ? 50 : 25),
    cropUpkeep: spec.tier === "wild" ? 0 : ref === "chief" ? 4 : 1,
    timeSeconds: Math.round((anchor.time * (spec.trainBias ?? 1)) / 60) * 60,
    ci: combatIndex(stats),
  };
}

/**
 * Build one tribe's table. `calibration` is supplied by {@link buildAllTables}
 * so the roster stays anchored to the game's existing power level.
 *
 * @param {string} tribeId
 * @param {Record<string, number>} [calibration] per-slot multiplier
 */
export function buildTribeTable(tribeId, calibration = {}) {
  const spec = TRIBE_IDENTITIES[tribeId];
  if (!spec) throw new Error(`no identity spec for tribe ${tribeId}`);

  // Shape the whole roster first: the heavy cavalry is defined relative to the
  // rest of it, so it cannot be priced until the rest of it exists.
  /** @type {Record<string, Stats>} */
  const stats = {};
  for (const ref of ALL_REFS) {
    stats[ref] = COMBAT_REFS.includes(ref)
      ? shapeStats(ref, spec.slotRoles[ref], spec, calibration[ref] ?? 1)
      : shapeUtilityStats(ref, spec, calibration[ref] ?? 1);
  }
  stats.cav_t3 = liftCenterpiece(stats, spec);

  /** @type {Record<string, { role: string, stats: any, cost: any, cropUpkeep: number, timeSeconds: number, ci: number }>} */
  const troops = {};
  for (const ref of ALL_REFS) {
    const priced =
      ref === "chief" || ref === "settler"
        ? priceExpansion(ref, stats[ref], spec)
        : priceUnit(ref, stats[ref], spec);
    troops[ref] = {
      role: COMBAT_REFS.includes(ref) ? spec.slotRoles[ref] : ref,
      stats: stats[ref],
      ...priced,
    };
  }
  return troops;
}

/**
 * Build every tribe, then rescale the whole game so the average player roster
 * still lands on the anchor. Without this the identity dials all multiply in
 * the same direction and the game inflates a few percent every time someone
 * adds a tribe.
 *
 * The correction is one number for the army and one for siege rather than one
 * per slot: slot-level correction would fight the identities, pushing a tribe's
 * defensive guard cavalry back up toward whatever the offensive tribes put in
 * the same slot.
 *
 * @param {string[]} [tribeIds]
 */
export function buildAllTables(tribeIds = Object.keys(TRIBE_IDENTITIES)) {
  const playerIds = tribeIds.filter((id) => !TRIBE_IDENTITIES[id].tier);
  const anchorArmy = COMBAT_REFS.reduce((sum, ref) => sum + SLOT_ANCHORS[ref].ci, 0);
  const anchorSiege = SIEGE_REFS.reduce((sum, ref) => sum + SLOT_ANCHORS[ref].ci, 0);

  let calibration = {};
  for (let pass = 0; pass < 3; pass++) {
    const tables = Object.fromEntries(tribeIds.map((id) => [id, buildTribeTable(id, calibration)]));
    const mean = (refs) =>
      playerIds.reduce((sum, id) => sum + refs.reduce((s, ref) => s + tables[id][ref].ci, 0), 0) /
      Math.max(1, playerIds.length);
    const army = clamp(anchorArmy / mean(COMBAT_REFS), 0.75, 1.3);
    const siege = clamp(anchorSiege / mean(SIEGE_REFS), 0.75, 1.3);
    const next = {};
    for (const ref of COMBAT_REFS) next[ref] = (calibration[ref] ?? 1) * army;
    for (const ref of SIEGE_REFS) next[ref] = (calibration[ref] ?? 1) * siege;
    calibration = next;
  }

  return {
    calibration,
    tables: Object.fromEntries(tribeIds.map((id) => [id, buildTribeTable(id, calibration)])),
  };
}
