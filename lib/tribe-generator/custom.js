/**
 * Build a tribe roster from scratch (no preset culture required).
 * Stats stay within Tevel / Travian-like ranges via balance archetypes.
 */

import { REFS } from "./profiles.js";

/** @typedef {{ attack: number, defenseInfantry: number, defenseCavalry: number, speed: number, carry: number }} Stats */
/** @typedef {{ wood: number, clay: number, iron: number, crop: number }} Cost */
/** @typedef {{ name: string, stats: Stats, cost: Cost, cropUpkeep: number, description?: string }} TroopDef */

const SLOT_META = {
  inf_t1: { role: "infantry", label: "Infantry I" },
  inf_t2: { role: "infantry", label: "Infantry II" },
  inf_t3: { role: "infantry", label: "Infantry III" },
  scout: { role: "scout", label: "Scout" },
  cav_t1: { role: "cavalry", label: "Cavalry I" },
  cav_t2: { role: "cavalry", label: "Cavalry II" },
  cav_t3: { role: "cavalry", label: "Cavalry III" },
  ram: { role: "siege", label: "Ram" },
  catapult: { role: "siege", label: "Catapult" },
  chief: { role: "chief", label: "Chief" },
  settler: { role: "settler", label: "Settler" },
};

/** Neutral Travian-like baseline (closest to a blended Roman/Gaul mid). */
const BASE_TROOPS = {
  inf_t1: {
    stats: { attack: 35, defenseInfantry: 40, defenseCavalry: 40, speed: 6, carry: 45 },
    cost: { wood: 110, clay: 95, iron: 120, crop: 35 },
    cropUpkeep: 1,
  },
  inf_t2: {
    stats: { attack: 45, defenseInfantry: 45, defenseCavalry: 30, speed: 6, carry: 35 },
    cost: { wood: 125, clay: 110, iron: 140, crop: 55 },
    cropUpkeep: 1,
  },
  inf_t3: {
    stats: { attack: 70, defenseInfantry: 45, defenseCavalry: 35, speed: 7, carry: 45 },
    cost: { wood: 160, clay: 150, iron: 210, crop: 85 },
    cropUpkeep: 1,
  },
  scout: {
    stats: { attack: 0, defenseInfantry: 20, defenseCavalry: 10, speed: 16, carry: 0 },
    cost: { wood: 135, clay: 150, iron: 25, crop: 40 },
    cropUpkeep: 2,
  },
  cav_t1: {
    stats: { attack: 115, defenseInfantry: 55, defenseCavalry: 50, speed: 14, carry: 95 },
    cost: { wood: 500, clay: 410, iron: 310, crop: 100 },
    cropUpkeep: 3,
  },
  cav_t2: {
    stats: { attack: 165, defenseInfantry: 75, defenseCavalry: 95, speed: 11, carry: 70 },
    cost: { wood: 550, clay: 620, iron: 760, crop: 175 },
    cropUpkeep: 4,
  },
  cav_t3: {
    stats: { attack: 150, defenseInfantry: 70, defenseCavalry: 80, speed: 12, carry: 80 },
    cost: { wood: 530, clay: 550, iron: 650, crop: 150 },
    cropUpkeep: 4,
  },
  ram: {
    stats: { attack: 60, defenseInfantry: 30, defenseCavalry: 75, speed: 4, carry: 0 },
    cost: { wood: 900, clay: 360, iron: 500, crop: 70 },
    cropUpkeep: 3,
  },
  catapult: {
    stats: { attack: 75, defenseInfantry: 60, defenseCavalry: 10, speed: 3, carry: 0 },
    cost: { wood: 950, clay: 1350, iron: 600, crop: 90 },
    cropUpkeep: 6,
  },
  chief: {
    stats: { attack: 50, defenseInfantry: 40, defenseCavalry: 30, speed: 4, carry: 0 },
    cost: { wood: 30000, clay: 27000, iron: 44000, crop: 36000 },
    cropUpkeep: 5,
  },
  settler: {
    stats: { attack: 0, defenseInfantry: 80, defenseCavalry: 80, speed: 5, carry: 3000 },
    cost: { wood: 5800, clay: 5300, iron: 7200, crop: 5500 },
    cropUpkeep: 1,
  },
};

const BASE_HERO = {
  stats: { attack: 100, defenseInfantry: 110, defenseCavalry: 100, speed: 8, carry: 100 },
  cropUpkeep: 6,
};

const DEFAULT_LOGOS = {
  inf_t1: "infantry/stone-spear.svg",
  inf_t2: "infantry/battle-axe.svg",
  inf_t3: "infantry/gladius.svg",
  scout: "infantry/heavy-arrow.svg",
  cav_t1: "cavalry/horse-head.svg",
  cav_t2: "cavalry/chess-knight.svg",
  cav_t3: "cavalry/donkey.svg",
  ram: "infantry/crowbar.svg",
  catapult: "powder.svg",
  chief: "infantry/baton.svg",
  settler: "resources/brick-pile.svg",
};

const DEFAULT_TRAINING = {
  inf_t1: { building: "barracks", timeSeconds: 1200 },
  inf_t2: { building: "barracks", timeSeconds: 1400 },
  inf_t3: { building: "barracks", timeSeconds: 1600 },
  scout: { building: "barracks", timeSeconds: 1280 },
  cav_t1: { building: "stable", timeSeconds: 1800 },
  cav_t2: { building: "stable", timeSeconds: 2400 },
  cav_t3: { building: "stable", timeSeconds: 2500 },
  ram: { building: "workshop", timeSeconds: 4600 },
  catapult: { building: "workshop", timeSeconds: 9000 },
  chief: { building: "residence", timeSeconds: 90720 },
  settler: { building: "residence", timeSeconds: 26920 },
};

/**
 * Balance archetypes scale the neutral baseline — not locked to a culture.
 * @type {Record<string, { label: string, description: string, fightingStrengthPerPoint: number, resourceProductionBonusPercent: number, scale: Record<string, number> }>}
 */
export const BALANCE_ARCHETYPES = {
  balanced: {
    label: "Balanced",
    description: "Even infantry and cavalry — general-purpose roster",
    fightingStrengthPerPoint: 85,
    resourceProductionBonusPercent: 0,
    scale: { infAtk: 1, infDef: 1, cavAtk: 1, cavDef: 1, speed: 1, cost: 1 },
  },
  infantry: {
    label: "Infantry-focused",
    description: "Stronger foot troops, slightly weaker cavalry",
    fightingStrengthPerPoint: 90,
    resourceProductionBonusPercent: 0,
    scale: { infAtk: 1.12, infDef: 1.15, cavAtk: 0.9, cavDef: 0.92, speed: 0.97, cost: 1.05 },
  },
  cavalry: {
    label: "Cavalry-focused",
    description: "Stronger horse arm, softer infantry line",
    fightingStrengthPerPoint: 88,
    resourceProductionBonusPercent: 0,
    scale: { infAtk: 0.9, infDef: 0.92, cavAtk: 1.12, cavDef: 1.08, speed: 1.05, cost: 1.08 },
  },
  raider: {
    label: "Raider / cheap aggression",
    description: "Faster, cheaper, glass-cannon offense",
    fightingStrengthPerPoint: 82,
    resourceProductionBonusPercent: 0,
    scale: { infAtk: 1.08, infDef: 0.88, cavAtk: 1.05, cavDef: 0.9, speed: 1.1, cost: 0.9 },
  },
  defensive: {
    label: "Defensive",
    description: "Higher defense, lower attack, steadier costs",
    fightingStrengthPerPoint: 86,
    resourceProductionBonusPercent: 5,
    scale: { infAtk: 0.9, infDef: 1.18, cavAtk: 0.92, cavDef: 1.12, speed: 0.95, cost: 1.02 },
  },
  elite: {
    label: "Elite / expensive",
    description: "Higher combat values, notably higher resource costs",
    fightingStrengthPerPoint: 95,
    resourceProductionBonusPercent: 0,
    scale: { infAtk: 1.1, infDef: 1.08, cavAtk: 1.1, cavDef: 1.08, speed: 1, cost: 1.2 },
  },
};

export const ARCHETYPE_IDS = Object.keys(BALANCE_ARCHETYPES);

export function listArchetypes() {
  return Object.entries(BALANCE_ARCHETYPES).map(([id, a]) => ({
    id,
    label: a.label,
    description: a.description,
  }));
}

function clampStat(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function scaleTroop(ref, base, scale) {
  const role = SLOT_META[ref]?.role;
  const isInf = role === "infantry" || role === "scout";
  const isCav = role === "cavalry";
  const atkMul = isInf ? scale.infAtk : isCav ? scale.cavAtk : 1;
  const defMul = isInf ? scale.infDef : isCav ? scale.cavDef : 1;
  const stats = { ...base.stats };
  if (ref !== "scout" && ref !== "settler") {
    stats.attack = clampStat(stats.attack * atkMul, 0, 220);
  }
  stats.defenseInfantry = clampStat(stats.defenseInfantry * defMul, 5, 150);
  stats.defenseCavalry = clampStat(stats.defenseCavalry * defMul, 5, 150);
  stats.speed = clampStat(stats.speed * scale.speed, 3, 20);
  const cost = {};
  for (const k of ["wood", "clay", "iron", "crop"]) {
    cost[k] = Math.max(0, Math.round(base.cost[k] * scale.cost));
  }
  return { stats, cost, cropUpkeep: base.cropUpkeep };
}

function corpus(parts) {
  return parts
    .filter(Boolean)
    .map((p) => String(p).trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(text, words) {
  return words.some((w) => text.includes(w));
}

/** Flavor packs keyed by theme tags inferred from free-form user text. */
const FLAVOR_PACKS = [
  {
    id: "undead",
    match: ["undead", "zombie", "skeleton", "necromancer", "lich", "ghoul", "wight", "grave", "death knight", "revenant"],
    archetype: "raider",
    palette: { primary: "#1A1A2E", secondary: "#6BCB77" },
    era: "Fantasy / necromantic",
    region: "Grave-realms",
    logos: {
      inf_t1: "infantry/bone-mace.svg",
      inf_t2: "infantry/sacrificial-dagger.svg",
      inf_t3: "infantry/scythe.svg",
      chief: "infantry/orb-wand.svg",
    },
    units: {
      inf_t1: "Skeleton Levy",
      inf_t2: "Ghoul",
      inf_t3: "Wight",
      scout: "Shade",
      cav_t1: "Bone Rider",
      cav_t2: "Death Knight",
      cav_t3: "Black Steed",
      ram: "Bone Ram",
      catapult: "Tomb Catapult",
      chief: "Lich",
      settler: "Necropolis Settler",
      hero: "Death Knight Hero",
    },
  },
  {
    id: "desert",
    match: ["desert", "sand", "camel", "bedouin", "sahara", "maghreb", "andalus", "oasis", "dune"],
    archetype: "cavalry",
    palette: { primary: "#8B5E3C", secondary: "#E8C547" },
    era: "Desert / arid frontier",
    region: "Desert marches",
    logos: { cav_t1: "cavalry/camel-head.svg", cav_t3: "cavalry/camel-head.svg" },
    units: {
      inf_t1: "Spear Levy",
      inf_t2: "Javelin Skirmisher",
      inf_t3: "Desert Guard",
      scout: "Dune Scout",
      cav_t1: "Camel Rider",
      cav_t2: "Heavy Camel",
      cav_t3: "Faris",
      ram: "Siege Ram",
      catapult: "Sand Catapult",
      chief: "Emir",
      settler: "Oasis Settler",
      hero: "Desert Hero",
    },
  },
  {
    id: "steppe",
    match: ["steppe", "nomad", "horde", "mongol", "horse archer", "khagan", "yurt"],
    archetype: "cavalry",
    palette: { primary: "#4A6741", secondary: "#C4A35A" },
    era: "Steppe nomad",
    region: "Open steppe",
    units: {
      inf_t1: "Camp Guard",
      inf_t2: "Foot Archer",
      inf_t3: "Keshig Infantry",
      scout: "Outrider Scout",
      cav_t1: "Horse Archer",
      cav_t2: "Lancer",
      cav_t3: "Heavy Cavalry",
      ram: "Siege Ram",
      catapult: "Traction Trebuchet",
      chief: "Khan",
      settler: "Ordu Settler",
      hero: "Steppe Hero",
    },
  },
  {
    id: "naval",
    match: ["naval", "pirate", "sea", "viking", "longship", "coast", "island", "corsair", "fleet"],
    archetype: "raider",
    palette: { primary: "#1B3A4B", secondary: "#C0C0C0" },
    era: "Seafaring age",
    region: "Coasts & islands",
    units: {
      inf_t1: "Ship Levy",
      inf_t2: "Raider",
      inf_t3: "Boarding Elite",
      scout: "Coast Watcher",
      cav_t1: "Shore Rider",
      cav_t2: "Heavy Raider",
      cav_t3: "Guard Cavalry",
      ram: "Ship Ram",
      catapult: "Deck Catapult",
      chief: "Sea Chief",
      settler: "Colony Settler",
      hero: "Sea Hero",
    },
  },
  {
    id: "forest",
    match: ["forest", "woodland", "jungle", "druid", "hunter", "ranger", "ambush"],
    archetype: "defensive",
    palette: { primary: "#2D4A22", secondary: "#A3C585" },
    era: "Woodland realm",
    region: "Deep forest",
    units: {
      inf_t1: "Woodsman",
      inf_t2: "Hunter",
      inf_t3: "Forest Guard",
      scout: "Pathfinder",
      cav_t1: "Forest Rider",
      cav_t2: "Stag Cavalry",
      cav_t3: "Warden Cavalry",
      ram: "Timber Ram",
      catapult: "Tree Thrower",
      chief: "Chieftain",
      settler: "Grove Settler",
      hero: "Forest Hero",
    },
  },
  {
    id: "mountain",
    match: ["mountain", "highland", "alpine", "cliff", "peak", "dwarf", "fortress"],
    archetype: "defensive",
    palette: { primary: "#4A4E69", secondary: "#9A8C98" },
    era: "Highland / mountain",
    region: "Highlands",
    units: {
      inf_t1: "Hill Spearman",
      inf_t2: "Axeman",
      inf_t3: "Mountain Guard",
      scout: "Cliff Scout",
      cav_t1: "Hill Rider",
      cav_t2: "Heavy Horse",
      cav_t3: "Peak Cavalry",
      ram: "Stone Ram",
      catapult: "Rock Thrower",
      chief: "Highland Chief",
      settler: "Hold Settler",
      hero: "Mountain Hero",
    },
  },
  {
    id: "imperial",
    match: ["empire", "imperial", "legion", "phalanx", "city-state", "kingdom", "royal", "noble"],
    archetype: "infantry",
    palette: { primary: "#5C2B2B", secondary: "#D4AF37" },
    era: "Imperial age",
    region: "Heartland cities",
    units: {
      inf_t1: "Levy Spearman",
      inf_t2: "Swordsman",
      inf_t3: "Elite Guard",
      scout: "Courier Scout",
      cav_t1: "Light Horse",
      cav_t2: "Knight",
      cav_t3: "Royal Cavalry",
      ram: "Siege Ram",
      catapult: "Siege Engine",
      chief: "Governor",
      settler: "Colonist",
      hero: "Imperial Hero",
    },
  },
];

const ARCHETYPE_HINTS = [
  { id: "cavalry", words: ["cavalry", "horse", "mounted", "knight", "camel", "rider", "cataphract"] },
  { id: "infantry", words: ["infantry", "spear", "phalanx", "legion", "swordsman", "foot"] },
  { id: "raider", words: ["raid", "raider", "pirate", "berserk", "cheap", "swarm", "horde", "undead"] },
  { id: "defensive", words: ["defensive", "defense", "fortress", "wall", "shield", "hold", "garrison"] },
  { id: "elite", words: ["elite", "expensive", "professional", "veteran", "crack"] },
];

/**
 * Infer culture flavor from free-form user input (name + lore + theme).
 * Explicit opts override inferences.
 * @param {{ name?: string, theme?: string, historicalContext?: string, era?: string, region?: string, archetype?: string, palette?: { primary?: string, secondary?: string, notes?: string } }} opts
 */
export function deriveFromUserInput(opts = {}) {
  const name = String(opts.name || "").trim() || "Custom";
  const themeIn = opts.theme?.trim() || "";
  const loreIn = opts.historicalContext?.trim() || "";
  const text = corpus([name, themeIn, loreIn]);

  let pack = null;
  let packScore = 0;
  for (const p of FLAVOR_PACKS) {
    let score = 0;
    for (const kw of p.match) {
      if (text.includes(kw)) score += kw.length;
    }
    if (score > packScore) {
      packScore = score;
      pack = p;
    }
  }
  if (packScore === 0) pack = null;

  let archetype = ARCHETYPE_IDS.includes(opts.archetype) ? opts.archetype : null;
  if (!archetype && pack) archetype = pack.archetype;
  if (!archetype) {
    for (const hint of ARCHETYPE_HINTS) {
      if (hasAny(text, hint.words)) {
        archetype = hint.id;
        break;
      }
    }
  }
  if (!archetype) archetype = "balanced";

  const inferredPalette = pack?.palette || { primary: "#3D5A80", secondary: "#E09F3E" };
  const palette = {
    primary: opts.palette?.primary || inferredPalette.primary,
    secondary: opts.palette?.secondary || inferredPalette.secondary,
    notes: opts.palette?.notes || (pack ? `${name} · ${pack.id} flavor from your description` : `${name} palette from your description`),
  };

  const era =
    opts.era?.trim() ||
    pack?.era ||
    (loreIn.match(/\b(\d{1,2}(?:st|nd|rd|th)\s+c(?:entury)?\.?\s*(?:bce|ce|ad|bc)?)\b/i)?.[0]) ||
    "Defined by your lore";
  const region = opts.region?.trim() || pack?.region || "Defined by your lore";

  const theme =
    themeIn ||
    (loreIn ? loreIn.split(/[.!?]/)[0].trim().slice(0, 140) : "") ||
    (pack ? `${name} — ${pack.id} doctrine shaped by your description` : `${name} — roster shaped by your description`);

  const historicalContext =
    loreIn ||
    themeIn ||
    `User-defined tribe (${name}). Built from your input — not a locked culture preset.`;

  const troopNames = flavoredTroopNames(name, pack);
  const logos = { ...DEFAULT_LOGOS, ...(pack?.logos || {}) };

  return {
    name,
    archetype,
    palette,
    era,
    region,
    theme,
    historicalContext,
    troopNames,
    logos,
    flavorId: pack?.id || null,
    inferred: {
      archetype: !opts.archetype,
      palette: !(opts.palette?.primary || opts.palette?.secondary),
      era: !opts.era?.trim(),
      region: !opts.region?.trim(),
      theme: !themeIn,
      flavor: Boolean(pack),
    },
  };
}

/**
 * @param {string} tribeName
 * @param {{ units?: Record<string, string> } | null} pack
 */
export function flavoredTroopNames(tribeName, pack = null) {
  const short = String(tribeName || "Custom").trim() || "Custom";
  if (pack?.units) {
    return { ...pack.units };
  }
  return {
    inf_t1: `${short} Spearman`,
    inf_t2: `${short} Skirmisher`,
    inf_t3: `${short} Elite Infantry`,
    scout: `${short} Scout`,
    cav_t1: `${short} Light Cavalry`,
    cav_t2: `${short} Heavy Cavalry`,
    cav_t3: `${short} Guard Cavalry`,
    ram: "Battering Ram",
    catapult: "Catapult",
    chief: `${short} Chief`,
    settler: "Settler",
    hero: `${short} Hero`,
  };
}

/**
 * Default unit names when the user does not supply custom ones.
 * Prefer deriveFromUserInput when lore/theme are available.
 * @param {string} tribeName
 * @param {{ theme?: string, historicalContext?: string }} [extra]
 */
export function defaultTroopNames(tribeName, extra = {}) {
  const derived = deriveFromUserInput({
    name: tribeName,
    theme: extra.theme,
    historicalContext: extra.historicalContext,
  });
  return derived.troopNames;
}

export function defaultSlotLabels() {
  return Object.fromEntries(REFS.map((ref) => [ref, SLOT_META[ref].label]));
}

/**
 * Build a custom profile primarily from user input; optional fields override inferences.
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} [opts.theme]
 * @param {string} [opts.historicalContext]
 * @param {string} [opts.era]
 * @param {string} [opts.region]
 * @param {'balanced'|'infantry'|'cavalry'|'raider'|'defensive'|'elite'} [opts.archetype]
 * @param {{ primary?: string, secondary?: string, notes?: string }} [opts.palette]
 * @param {Record<string, string>} [opts.troopNames] ref -> name, plus optional hero
 * @param {Record<string, Partial<TroopDef>>} [opts.troopOverrides] full per-slot overrides
 * @param {{ name?: string, description?: string, stats?: Stats, cropUpkeep?: number }} [opts.hero]
 * @param {Record<string, string>} [opts.logos]
 * @param {Record<string, { building: string, timeSeconds: number }>} [opts.training]
 */
export function buildCustomProfile(opts) {
  const name = String(opts.name || "").trim();
  if (!name) throw new Error("Custom tribe requires a display name");

  const derived = deriveFromUserInput(opts);
  const archetypeId = derived.archetype;
  const arch = BALANCE_ARCHETYPES[archetypeId];
  const names = { ...derived.troopNames, ...(opts.troopNames || {}) };
  const theme = derived.theme;
  const historicalContext = derived.historicalContext;
  const primary = derived.palette.primary;
  const secondary = derived.palette.secondary;
  const shortDesc = theme.length > 80 ? `${theme.slice(0, 77)}…` : theme;

  /** @type {Record<string, TroopDef>} */
  const troops = {};
  for (const ref of REFS) {
    const scaled = scaleTroop(ref, BASE_TROOPS[ref], arch.scale);
    const over = opts.troopOverrides?.[ref] || {};
    troops[ref] = {
      name: over.name || names[ref] || SLOT_META[ref].label,
      description:
        over.description ||
        `${names[ref] || SLOT_META[ref].label} — ${shortDesc}`,
      stats: over.stats ? { ...BASE_TROOPS[ref].stats, ...over.stats } : scaled.stats,
      cost: over.cost ? { ...BASE_TROOPS[ref].cost, ...over.cost } : scaled.cost,
      cropUpkeep: over.cropUpkeep ?? scaled.cropUpkeep,
    };
  }

  const heroStats = opts.hero?.stats
    ? { ...BASE_HERO.stats, ...opts.hero.stats }
    : {
        attack: clampStat(BASE_HERO.stats.attack * ((arch.scale.infAtk + arch.scale.cavAtk) / 2), 80, 140),
        defenseInfantry: clampStat(BASE_HERO.stats.defenseInfantry * arch.scale.infDef, 80, 140),
        defenseCavalry: clampStat(BASE_HERO.stats.defenseCavalry * arch.scale.cavDef, 80, 140),
        speed: clampStat(BASE_HERO.stats.speed * arch.scale.speed, 6, 14),
        carry: 100,
      };

  return {
    id: "custom",
    name,
    era: derived.era,
    region: derived.region,
    theme,
    historicalContext,
    keywords: [],
    palette: {
      primary,
      secondary,
      notes: derived.palette.notes,
    },
    archetype: archetypeId,
    fightingStrengthPerPoint: arch.fightingStrengthPerPoint,
    resourceProductionBonusPercent: arch.resourceProductionBonusPercent,
    logos: { ...derived.logos, ...(opts.logos || {}) },
    training: { ...DEFAULT_TRAINING, ...(opts.training || {}) },
    troops,
    hero: {
      name: opts.hero?.name || names.hero || `${name} Hero`,
      description:
        opts.hero?.description ||
        `Champion of ${name} — shaped by your lore (${arch.label.toLowerCase()}).`,
      stats: heroStats,
      cropUpkeep: opts.hero?.cropUpkeep ?? BASE_HERO.cropUpkeep,
    },
    meta: {
      derivedFromUserInput: true,
      flavorId: derived.flavorId,
      inferred: derived.inferred,
    },
  };
}
