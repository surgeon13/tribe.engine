/**
 * Travian-style troop role classification, archetype slot maps, and shaping.
 * Doctrine: data/balance/TROOP_ROLES.md
 */

/** @typedef {{ attack: number, defenseInfantry: number, defenseCavalry: number, speed: number, carry: number }} Stats */
/** @typedef {{ wood: number, clay: number, iron: number, crop: number }} Cost */

export const COMBAT_REFS = Object.freeze([
  "inf_t1",
  "inf_t2",
  "inf_t3",
  "scout",
  "cav_t1",
  "cav_t2",
  "cav_t3",
]);

export const CAV_REFS = Object.freeze(["cav_t1", "cav_t2", "cav_t3"]);
export const INF_REFS = Object.freeze(["inf_t1", "inf_t2", "inf_t3"]);

/** NPC / non-player rosters skipped by default audits. */
export const NPC_TRIBE_IDS = Object.freeze(["natar", "nature"]);

/**
 * Canonical Travian-like combat shapes (absolute targets before archetype scale).
 * Costs stay on the generator BASE_TROOPS unless roleCostMul adjusts them.
 * @type {Record<string, { stats: Stats, roleCostMul?: number, notes: string }>}
 */
export const ROLE_SHAPES = Object.freeze({
  line: {
    notes: "General line infantry — mild hybrid, Legionnaire / Hoplite family",
    stats: { attack: 38, defenseInfantry: 38, defenseCavalry: 45, speed: 6, carry: 45 },
    roleCostMul: 1,
  },
  off_inf: {
    notes: "Offensive infantry — Imperian / Axeman / Swordsman",
    stats: { attack: 68, defenseInfantry: 38, defenseCavalry: 28, speed: 7, carry: 50 },
    roleCostMul: 1.05,
  },
  def_inf: {
    notes: "Standing anti-infantry — Praetorian / Shieldsman",
    stats: { attack: 30, defenseInfantry: 68, defenseCavalry: 35, speed: 5, carry: 22 },
    roleCostMul: 0.95,
  },
  def_cav: {
    notes: "Standing anti-cavalry spears — Spearman / Phalanx bias",
    stats: { attack: 12, defenseInfantry: 35, defenseCavalry: 62, speed: 7, carry: 40 },
    roleCostMul: 0.85,
  },
  cav_off: {
    notes: "Offensive cavalry hammer — EI / TK / Thunder",
    stats: { attack: 145, defenseInfantry: 60, defenseCavalry: 55, speed: 13, carry: 85 },
    roleCostMul: 1.05,
  },
  cav_def: {
    notes: "Defensive cavalry — Paladin / Druidrider (basic atk, high carry)",
    stats: { attack: 55, defenseInfantry: 105, defenseCavalry: 45, speed: 11, carry: 110 },
    roleCostMul: 1,
  },
  cav_off_armored: {
    notes: "Off knight with high defense — Haeduan (defense-specialist tribes only)",
    stats: { attack: 140, defenseInfantry: 60, defenseCavalry: 155, speed: 13, carry: 65 },
    roleCostMul: 1.12,
  },
  scout: {
    notes: "Scout — no attack, light defense, high speed",
    stats: { attack: 0, defenseInfantry: 20, defenseCavalry: 10, speed: 16, carry: 0 },
    roleCostMul: 1,
  },
});

/**
 * Per-archetype combat slot roles.
 * @type {Record<string, Record<string, string>>}
 */
export const ARCHETYPE_SLOT_ROLES = Object.freeze({
  balanced: {
    inf_t1: "line",
    inf_t2: "def_inf",
    inf_t3: "off_inf",
    scout: "scout",
    cav_t1: "cav_def",
    cav_t2: "cav_off",
    cav_t3: "cav_off",
  },
  defensive: {
    inf_t1: "def_cav",
    inf_t2: "def_inf",
    inf_t3: "off_inf",
    scout: "scout",
    cav_t1: "cav_def",
    cav_t2: "cav_off_armored",
    cav_t3: "cav_def",
  },
  infantry: {
    inf_t1: "def_cav",
    inf_t2: "def_inf",
    inf_t3: "off_inf",
    scout: "scout",
    cav_t1: "cav_def",
    cav_t2: "cav_off",
    cav_t3: "cav_def",
  },
  cavalry: {
    inf_t1: "def_cav",
    inf_t2: "line",
    inf_t3: "off_inf",
    scout: "scout",
    cav_t1: "cav_off",
    cav_t2: "cav_off",
    cav_t3: "cav_off",
  },
  raider: {
    inf_t1: "off_inf",
    inf_t2: "def_cav",
    inf_t3: "off_inf",
    scout: "scout",
    cav_t1: "cav_off",
    cav_t2: "cav_off",
    cav_t3: "cav_off",
  },
  elite: {
    inf_t1: "line",
    inf_t2: "def_inf",
    inf_t3: "off_inf",
    scout: "scout",
    cav_t1: "cav_off",
    cav_t2: "cav_off",
    cav_t3: "cav_off",
  },
});

/** Cavalry tier intensity vs the shared cav_* shape (t1 lighter / faster, t3 peak). */
const CAV_TIER = Object.freeze({
  cav_t1: { atk: 0.82, def: 0.88, speed: 1.08, carry: 1.05 },
  cav_t2: { atk: 0.98, def: 0.98, speed: 0.96, carry: 0.95 },
  cav_t3: { atk: 1.2, def: 1.16, speed: 1.0, carry: 0.9 },
});

/**
 * How far a tribe's heavy cavalry has to out-fight its next best army unit.
 *
 * This is a floor the generators enforce rather than something the tier dials
 * are trusted to produce, because they cannot: a tier multiplier is a fraction
 * of the gap between one role and another, so a tribe whose top horse defends
 * (a Paladin line) lands behind its own tier-2 hammer no matter how the tier
 * is tuned. That is what the roster used to look like — most tribes led by
 * their heavy cavalry, five led by whatever happened to sit in slot 6, and the
 * gap papered over with a bespoke multiplier per tribe.
 *
 * 1.4 is the low end of Travian's own range: an Equites Caesaris is about 1.5x
 * an Equites Imperatoris, a Haeduan about 2x a Theutates Thunder. Tribes may
 * exceed it — a cavalry tribe should — but none may fall under it.
 */
export const CENTERPIECE_LEAD = 1.4;

/**
 * Which way a centerpiece grows. A hammer that also out-defends the tribe's
 * wall leaves the wall with no reason to exist, so the growth goes into the
 * axis the unit's role is already about and the other axis is left alone.
 * Armored off-cavalry (the Haeduan) is the exception that grows both, because
 * fighting on both sides of the wall is the whole point of it.
 * @type {Record<string, 'attack'|'defense'|'both'>}
 */
export const CENTERPIECE_AXIS = Object.freeze({
  cav_off: "attack",
  cav_def: "defense",
  cav_off_armored: "both",
});

/**
 * Grow the tier-3 horse until it leads the roster, along the axis its role is
 * built for: a hammer hits harder, a guard gets harder to kill. Speed and
 * carry are profile rather than size and stay put.
 *
 * The caller supplies the index to beat because the two generators measure
 * their rosters differently; the growth rule is the part worth sharing.
 *
 * @param {Stats} unit the shaped cav_t3
 * @param {number} rivalIndex combat index of the best other army unit
 * @param {number} [lead]
 * @param {'attack'|'defense'|'both'} [axis]
 * @returns {{ stats: Stats, factor: number }} factor is the power ratio, for pricing
 */
export function liftToCenterpiece(unit, rivalIndex, lead = CENTERPIECE_LEAD, axis = "both") {
  const fixed = 0.1 * (unit.speed || 0) + 0.02 * (unit.carry || 0);
  const attack = unit.attack || 0;
  const defense = 0.5 * ((unit.defenseInfantry || 0) + (unit.defenseCavalry || 0));
  const power = attack + defense;
  const target = rivalIndex * lead - fixed;
  if (!(power > 0) || target <= power) return { stats: unit, factor: 1 };

  // Fall back to growing both when the chosen axis is not there to grow.
  const side = axis === "attack" && !attack ? "defense" : axis === "defense" && !defense ? "attack" : axis;
  const grow = (part, gain) => (part > 0 ? (part + gain) / part : 1);
  const gain = target - power;
  const atkMul = side === "defense" ? 1 : side === "attack" ? grow(attack, gain) : target / power;
  const defMul = side === "attack" ? 1 : side === "defense" ? grow(defense, gain) : target / power;

  return {
    stats: {
      ...unit,
      attack: attack ? Math.round(attack * atkMul) : 0,
      defenseInfantry: Math.round(unit.defenseInfantry * defMul),
      defenseCavalry: Math.round(unit.defenseCavalry * defMul),
    },
    factor: target / power,
  };
}

const OFF_RATIO = 1.15;
const DEF_RATIO = 1.15;

/**
 * @param {Partial<Stats>|null|undefined} stats
 * @returns {'off'|'def_inf'|'def_cav'|'def'|'hybrid'|'scout'|'utility'}
 */
export function classifyOrientation(stats) {
  if (!stats) return "hybrid";
  const a = Number(stats.attack) || 0;
  const di = Number(stats.defenseInfantry) || 0;
  const dc = Number(stats.defenseCavalry) || 0;
  if (a === 0 && (di > 0 || dc > 0)) {
    if (di >= dc * DEF_RATIO) return "def_inf";
    if (dc >= di * DEF_RATIO) return "def_cav";
    return "scout";
  }
  const peakDef = Math.max(di, dc);
  if (a >= peakDef * OFF_RATIO) return "off";
  if (di >= a * DEF_RATIO && di >= dc * DEF_RATIO) return "def_inf";
  if (dc >= a * DEF_RATIO && dc >= di * DEF_RATIO) return "def_cav";
  if (peakDef >= a * DEF_RATIO) return "def";
  return "hybrid";
}

/**
 * Cavalry design class used by audits.
 * @param {Partial<Stats>} stats
 * @param {{ allowArmoredOff?: boolean }} [opts]
 * @returns {'cav_off'|'cav_def'|'cav_off_armored'|'hybrid'}
 */
export function classifyCavalryRole(stats, opts = {}) {
  const a = Number(stats.attack) || 0;
  const di = Number(stats.defenseInfantry) || 0;
  const dc = Number(stats.defenseCavalry) || 0;
  const peakDef = Math.max(di, dc);

  // Haeduan-like first: strong attack AND a strong defense axis (defense tribes)
  const strongOff = a >= 120;
  const strongDef = peakDef >= 100;
  if (opts.allowArmoredOff && strongOff && strongDef) return "cav_off_armored";

  const orient = classifyOrientation(stats);
  if (orient === "off") return "cav_off";
  if (orient === "def_inf" || orient === "def_cav" || orient === "def") return "cav_def";

  // Soft off: attack leads but not by OFF_RATIO — still treat as off if attack is clearly top
  if (a >= peakDef && a >= 90) return "cav_off";
  // Soft def: defense leads
  if (peakDef >= a && peakDef >= 70) return "cav_def";

  return "hybrid";
}

/**
 * @param {string} archetypeId
 * @returns {boolean}
 */
export function archetypeAllowsArmoredOffCav(archetypeId) {
  return archetypeId === "defensive" || archetypeId === "infantry";
}

/**
 * Infer whether a hand-authored tribe plays like a defense specialist.
 * @param {{ archetype?: string, theme?: string, troops?: Array<{ ref?: string, stats?: Stats, overrides?: { stats?: Stats } }> }} tribe
 */
export function tribeAllowsArmoredOffCav(tribe) {
  const arch = String(tribe.archetype || "").toLowerCase();
  if (archetypeAllowsArmoredOffCav(arch)) return true;
  const theme = String(tribe.theme || "").toLowerCase();
  if (/\b(pure offense|weak defense|raid-focused|glass.?cannon|aggress)\b/.test(theme)) {
    return false;
  }
  if (
    /\b(defensive|solid defense|strong defense|infantry wall|phalanx|shield wall)\b/.test(theme)
  ) {
    return true;
  }

  // Majority of infantry oriented to defense → defense specialist
  const troops = tribe.troops || [];
  let defCount = 0;
  let infCount = 0;
  for (const t of troops) {
    const ref = t.ref || t.id;
    if (!INF_REFS.includes(ref)) continue;
    infCount += 1;
    const stats = t.stats || t.overrides?.stats;
    const o = classifyOrientation(stats);
    if (o === "def_inf" || o === "def_cav" || o === "def") defCount += 1;
  }
  return infCount > 0 && defCount / infCount >= 0.5;
}

function clampStat(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function costSum(cost) {
  if (!cost) return 0;
  return (
    (Number(cost.wood) || 0) +
    (Number(cost.clay) || 0) +
    (Number(cost.iron) || 0) +
    (Number(cost.crop) || 0)
  );
}

/**
 * Shape a combat slot toward its role, then apply archetype intensity scales.
 * Non-combat refs (ram/catapult/chief/settler) return null — caller keeps baseline.
 *
 * @param {string} ref
 * @param {{ stats: Stats, cost: Cost, cropUpkeep: number }} base
 * @param {string} roleId
 * @param {{ infAtk: number, infDef: number, cavAtk: number, cavDef: number, speed: number, cost: number }} scale
 */
export function shapeTroopForRole(ref, base, roleId, scale) {
  const shape = ROLE_SHAPES[roleId];
  if (!shape) return null;

  const isInf = INF_REFS.includes(ref) || ref === "scout";
  const isCav = CAV_REFS.includes(ref);
  const atkMul = isInf ? scale.infAtk : isCav ? scale.cavAtk : 1;
  const defMul = isInf ? scale.infDef : isCav ? scale.cavDef : 1;
  const tier = CAV_TIER[ref] || { atk: 1, def: 1, speed: 1, carry: 1 };

  let attack = shape.stats.attack * atkMul * (isCav ? tier.atk : 1);
  let defenseInfantry = shape.stats.defenseInfantry * defMul * (isCav ? tier.def : 1);
  let defenseCavalry = shape.stats.defenseCavalry * defMul * (isCav ? tier.def : 1);
  let speed = shape.stats.speed * scale.speed * (isCav ? tier.speed : 1);
  let carry = shape.stats.carry * (isCav ? tier.carry : 1);

  // Raider off-cav: push carry up so horses raid instead of idle as walls
  if (roleId === "cav_off" && scale.cost < 1) {
    carry *= 1.08;
  }

  const stats = {
    attack: ref === "scout" ? 0 : clampStat(attack, 0, 260),
    defenseInfantry: clampStat(defenseInfantry, 5, 200),
    defenseCavalry: clampStat(defenseCavalry, 5, 200),
    speed: clampStat(speed, 3, 22),
    carry: clampStat(carry, 0, 200),
  };

  const costMul = scale.cost * (shape.roleCostMul ?? 1);
  const cost = {};
  for (const k of ["wood", "clay", "iron", "crop"]) {
    cost[k] = Math.max(0, Math.round(base.cost[k] * costMul));
  }

  return { stats, cost, cropUpkeep: base.cropUpkeep, roleId };
}

/**
 * @param {string} archetypeId
 * @returns {Record<string, string>}
 */
export function slotRolesForArchetype(archetypeId) {
  return ARCHETYPE_SLOT_ROLES[archetypeId] || ARCHETYPE_SLOT_ROLES.balanced;
}

/**
 * Audit one resolved tribe (dashboard or file with troops[].ref + stats).
 * @param {{ id: string, name?: string|Record<string,string>, theme?: string, archetype?: string, troops: Array<{ ref?: string, id?: string, name?: any, stats?: Stats, cost?: Cost, overrides?: any }> }} tribe
 * @param {{ strict?: boolean }} [opts]
 */
export function auditTribeRoles(tribe, opts = {}) {
  const strict = Boolean(opts.strict);
  const id = tribe.id;
  const issues = [];
  const warnings = [];

  if (NPC_TRIBE_IDS.includes(id)) {
    return { id, skipped: true, reason: "npc", issues, warnings, units: [] };
  }

  const allowArmored = tribeAllowsArmoredOffCav(tribe);
  const units = [];

  /** @type {Array<{ ref: string, stats: Stats, cost: Cost, name: string }>} */
  const resolved = [];
  for (const t of tribe.troops || []) {
    const ref = t.ref || t.id || t.baseUnitId;
    if (!ref) continue;
    const stats = t.stats || t.overrides?.stats;
    if (!stats) continue;
    const cost = t.cost || t.overrides?.cost || {};
    const name =
      (typeof t.name === "string" ? t.name : t.name?.en) ||
      t.overrides?.name?.en ||
      ref;
    resolved.push({ ref, stats, cost, name });
  }

  const byRef = Object.fromEntries(resolved.map((u) => [u.ref, u]));

  for (const u of resolved) {
    const orient = classifyOrientation(u.stats);
    let cavRole = null;
    if (CAV_REFS.includes(u.ref)) {
      cavRole = classifyCavalryRole(u.stats, { allowArmoredOff: allowArmored });
    }
    units.push({
      ref: u.ref,
      name: u.name,
      orientation: orient,
      cavRole,
      stats: u.stats,
    });

    if (CAV_REFS.includes(u.ref) && cavRole === "hybrid") {
      issues.push({
        code: "cav_hybrid",
        ref: u.ref,
        message: `${u.name} (${u.ref}) is hybrid cavalry — make it clearly off or def (or off+armored on a defense tribe).`,
      });
    }
    if (CAV_REFS.includes(u.ref) && cavRole === "cav_off_armored" && !allowArmored) {
      issues.push({
        code: "cav_armored_off_forbidden",
        ref: u.ref,
        message: `${u.name} looks like off+armored cavalry, but tribe is not a defense specialist.`,
      });
    }
  }

  const standingInf = resolved.filter((u) => {
    if (!INF_REFS.includes(u.ref)) return false;
    const o = classifyOrientation(u.stats);
    return o === "def_inf" || o === "def_cav" || o === "def";
  });

  const offInfCount = resolved.filter((u) => {
    if (!INF_REFS.includes(u.ref)) return false;
    return classifyOrientation(u.stats) === "off";
  }).length;
  const infTotal = resolved.filter((u) => INF_REFS.includes(u.ref)).length;
  const theme = String(tribe.theme || "").toLowerCase();
  const offensiveIdentity =
    String(tribe.archetype || "").toLowerCase() === "raider" ||
    String(tribe.archetype || "").toLowerCase() === "cavalry" ||
    /\braid|aggress|offense|offenc|hammer|steppe\b/.test(theme) ||
    (infTotal > 0 && offInfCount / infTotal >= 0.5);

  if (standingInf.length === 0) {
    const msg = "No standing defensive infantry (Praetorian / Spearman pattern).";
    if (offensiveIdentity) {
      warnings.push({
        code: "no_standing_inf_def",
        message: `${msg} Acceptable for offense/raider identities — they buy power with soft walls.`,
      });
    } else {
      issues.push({ code: "no_standing_inf_def", message: msg });
    }
  }

  const defCavs = resolved.filter(
    (u) => CAV_REFS.includes(u.ref) && classifyCavalryRole(u.stats, { allowArmoredOff: allowArmored }) === "cav_def"
  );
  if (defCavs.length && standingInf.length) {
    const maxInfCarry = Math.max(...standingInf.map((u) => Number(u.stats.carry) || 0));
    for (const c of defCavs) {
      const carry = Number(c.stats.carry) || 0;
      if (carry < maxInfCarry) {
        const msg = `${c.name} def-cavalry carry (${carry}) < standing inf carry (${maxInfCarry}) — Paladins should haul more so they are not parked as walls.`;
        (strict ? issues : warnings).push({ code: "def_cav_carry", ref: c.ref, message: msg });
      }
    }
  }

  const spear = standingInf.find((u) => classifyOrientation(u.stats) === "def_cav");
  const cav1 = byRef.cav_t1;
  if (spear && cav1) {
    if (costSum(spear.cost) >= costSum(cav1.cost) * 0.85) {
      warnings.push({
        code: "spear_not_cheap",
        ref: spear.ref,
        message: `${spear.name} anti-cav infantry should stay clearly cheaper than ${cav1.name} (mass from many villages).`,
      });
    }
  }

  const offCavs = resolved.filter(
    (u) => CAV_REFS.includes(u.ref) && classifyCavalryRole(u.stats, { allowArmoredOff: allowArmored }) === "cav_off"
  );
  if (offCavs.length && standingInf.length) {
    const avgInfSpd =
      standingInf.reduce((s, u) => s + (Number(u.stats.speed) || 0), 0) / standingInf.length;
    for (const c of offCavs) {
      if ((Number(c.stats.speed) || 0) <= avgInfSpd) {
        warnings.push({
          code: "off_cav_slow",
          ref: c.ref,
          message: `${c.name} off-cavalry should outpace standing defensive infantry.`,
        });
      }
    }
  }

  return {
    id,
    skipped: false,
    allowArmoredOffCav: allowArmored,
    ok: issues.length === 0,
    issues,
    warnings,
    units,
  };
}

/**
 * @param {Array<object>} tribes
 * @param {{ strict?: boolean, includeNpc?: boolean }} [opts]
 */
export function auditAllTribes(tribes, opts = {}) {
  const results = [];
  for (const t of tribes) {
    if (!opts.includeNpc && NPC_TRIBE_IDS.includes(t.id)) continue;
    results.push(auditTribeRoles(t, opts));
  }
  const failed = results.filter((r) => !r.skipped && !r.ok);
  return {
    ok: failed.length === 0,
    failedCount: failed.length,
    results,
  };
}
