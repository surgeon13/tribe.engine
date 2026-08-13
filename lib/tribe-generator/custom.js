/**
 * Build a tribe roster from scratch (no preset culture required).
 * Stats stay within Tevel / Travian-like ranges via balance archetypes
 * and Travian-style troop roles (see data/balance/TROOP_ROLES.md).
 */

import { REFS } from "./profiles.js";
import {
  CENTERPIECE_LEAD,
  liftToCenterpiece,
  shapeTroopForRole,
  slotRolesForArchetype,
} from "../balance/troop-roles.js";
import { combatIndex } from "../balance/anchors.js";
import {
  CULTURE_LEXICONS,
  LEXICON_PRIORITY,
  matchCultureLexicon,
  rosterFromLexicon,
  scoreLexiconPack,
} from "./troop-lexicon.js";

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
  ram: "rams/siege-ram.svg",
  catapult: "catapults/catapult.svg",
  chief: "chiefs/scepter.svg",
  settler: "settlers/farmer.svg",
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
 * Balance archetypes scale role-shaped baselines — not locked to a culture.
 * Slot roles (off/def cav, standing inf walls) come from lib/balance/troop-roles.js.
 * @type {Record<string, { label: string, description: string, fightingStrengthPerPoint: number, resourceProductionBonusPercent: number, scale: Record<string, number> }>}
 */
export const BALANCE_ARCHETYPES = {
  balanced: {
    label: "Balanced",
    description:
      "Praetorian-style standing inf + Paladin def-cav + clear off knights (Roman/Gaul mid)",
    fightingStrengthPerPoint: 85,
    resourceProductionBonusPercent: 0,
    scale: { infAtk: 1, infDef: 1, cavAtk: 1, cavDef: 1, speed: 1, cost: 1 },
  },
  infantry: {
    label: "Infantry-focused",
    description: "Strong spear/praetorian walls; cavalry secondary (def-cav + one off hammer)",
    fightingStrengthPerPoint: 90,
    resourceProductionBonusPercent: 0,
    scale: { infAtk: 1.08, infDef: 1.18, cavAtk: 0.92, cavDef: 1.05, speed: 0.97, cost: 1.02 },
  },
  cavalry: {
    label: "Cavalry-focused",
    description: "Off-oriented horse arm from one village; infantry keeps cheap anti-cav spears",
    fightingStrengthPerPoint: 88,
    resourceProductionBonusPercent: 0,
    scale: { infAtk: 0.92, infDef: 0.95, cavAtk: 1.14, cavDef: 0.95, speed: 1.06, cost: 1.08 },
  },
  raider: {
    label: "Raider / cheap aggression",
    description: "Off infantry + off cavalry hammers; cheap spears only for emergency anti-cav",
    fightingStrengthPerPoint: 82,
    resourceProductionBonusPercent: 0,
    scale: { infAtk: 1.1, infDef: 0.88, cavAtk: 1.08, cavDef: 0.88, speed: 1.1, cost: 0.9 },
  },
  defensive: {
    label: "Defensive",
    description:
      "Spearman + Praetorian walls, Paladin mobile def-cav, Haeduan-style armored off knight",
    fightingStrengthPerPoint: 86,
    resourceProductionBonusPercent: 5,
    scale: { infAtk: 0.92, infDef: 1.2, cavAtk: 0.95, cavDef: 1.15, speed: 0.96, cost: 1.02 },
  },
  elite: {
    label: "Elite / expensive",
    description: "Expensive clear roles — standing def inf + off cavalry hammers",
    fightingStrengthPerPoint: 95,
    resourceProductionBonusPercent: 0,
    scale: { infAtk: 1.08, infDef: 1.1, cavAtk: 1.1, cavDef: 1.02, speed: 1, cost: 1.2 },
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

/**
 * Apply archetype intensity to utility slots (siege / chief / settler).
 * Combat slots use role shaping instead — see applyArchetypeTroop.
 */
function scaleUtilityTroop(ref, base, scale) {
  const stats = { ...base.stats };
  stats.defenseInfantry = clampStat(stats.defenseInfantry * ((scale.infDef + scale.cavDef) / 2), 5, 150);
  stats.defenseCavalry = clampStat(stats.defenseCavalry * ((scale.infDef + scale.cavDef) / 2), 5, 150);
  if (ref !== "settler") {
    stats.attack = clampStat(stats.attack * ((scale.infAtk + scale.cavAtk) / 2), 0, 220);
  }
  stats.speed = clampStat(stats.speed * scale.speed, 3, 20);
  const cost = {};
  for (const k of ["wood", "clay", "iron", "crop"]) {
    cost[k] = Math.max(0, Math.round(base.cost[k] * scale.cost));
  }
  return { stats, cost, cropUpkeep: base.cropUpkeep };
}

/**
 * Build one troop from role doctrine + archetype scale.
 * @param {string} ref
 * @param {{ stats: object, cost: object, cropUpkeep: number }} base
 * @param {string} archetypeId
 * @param {object} scale
 */
function applyArchetypeTroop(ref, base, archetypeId, scale) {
  const slotRoles = slotRolesForArchetype(archetypeId);
  const roleId = slotRoles[ref];
  if (roleId) {
    const shaped = shapeTroopForRole(ref, base, roleId, scale);
    if (shaped) {
      return {
        stats: shaped.stats,
        cost: shaped.cost,
        cropUpkeep: shaped.cropUpkeep,
        roleId: shaped.roleId,
      };
    }
  }
  return scaleUtilityTroop(ref, base, scale);
}

/**
 * Make the heavy cavalry the roster's centerpiece, in place.
 *
 * Archetype shaping alone cannot guarantee it — a defensive top horse ends up
 * behind an offensive tier-2 one — and the balance gate holds every registered
 * tribe to the rule, so a tribe built here has to meet it too.
 *
 * The identity generator derives cost from power and gets the price rise for
 * free; this one scales costs off a base table, so the same factor is applied
 * to the bill to keep the centerpiece the most expensive thing in the barracks.
 *
 * @param {Record<string, TroopDef>} troops
 * @param {boolean} handAuthored skip when the caller supplied its own cav_t3
 */
function applyCenterpiece(troops, handAuthored) {
  const horse = troops.cav_t3;
  if (!horse || handAuthored) return;
  const rivals = ["inf_t1", "inf_t2", "inf_t3", "scout", "cav_t1", "cav_t2"];
  const rival = Math.max(...rivals.filter((r) => troops[r]).map((r) => combatIndex(troops[r].stats)));
  const { stats, factor } = liftToCenterpiece(horse.stats, rival, CENTERPIECE_LEAD);
  if (factor <= 1) return;

  // The ordinary ceiling is 200; the centerpiece is allowed past it, or a
  // defensive one clips before it ever reaches the lead.
  horse.stats = {
    ...stats,
    attack: stats.attack ? clampStat(stats.attack, 1, 260) : 0,
    defenseInfantry: clampStat(stats.defenseInfantry, 5, 260),
    defenseCavalry: clampStat(stats.defenseCavalry, 5, 260),
  };
  horse.cost = Object.fromEntries(
    Object.entries(horse.cost).map(([k, v]) => [k, Math.max(0, Math.round(v * factor))])
  );
}

function corpus(parts) {
  return parts
    .filter(Boolean)
    .map((p) => String(p).trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Tribe-name corpus with structural titles stripped so "Kingdom of Israel" → israel. */
function nameCorpusForFlavor(name) {
  return corpus([name])
    .replace(/\b(the|house|clan|tribe|kingdom|empire|order|realm|of|and)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasAny(text, words) {
  return words.some((w) => new RegExp(`\\b${escapeRegExp(w)}\\b`, "i").test(text));
}

/**
 * Score / prefer culture packs via the historical troop lexicon (2000 BCE – 1500 CE).
 * @returns {{ score: number, nameHits: number }}
 */
function scoreFlavorPack(pack, text, nameText) {
  return scoreLexiconPack(pack, text, nameText);
}

function betterFlavorPack(candidate, candMeta, current, curMeta) {
  if (!current) return true;
  if (candMeta.score !== curMeta.score) return candMeta.score > curMeta.score;
  if (candMeta.nameHits !== curMeta.nameHits) return candMeta.nameHits > curMeta.nameHits;
  return (LEXICON_PRIORITY[candidate.id] || 0) > (LEXICON_PRIORITY[current.id] || 0);
}

/**
 * Flavor packs derived from CULTURE_LEXICONS.
 * Unit *pools* live in troop-lexicon.js; packs carry match/theme metadata.
 * Default `units` use the first label in each pool (docs / previews).
 */
const FLAVOR_PACKS = CULTURE_LEXICONS.map((c) => ({
  id: c.id,
  match: c.match,
  archetype: c.archetype,
  palette: c.palette,
  era: c.era,
  region: c.region,
  logos: c.logos,
  units: Object.fromEntries(
    Object.entries(c.units || {}).map(([slot, pool]) => [slot, Array.isArray(pool) ? pool[0] : pool])
  ),
}));

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
  let packMeta = { score: 0, nameHits: 0 };
  const nameText = nameCorpusForFlavor(name);
  for (const p of FLAVOR_PACKS) {
    const meta = scoreFlavorPack(p, text, nameText);
    if (betterFlavorPack(p, meta, pack, packMeta)) {
      packMeta = meta;
      pack = p;
    }
  }
  if (packMeta.score === 0) pack = null;

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

  const troopNames = flavoredTroopNames(name, pack, text, archetype);
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
 * @param {{ id?: string, units?: Record<string, string>, archetype?: string } | null} pack
 * @param {string} [loreText]
 * @param {string} [archetype]
 */
export function flavoredTroopNames(tribeName, pack = null, loreText = "", archetype = "balanced") {
  const label = tribeLabel(tribeName);
  const text = corpus([tribeName, loreText]);
  const nameText = nameCorpusForFlavor(tribeName);
  const weapons = detectWeaponMotifs(text);
  const mounts = detectMountMotifs(text);

  const culture =
    (pack?.id && CULTURE_LEXICONS.find((c) => c.id === pack.id)) ||
    matchCultureLexicon(text, nameText);

  const units = rosterFromLexicon(culture, tribeName, {
    archetype: pack?.archetype || culture?.archetype || archetype,
    weapons,
    mounts,
  });

  return personalizePackUnits(units, label);
}

/**
 * Default hero display name: account / in-game name when provided, else plain "Hero".
 * Players rename in-game; tribe generation should not invent culture-flavored hero titles.
 * @param {{ accountName?: string, playerName?: string, heroName?: string, hero?: { name?: string }, troopNames?: { hero?: string } }} opts
 */
export function resolveHeroName(opts = {}) {
  const candidates = [
    opts.hero?.name,
    opts.heroName,
    opts.accountName,
    opts.playerName,
    opts.troopNames?.hero,
  ];
  for (const c of candidates) {
    const s = String(c || "").trim();
    if (!s) continue;
    // Plain "Hero" is the unit-type placeholder, not a personal name.
    if (/^hero$/i.test(s)) continue;
    return s;
  }
  return "Hero";
}

/**
 * Known demonym / stem overrides (avoids Arabs → Arabish, Romans → Romanish, etc.).
 * Keys are lowercased full tribe names or leading tokens.
 */
const TRIBE_LABEL_OVERRIDES = {
  arabs: "Arab",
  arab: "Arab",
  arabian: "Arabian",
  arabia: "Arab",
  ishmaelites: "Ishmaelite",
  ishmaelite: "Ishmaelite",
  nabateans: "Nabatean",
  nabatean: "Nabatean",
  nabataeans: "Nabataean",
  nabataean: "Nabataean",
  israelites: "Israelite",
  israelite: "Israelite",
  hebrews: "Hebrew",
  hebrew: "Hebrew",
  moors: "Moorish",
  moor: "Moorish",
  romans: "Roman",
  roman: "Roman",
  gauls: "Gaulish",
  gaul: "Gaulish",
  teutons: "Teutonic",
  teuton: "Teutonic",
  huns: "Hun",
  hun: "Hun",
  norse: "Norse",
  undead: "Undead",
  amalekites: "Amalekite",
  amalekite: "Amalekite",
  egyptians: "Egyptian",
  egyptian: "Egyptian",
  spartans: "Spartan",
  spartan: "Spartan",
  byzantines: "Byzantine",
  byzantine: "Byzantine",
  carthaginians: "Carthaginian",
  carthaginian: "Carthaginian",
  japanese: "Japanese",
  chinese: "Chinese",
  persians: "Persian",
  persian: "Persian",
  greeks: "Greek",
  greek: "Greek",
  mongols: "Mongol",
  mongol: "Mongol",
  nature: "Nature",
  natars: "Natar",
  natar: "Natar",
  median: "Median",
  hittites: "Hittite",
  hittite: "Hittite",
  thracians: "Thracian",
  thracian: "Thracian",
  dacians: "Dacian",
  dacian: "Dacian",
  slavs: "Slavic",
  slavic: "Slavic",
  ottomans: "Ottoman",
  ottoman: "Ottoman",
  koreans: "Korean",
  korean: "Korean",
  axumites: "Aksumite",
  axumite: "Aksumite",
  aksumites: "Aksumite",
  aksumite: "Aksumite",
  aztecs: "Aztec",
  aztec: "Aztec",
  mexica: "Mexica",
  mayas: "Maya",
  maya: "Maya",
  mayan: "Maya",
  incas: "Inca",
  inca: "Inca",
  joseon: "Korean",
  goguryeo: "Korean",
  silla: "Korean",
  franks: "Frankish",
  frank: "Frankish",
  indians: "Indian",
  indian: "Indian",
  rajputs: "Rajput",
  rajput: "Rajput",
  marathas: "Maratha",
  maratha: "Maratha",
  cholas: "Chola",
  chola: "Chola",
  danes: "Danish",
  dane: "Danish",
  swedish: "Swedish",
  swedes: "Swedish",
  swede: "Swedish",
  norwegians: "Norwegian",
  norwegian: "Norwegian",
  vikings: "Norse",
  viking: "Norse",
  scandinavians: "Scandinavian",
  scandinavian: "Scandinavian",
  berbers: "Berber",
  berber: "Berber",
  amazigh: "Amazigh",
  numidians: "Numidian",
  numidian: "Numidian",
  maghrebi: "Maghrebi",
  magyars: "Magyar",
  magyar: "Magyar",
  hungarians: "Hungarian",
  hungarian: "Hungarian",
  poles: "Polish",
  polish: "Polish",
  poland: "Polish",
  serbs: "Serbian",
  serbian: "Serbian",
  bulgarians: "Bulgarian",
  bulgarian: "Bulgarian",
  english: "English",
  french: "French",
  spanish: "Spanish",
  portuguese: "Portuguese",
  scottish: "Scottish",
  scots: "Scottish",
  swiss: "Swiss",
  italian: "Italian",
};

/**
 * Short display stem / demonym for naming units (Moors → Moorish, Scotts → Scot, House Atreides → Atreides).
 * @param {string} tribeName
 */
export function tribeLabel(tribeName) {
  let raw = String(tribeName || "Custom").trim() || "Custom";
  raw = raw.replace(/^(the|house|clan|tribe|kingdom|empire|order)\s+/i, "").trim();
  if (!raw) raw = "Custom";

  const override = TRIBE_LABEL_OVERRIDES[raw.toLowerCase()];
  if (override) return override;

  // Already adjectival / mass-noun fantasy labels
  if (/^(undead|norse|slavic|celtic|roman|teutonic|gaulish)$/i.test(raw)) {
    return titleCase(raw);
  }

  // Multi-word: "Ashen Host", "Bone Legion" → leading distinctive word
  // "Iron Phalanx", "Frost Wolves" → leading word when second is a formation/animal
  const parts = raw.split(/\s+/);
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    const first = parts[0];
    const firstOverride = TRIBE_LABEL_OVERRIDES[first.toLowerCase()];
    if (
      /^(host|legion|horde|army|order|realm|empire|kingdom|clan|tribe|folk|people|phalanx|wolves|wolfs|riders|knights|guard|band)$/i.test(
        last
      )
    ) {
      return firstOverride || titleCase(first);
    }
    const lastOverride = TRIBE_LABEL_OVERRIDES[last.toLowerCase()];
    if (lastOverride) return lastOverride;
    return titleCase(last);
  }

  // Peoples ending in -ians → singular adjective (Scythians → Scythian)
  if (/ians$/i.test(raw)) return titleCase(raw.replace(/s$/i, ""));
  if (/(ese|ish)$/i.test(raw)) return titleCase(raw);

  // Israelites → Israelite; Atreides / Achilles-style -es proper names keep full form
  if (/ites$/i.test(raw)) return titleCase(raw.replace(/s$/i, ""));
  if (/[aeiou]des$/i.test(raw) || /eides$/i.test(raw)) return titleCase(raw);

  // -ies → -ian (e.g. fictional)
  if (/ies$/i.test(raw)) return titleCase(raw.replace(/ies$/i, "ian"));

  // Moors / Huns / Scots → Moorish / Hun / Scot
  // Prefer bare stem for longer names (Vandals → Vandal); short stems get -ish only when needed.
  if (/s$/i.test(raw) && raw.length > 3 && !/us$/i.test(raw) && !/ss$/i.test(raw) && !/es$/i.test(raw)) {
    const stem = raw.replace(/s$/i, "");
    if (stem.length <= 3) return titleCase(stem);
    if (/[aeiou]$/i.test(stem)) return titleCase(`${stem}n`);
    // Avoid Arabish / Romanish style for ethnonyms that already sound complete
    if (stem.length <= 4) return titleCase(stem);
    if (stem.length <= 5) return titleCase(`${stem}ish`);
    return titleCase(stem);
  }

  // Soft -es plurals (Wolves → Wolf) only for common animal/people forms
  if (/ves$/i.test(raw)) return titleCase(raw.replace(/ves$/i, "f"));
  if (/oes$/i.test(raw)) return titleCase(raw.replace(/oes$/i, "o"));

  return titleCase(raw);
}

function titleCase(s) {
  return String(s)
    .split(/([\s\-'])/)
    .map((p) => (/^[\s\-']$/.test(p) ? p : p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
    .join("");
}

/**
 * @param {Record<string, string>} units
 * @param {string} label
 */
function personalizePackUnits(units, label) {
  const out = { ...units };
  // Hero stays plain "Hero" — in-game default is the player's account name (editable later).
  out.hero = "Hero";
  if (out.chief && !out.chief.toLowerCase().includes(label.toLowerCase())) {
    // Keep title (Lich, Emir, Khan) but allow "Ashen Lich" style when short
    if (out.chief.split(/\s+/).length === 1) out.chief = `${label} ${out.chief}`;
  }
  if (out.settler && !/settler$/i.test(out.settler)) {
    out.settler = `${label} Settler`;
  } else if (out.settler && !out.settler.toLowerCase().includes(label.toLowerCase())) {
    out.settler = `${label} Settler`;
  }
  return out;
}

/**
 * @param {string} text
 */
function detectWeaponMotifs(text) {
  /** @type {string[]} */
  const hits = [];
  const rules = [
    ["phalanx", "phalanx"],
    ["sarissa", "pike"],
    ["spear", "spear"],
    ["javelin", "javelin"],
    ["axe", "axe"],
    ["sword", "sword"],
    ["longbow", "bow"],
    ["crossbow", "bow"],
    ["bow", "bow"],
    ["archer", "bow"],
    ["sling", "sling"],
    ["pike", "pike"],
    ["falx", "falx"],
    ["scythe", "scythe"],
    ["dagger", "dagger"],
    ["mace", "mace"],
    ["naginata", "polearm"],
    ["yari", "spear"],
  ];
  for (const [kw, tag] of rules) {
    if (text.includes(kw) && !hits.includes(tag)) hits.push(tag);
  }
  return hits;
}

/**
 * @param {string} text
 */
function detectMountMotifs(text) {
  /** @type {string[]} */
  const hits = [];
  const rules = [
    ["camel", "camel"],
    ["elephant", "elephant"],
    ["chariot", "chariot"],
    ["wolf", "wolf"],
    ["horse archer", "horse-archer"],
    ["cataphract", "cataphract"],
    ["knight", "knight"],
    ["drake", "drake"],
    ["dragon", "dragon"],
  ];
  for (const [kw, tag] of rules) {
    if (text.includes(kw) && !hits.includes(tag)) hits.push(tag);
  }
  return hits;
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
  const slotRoles = slotRolesForArchetype(archetypeId);
  for (const ref of REFS) {
    const scaled = applyArchetypeTroop(ref, BASE_TROOPS[ref], archetypeId, arch.scale);
    const over = opts.troopOverrides?.[ref] || {};
    const roleId = scaled.roleId || slotRoles[ref];
    const roleNote = roleId ? ` [${roleId}]` : "";
    troops[ref] = {
      name: over.name || names[ref] || SLOT_META[ref].label,
      description:
        over.description ||
        `${names[ref] || SLOT_META[ref].label} — ${shortDesc}${roleNote}`,
      stats: over.stats ? { ...BASE_TROOPS[ref].stats, ...over.stats } : scaled.stats,
      cost: over.cost ? { ...BASE_TROOPS[ref].cost, ...over.cost } : scaled.cost,
      cropUpkeep: over.cropUpkeep ?? scaled.cropUpkeep,
    };
  }
  applyCenterpiece(troops, Boolean(opts.troopOverrides?.cav_t3));

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
      name: resolveHeroName(opts),
      description:
        opts.hero?.description ||
        `Player hero for ${name}. Defaults to the account's in-game name; editable later.`,
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
