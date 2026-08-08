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

/** Cavalry tier intensity vs the shared cav_* shape (t1 lighter / faster, t2 peak). */
const CAV_TIER = Object.freeze({
  cav_t1: { atk: 0.88, def: 0.92, speed: 1.08, carry: 1.05 },
  cav_t2: { atk: 1.12, def: 1.05, speed: 0.92, carry: 0.9 },
  cav_t3: { atk: 1.0, def: 1.0, speed: 1.0, carry: 0.95 },
});

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

  if (NPC_TRIBE_IDS.includes(id) || id === "median" || tribe.meta?.baseline || tribe.baseline) {
    return { id, skipped: true, reason: "baseline/npc", issues, warnings, units: [] };
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
