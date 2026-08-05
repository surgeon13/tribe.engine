/**
 * Historical culture profiles for on-the-fly tribe creation.
 * Each profile supplies Travian-style 11-slot rosters + hero, flavored by era/region.
 *
 * Balance targets stay within existing Tevel / Travian Legends ranges so new tribes
 * compare fairly in table, graphics, charts, and normalized stat views.
 */

/** @typedef {{ attack: number, defenseInfantry: number, defenseCavalry: number, speed: number, carry: number }} Stats */
/** @typedef {{ wood: number, clay: number, iron: number, crop: number }} Cost */
/** @typedef {{ name: string, stats: Stats, cost: Cost, cropUpkeep: number, description?: string }} TroopDef */

/**
 * @typedef {object} CultureProfile
 * @property {string} id
 * @property {string} name
 * @property {string} era
 * @property {string} region
 * @property {string} theme
 * @property {string} historicalContext
 * @property {string[]} keywords
 * @property {{ primary: string, secondary: string, notes: string }} palette
 * @property {'infantry'|'cavalry'|'balanced'|'raider'} archetype
 * @property {number} fightingStrengthPerPoint
 * @property {number} [resourceProductionBonusPercent]
 * @property {Record<string, string>} logos
 * @property {Record<string, { building: string, timeSeconds: number }>} training
 * @property {Record<string, TroopDef>} troops
 * @property {{ name: string, description: string, stats: Stats, cropUpkeep: number }} hero
 */

/** @type {CultureProfile[]} */
export const CULTURE_PROFILES = [
  {
    id: "carthaginian",
    name: "Carthaginians",
    era: "Punic Wars (3rd–2nd c. BCE)",
    region: "North Africa / western Mediterranean",
    theme: "Mercenary armies, elephants, and naval wealth — soft core infantry, elite mounted punch",
    historicalContext:
      "Carthage fielded mixed mercenary hosts: Libyan spearmen, Balearic slingers, Numidian light horse, and war elephants, financed by Mediterranean trade.",
    keywords: ["carthage", "carthaginian", "punic", "hannibal", "phoenician", "numidian", "elephant"],
    palette: { primary: "#1B4F72", secondary: "#C9A227", notes: "Tyrian sea-blue + trade gold" },
    archetype: "balanced",
    fightingStrengthPerPoint: 90,
    resourceProductionBonusPercent: 10,
    logos: {
      inf_t1: "infantry/stone-spear.svg",
      inf_t2: "infantry/boomerang.svg",
      inf_t3: "infantry/battle-axe.svg",
      scout: "infantry/heavy-arrow.svg",
      cav_t1: "cavalry/horse-head.svg",
      cav_t2: "cavalry/chess-knight.svg",
      cav_t3: "cavalry/elephant.svg",
      ram: "infantry/crowbar.svg",
      catapult: "powder.svg",
      chief: "infantry/orb-wand.svg",
      settler: "resources/cash-pile.svg",
    },
    training: {
      inf_t1: { building: "barracks", timeSeconds: 1200 },
      inf_t2: { building: "barracks", timeSeconds: 1440 },
      inf_t3: { building: "barracks", timeSeconds: 1680 },
      scout: { building: "barracks", timeSeconds: 1280 },
      cav_t1: { building: "stable", timeSeconds: 1600 },
      cav_t2: { building: "stable", timeSeconds: 2200 },
      cav_t3: { building: "stable", timeSeconds: 2800 },
      ram: { building: "workshop", timeSeconds: 4600 },
      catapult: { building: "workshop", timeSeconds: 9000 },
      chief: { building: "residence", timeSeconds: 90720 },
      settler: { building: "residence", timeSeconds: 26920 },
    },
    troops: {
      inf_t1: {
        name: "Libyan Spearman",
        description: "Levy spearmen from Libyan subject cities — solid line infantry.",
        stats: { attack: 35, defenseInfantry: 40, defenseCavalry: 45, speed: 6, carry: 45 },
        cost: { wood: 110, clay: 95, iron: 120, crop: 35 },
        cropUpkeep: 1,
      },
      inf_t2: {
        name: "Balearic Slinger",
        description: "Famous island skirmishers — weak in melee, strong vs unarmored hosts.",
        stats: { attack: 45, defenseInfantry: 25, defenseCavalry: 20, speed: 8, carry: 30 },
        cost: { wood: 130, clay: 80, iron: 55, crop: 45 },
        cropUpkeep: 1,
      },
      inf_t3: {
        name: "Sacred Band",
        description: "Citizen elite of Carthage — costly, disciplined heavy infantry.",
        stats: { attack: 65, defenseInfantry: 55, defenseCavalry: 40, speed: 6, carry: 50 },
        cost: { wood: 160, clay: 150, iron: 200, crop: 90 },
        cropUpkeep: 1,
      },
      scout: {
        name: "Numidian Scout",
        description: "Light riders used for reconnaissance across Maghreb plains.",
        stats: { attack: 0, defenseInfantry: 18, defenseCavalry: 12, speed: 17, carry: 0 },
        cost: { wood: 130, clay: 140, iron: 25, crop: 40 },
        cropUpkeep: 2,
      },
      cav_t1: {
        name: "Numidian Cavalry",
        description: "Swift javelin horsemen — Hannibal’s screening and pursuit arm.",
        stats: { attack: 110, defenseInfantry: 50, defenseCavalry: 45, speed: 16, carry: 90 },
        cost: { wood: 480, clay: 380, iron: 280, crop: 95 },
        cropUpkeep: 3,
      },
      cav_t2: {
        name: "Punic Noble Horse",
        description: "Armored citizen cavalry for decisive charges.",
        stats: { attack: 165, defenseInfantry: 70, defenseCavalry: 95, speed: 11, carry: 70 },
        cost: { wood: 540, clay: 600, iron: 720, crop: 170 },
        cropUpkeep: 4,
      },
      cav_t3: {
        name: "War Elephant",
        description: "North African elephants — shock vs infantry, slow and costly.",
        stats: { attack: 175, defenseInfantry: 85, defenseCavalry: 55, speed: 8, carry: 40 },
        cost: { wood: 600, clay: 520, iron: 650, crop: 220 },
        cropUpkeep: 5,
      },
      ram: {
        name: "Siege Ram",
        stats: { attack: 55, defenseInfantry: 30, defenseCavalry: 70, speed: 4, carry: 0 },
        cost: { wood: 880, clay: 350, iron: 480, crop: 70 },
        cropUpkeep: 3,
      },
      catapult: {
        name: "Stone Thrower",
        stats: { attack: 70, defenseInfantry: 55, defenseCavalry: 10, speed: 3, carry: 0 },
        cost: { wood: 920, clay: 1300, iron: 580, crop: 90 },
        cropUpkeep: 6,
      },
      chief: {
        name: "Suffete",
        description: "Elected magistrate-general empowered to receive cities.",
        stats: { attack: 45, defenseInfantry: 40, defenseCavalry: 30, speed: 4, carry: 0 },
        cost: { wood: 30000, clay: 27000, iron: 44000, crop: 36000 },
        cropUpkeep: 5,
      },
      settler: {
        name: "Colonist",
        stats: { attack: 0, defenseInfantry: 80, defenseCavalry: 80, speed: 5, carry: 3000 },
        cost: { wood: 5600, clay: 5200, iron: 7000, crop: 5400 },
        cropUpkeep: 1,
      },
    },
    hero: {
      name: "Punic Hero",
      description: "Carthaginian commander in the mold of Barcid generals — cavalry and elephant coordination.",
      stats: { attack: 105, defenseInfantry: 110, defenseCavalry: 105, speed: 9, carry: 100 },
      cropUpkeep: 6,
    },
  },
  {
    id: "persian",
    name: "Persians",
    era: "Achaemenid Empire (6th–4th c. BCE)",
    region: "Iranian plateau / Near East",
    theme: "Vast levy infantry, Immortals, and horse archers of the Great King",
    historicalContext:
      "Achaemenid armies combined subject levies with elite Immortals and Median/Persian cavalry; logistics and numbers mattered as much as shock.",
    keywords: ["persian", "persia", "achaemenid", "immortal", "darius", "xerxes", "median", "iran"],
    palette: { primary: "#6B2D5C", secondary: "#E8C547", notes: "Royal purple + sun gold" },
    archetype: "balanced",
    fightingStrengthPerPoint: 85,
    resourceProductionBonusPercent: 15,
    logos: {
      inf_t1: "infantry/stone-spear.svg",
      inf_t2: "infantry/heavy-arrow.svg",
      inf_t3: "infantry/flanged-mace.svg",
      scout: "infantry/arrowhead.svg",
      cav_t1: "cavalry/horse-head.svg",
      cav_t2: "cavalry/chess-knight.svg",
      cav_t3: "cavalry/camel-head.svg",
      ram: "infantry/war-pick.svg",
      catapult: "powder.svg",
      chief: "infantry/crescent-staff.svg",
      settler: "resources/grain.svg",
    },
    training: {
      inf_t1: { building: "barracks", timeSeconds: 900 },
      inf_t2: { building: "barracks", timeSeconds: 1200 },
      inf_t3: { building: "barracks", timeSeconds: 1600 },
      scout: { building: "barracks", timeSeconds: 1120 },
      cav_t1: { building: "stable", timeSeconds: 1680 },
      cav_t2: { building: "stable", timeSeconds: 2100 },
      cav_t3: { building: "stable", timeSeconds: 2300 },
      ram: { building: "workshop", timeSeconds: 4600 },
      catapult: { building: "workshop", timeSeconds: 9000 },
      chief: { building: "residence", timeSeconds: 90720 },
      settler: { building: "residence", timeSeconds: 26920 },
    },
    troops: {
      inf_t1: {
        name: "Sparabara",
        description: "Shield-bearer levy with spear and large pavise.",
        stats: { attack: 30, defenseInfantry: 45, defenseCavalry: 35, speed: 6, carry: 40 },
        cost: { wood: 100, clay: 90, iron: 80, crop: 35 },
        cropUpkeep: 1,
      },
      inf_t2: {
        name: "Takabara Archer",
        description: "Shielded bowmen supporting the battle line.",
        stats: { attack: 50, defenseInfantry: 30, defenseCavalry: 25, speed: 7, carry: 35 },
        cost: { wood: 140, clay: 90, iron: 60, crop: 50 },
        cropUpkeep: 1,
      },
      inf_t3: {
        name: "Immortal",
        description: "10,000 household infantry — elite of the Great King.",
        stats: { attack: 75, defenseInfantry: 50, defenseCavalry: 35, speed: 7, carry: 50 },
        cost: { wood: 170, clay: 160, iron: 220, crop: 95 },
        cropUpkeep: 1,
      },
      scout: {
        name: "Mounted Scout",
        stats: { attack: 0, defenseInfantry: 20, defenseCavalry: 10, speed: 16, carry: 0 },
        cost: { wood: 135, clay: 150, iron: 20, crop: 40 },
        cropUpkeep: 2,
      },
      cav_t1: {
        name: "Median Horseman",
        stats: { attack: 115, defenseInfantry: 55, defenseCavalry: 50, speed: 15, carry: 95 },
        cost: { wood: 500, clay: 400, iron: 300, crop: 100 },
        cropUpkeep: 3,
      },
      cav_t2: {
        name: "Persian Cataphract",
        description: "Early heavy horse with scale and kontos.",
        stats: { attack: 170, defenseInfantry: 85, defenseCavalry: 100, speed: 10, carry: 65 },
        cost: { wood: 560, clay: 620, iron: 780, crop: 180 },
        cropUpkeep: 4,
      },
      cav_t3: {
        name: "Camel Corps",
        description: "Desert camelry — unsettling to untrained horses.",
        stats: { attack: 140, defenseInfantry: 60, defenseCavalry: 70, speed: 12, carry: 110 },
        cost: { wood: 480, clay: 450, iron: 420, crop: 150 },
        cropUpkeep: 4,
      },
      ram: {
        name: "Siege Ram",
        stats: { attack: 60, defenseInfantry: 30, defenseCavalry: 75, speed: 4, carry: 0 },
        cost: { wood: 900, clay: 360, iron: 500, crop: 70 },
        cropUpkeep: 3,
      },
      catapult: {
        name: "Siege Engine",
        stats: { attack: 75, defenseInfantry: 60, defenseCavalry: 10, speed: 3, carry: 0 },
        cost: { wood: 950, clay: 1350, iron: 600, crop: 90 },
        cropUpkeep: 6,
      },
      chief: {
        name: "Satrap",
        stats: { attack: 50, defenseInfantry: 40, defenseCavalry: 30, speed: 4, carry: 0 },
        cost: { wood: 31000, clay: 27500, iron: 45000, crop: 37000 },
        cropUpkeep: 5,
      },
      settler: {
        name: "Settler",
        stats: { attack: 0, defenseInfantry: 80, defenseCavalry: 80, speed: 5, carry: 3000 },
        cost: { wood: 5800, clay: 5300, iron: 7200, crop: 5500 },
        cropUpkeep: 1,
      },
    },
    hero: {
      name: "Persian Hero",
      description: "Achaemenid royal companion — levy coordination and cavalry screens.",
      stats: { attack: 95, defenseInfantry: 115, defenseCavalry: 100, speed: 8, carry: 100 },
      cropUpkeep: 6,
    },
  },
  {
    id: "viking",
    name: "Vikings",
    era: "Viking Age (8th–11th c. CE)",
    region: "Scandinavia / North Sea",
    theme: "Raid-focused infantry, cheap aggression, limited heavy cavalry",
    historicalContext:
      "Norse warbands excelled at coastal raids and shield-wall fighting; horses were secondary to ships and axes.",
    keywords: ["viking", "norse", "scandinavia", "danish", "norwegian", "swedish", "varangian", "berserker"],
    palette: { primary: "#1A3A5C", secondary: "#A8B4C0", notes: "Fjord blue + iron silver" },
    archetype: "raider",
    fightingStrengthPerPoint: 85,
    logos: {
      inf_t1: "infantry/wood-club.svg",
      inf_t2: "infantry/battle-axe.svg",
      inf_t3: "infantry/war-axe.svg",
      scout: "infantry/heavy-arrow.svg",
      cav_t1: "cavalry/donkey.svg",
      cav_t2: "cavalry/horse-head.svg",
      cav_t3: "cavalry/chess-knight.svg",
      ram: "infantry/battered-axe.svg",
      catapult: "powder.svg",
      chief: "infantry/thor-hammer.svg",
      settler: "resources/wood-pile.svg",
    },
    training: {
      inf_t1: { building: "barracks", timeSeconds: 720 },
      inf_t2: { building: "barracks", timeSeconds: 1040 },
      inf_t3: { building: "barracks", timeSeconds: 1280 },
      scout: { building: "barracks", timeSeconds: 1120 },
      cav_t1: { building: "stable", timeSeconds: 1500 },
      cav_t2: { building: "stable", timeSeconds: 2000 },
      cav_t3: { building: "stable", timeSeconds: 2200 },
      ram: { building: "workshop", timeSeconds: 4600 },
      catapult: { building: "workshop", timeSeconds: 9000 },
      chief: { building: "residence", timeSeconds: 90720 },
      settler: { building: "residence", timeSeconds: 30000 },
    },
    troops: {
      inf_t1: {
        name: "Bondi",
        description: "Free farmer-warrior with spear and shield.",
        stats: { attack: 40, defenseInfantry: 30, defenseCavalry: 20, speed: 7, carry: 50 },
        cost: { wood: 85, clay: 70, iron: 55, crop: 30 },
        cropUpkeep: 1,
      },
      inf_t2: {
        name: "Hirdman",
        description: "Retinue axe-and-shield infantry.",
        stats: { attack: 55, defenseInfantry: 45, defenseCavalry: 25, speed: 6, carry: 40 },
        cost: { wood: 110, clay: 100, iron: 140, crop: 55 },
        cropUpkeep: 1,
      },
      inf_t3: {
        name: "Berserker",
        description: "Shock infantry — high attack, brittle defense.",
        stats: { attack: 85, defenseInfantry: 30, defenseCavalry: 20, speed: 8, carry: 45 },
        cost: { wood: 145, clay: 120, iron: 190, crop: 70 },
        cropUpkeep: 1,
      },
      scout: {
        name: "Scout",
        stats: { attack: 0, defenseInfantry: 15, defenseCavalry: 10, speed: 15, carry: 0 },
        cost: { wood: 120, clay: 130, iron: 20, crop: 35 },
        cropUpkeep: 2,
      },
      cav_t1: {
        name: "Raider Horse",
        stats: { attack: 100, defenseInfantry: 45, defenseCavalry: 40, speed: 15, carry: 110 },
        cost: { wood: 420, clay: 350, iron: 260, crop: 85 },
        cropUpkeep: 3,
      },
      cav_t2: {
        name: "Huscarl Rider",
        stats: { attack: 145, defenseInfantry: 65, defenseCavalry: 80, speed: 11, carry: 75 },
        cost: { wood: 500, clay: 520, iron: 650, crop: 150 },
        cropUpkeep: 4,
      },
      cav_t3: {
        name: "Jarl’s Guard",
        stats: { attack: 155, defenseInfantry: 70, defenseCavalry: 85, speed: 12, carry: 80 },
        cost: { wood: 520, clay: 540, iron: 680, crop: 160 },
        cropUpkeep: 4,
      },
      ram: {
        name: "Ram",
        stats: { attack: 65, defenseInfantry: 25, defenseCavalry: 70, speed: 4, carry: 0 },
        cost: { wood: 850, clay: 340, iron: 480, crop: 65 },
        cropUpkeep: 3,
      },
      catapult: {
        name: "Catapult",
        stats: { attack: 70, defenseInfantry: 50, defenseCavalry: 10, speed: 3, carry: 0 },
        cost: { wood: 900, clay: 1250, iron: 560, crop: 85 },
        cropUpkeep: 6,
      },
      chief: {
        name: "Jarl",
        stats: { attack: 55, defenseInfantry: 35, defenseCavalry: 25, speed: 5, carry: 0 },
        cost: { wood: 28000, clay: 25000, iron: 40000, crop: 34000 },
        cropUpkeep: 5,
      },
      settler: {
        name: "Settler",
        stats: { attack: 0, defenseInfantry: 80, defenseCavalry: 80, speed: 5, carry: 3000 },
        cost: { wood: 5500, clay: 5000, iron: 6800, crop: 5200 },
        cropUpkeep: 1,
      },
    },
    hero: {
      name: "Norse Hero",
      description: "Sea-king war-leader — raid tempo and infantry shock.",
      stats: { attack: 120, defenseInfantry: 95, defenseCavalry: 85, speed: 9, carry: 120 },
      cropUpkeep: 6,
    },
  },
  {
    id: "byzantine",
    name: "Byzantines",
    era: "Eastern Roman Empire (6th–11th c. CE)",
    region: "Anatolia / Balkans / eastern Mediterranean",
    theme: "Cataphracts, disciplined themes, and combined-arms doctrine",
    historicalContext:
      "Byzantine armies emphasized professional cavalry (cataphracts), thematic infantry, and engineered siegecraft inherited from Rome.",
    keywords: ["byzantine", "byzantium", "eastern roman", "cataphract", "constantinople", "theme", "greek fire"],
    palette: { primary: "#2C3E6B", secondary: "#D4AF37", notes: "Imperial blue + mosaic gold" },
    archetype: "cavalry",
    fightingStrengthPerPoint: 95,
    logos: {
      inf_t1: "infantry/gladius.svg",
      inf_t2: "infantry/stone-spear.svg",
      inf_t3: "infantry/crossbow.svg",
      scout: "infantry/heavy-arrow.svg",
      cav_t1: "cavalry/horse-head.svg",
      cav_t2: "cavalry/chess-knight.svg",
      cav_t3: "cavalry/elephant.svg",
      ram: "infantry/crowbar.svg",
      catapult: "powder.svg",
      chief: "infantry/baton.svg",
      settler: "resources/brick-pile.svg",
    },
    training: {
      inf_t1: { building: "barracks", timeSeconds: 1400 },
      inf_t2: { building: "barracks", timeSeconds: 1600 },
      inf_t3: { building: "barracks", timeSeconds: 1800 },
      scout: { building: "stable", timeSeconds: 1360 },
      cav_t1: { building: "stable", timeSeconds: 2200 },
      cav_t2: { building: "stable", timeSeconds: 2800 },
      cav_t3: { building: "stable", timeSeconds: 3000 },
      ram: { building: "workshop", timeSeconds: 4600 },
      catapult: { building: "workshop", timeSeconds: 9000 },
      chief: { building: "residence", timeSeconds: 90720 },
      settler: { building: "residence", timeSeconds: 26920 },
    },
    troops: {
      inf_t1: {
        name: "Skutatos",
        description: "Thematic heavy infantry with spear and large shield.",
        stats: { attack: 38, defenseInfantry: 50, defenseCavalry: 55, speed: 5, carry: 45 },
        cost: { wood: 125, clay: 110, iron: 155, crop: 40 },
        cropUpkeep: 1,
      },
      inf_t2: {
        name: "Akontistes",
        description: "Javelin light infantry screening the line.",
        stats: { attack: 40, defenseInfantry: 35, defenseCavalry: 30, speed: 8, carry: 35 },
        cost: { wood: 115, clay: 95, iron: 90, crop: 45 },
        cropUpkeep: 1,
      },
      inf_t3: {
        name: "Toxotes",
        description: "Professional archers of the tagmata / themes.",
        stats: { attack: 60, defenseInfantry: 35, defenseCavalry: 25, speed: 7, carry: 40 },
        cost: { wood: 155, clay: 140, iron: 120, crop: 70 },
        cropUpkeep: 1,
      },
      scout: {
        name: "Prokoursator",
        stats: { attack: 0, defenseInfantry: 22, defenseCavalry: 12, speed: 16, carry: 0 },
        cost: { wood: 145, clay: 160, iron: 25, crop: 45 },
        cropUpkeep: 2,
      },
      cav_t1: {
        name: "Trapezites",
        description: "Light cavalry for pursuit and screening.",
        stats: { attack: 125, defenseInfantry: 60, defenseCavalry: 55, speed: 15, carry: 95 },
        cost: { wood: 540, clay: 430, iron: 330, crop: 105 },
        cropUpkeep: 3,
      },
      cav_t2: {
        name: "Cataphract",
        description: "Fully armored shock cavalry — Byzantine signature.",
        stats: { attack: 190, defenseInfantry: 90, defenseCavalry: 110, speed: 9, carry: 60 },
        cost: { wood: 580, clay: 680, iron: 850, crop: 200 },
        cropUpkeep: 5,
      },
      cav_t3: {
        name: "Klibanophoros",
        description: "Super-heavy household cavalry.",
        stats: { attack: 175, defenseInfantry: 95, defenseCavalry: 115, speed: 8, carry: 55 },
        cost: { wood: 600, clay: 700, iron: 900, crop: 210 },
        cropUpkeep: 5,
      },
      ram: {
        name: "Battering Ram",
        stats: { attack: 60, defenseInfantry: 35, defenseCavalry: 75, speed: 4, carry: 0 },
        cost: { wood: 920, clay: 370, iron: 510, crop: 75 },
        cropUpkeep: 3,
      },
      catapult: {
        name: "Petrobolos",
        stats: { attack: 80, defenseInfantry: 65, defenseCavalry: 10, speed: 3, carry: 0 },
        cost: { wood: 980, clay: 1400, iron: 620, crop: 95 },
        cropUpkeep: 6,
      },
      chief: {
        name: "Strategos",
        stats: { attack: 50, defenseInfantry: 45, defenseCavalry: 35, speed: 4, carry: 0 },
        cost: { wood: 32000, clay: 28000, iron: 46000, crop: 38000 },
        cropUpkeep: 5,
      },
      settler: {
        name: "Settler",
        stats: { attack: 0, defenseInfantry: 80, defenseCavalry: 80, speed: 5, carry: 3000 },
        cost: { wood: 5900, clay: 5400, iron: 7300, crop: 5600 },
        cropUpkeep: 1,
      },
    },
    hero: {
      name: "Byzantine Hero",
      description: "Theme commander schooled in combined arms and siege.",
      stats: { attack: 110, defenseInfantry: 125, defenseCavalry: 115, speed: 8, carry: 100 },
      cropUpkeep: 6,
    },
  },
  {
    id: "mongol",
    name: "Mongols",
    era: "Mongol Empire (13th c. CE)",
    region: "Eurasian steppe",
    theme: "Horse-archer dominance, extreme mobility, weak static defense",
    historicalContext:
      "Mongol tumens mastered mounted archery, feigned retreats, and operational mobility across the steppe.",
    keywords: ["mongol", "mongolia", "genghis", "chinggis", "steppe", "horde", "tatar", "yuan"],
    palette: { primary: "#3E2723", secondary: "#C62828", notes: "Steppe leather + blood red" },
    archetype: "cavalry",
    fightingStrengthPerPoint: 80,
    logos: {
      inf_t1: "infantry/arrowhead.svg",
      inf_t2: "infantry/double-shot.svg",
      inf_t3: "infantry/tomahawk.svg",
      scout: "infantry/flying-shuriken.svg",
      cav_t1: "cavalry/horse-head.svg",
      cav_t2: "cavalry/chess-knight.svg",
      cav_t3: "animals/pegasus.svg",
      ram: "infantry/war-pick.svg",
      catapult: "powder.svg",
      chief: "infantry/baton.svg",
      settler: "resources/rolled-paper.svg",
    },
    training: {
      inf_t1: { building: "barracks", timeSeconds: 800 },
      inf_t2: { building: "barracks", timeSeconds: 1100 },
      inf_t3: { building: "barracks", timeSeconds: 1200 },
      scout: { building: "barracks", timeSeconds: 1000 },
      cav_t1: { building: "stable", timeSeconds: 1300 },
      cav_t2: { building: "stable", timeSeconds: 1600 },
      cav_t3: { building: "stable", timeSeconds: 1800 },
      ram: { building: "workshop", timeSeconds: 4600 },
      catapult: { building: "workshop", timeSeconds: 9000 },
      chief: { building: "residence", timeSeconds: 90720 },
      settler: { building: "residence", timeSeconds: 26920 },
    },
    troops: {
      inf_t1: {
        name: "DisMounted Archer",
        description: "Steppe warriors fighting on foot when needed.",
        stats: { attack: 35, defenseInfantry: 25, defenseCavalry: 20, speed: 8, carry: 40 },
        cost: { wood: 90, clay: 70, iron: 50, crop: 35 },
        cropUpkeep: 1,
      },
      inf_t2: {
        name: "Kheshig Guard",
        description: "Household infantry escort — tougher than levy foot.",
        stats: { attack: 50, defenseInfantry: 40, defenseCavalry: 30, speed: 7, carry: 35 },
        cost: { wood: 120, clay: 100, iron: 130, crop: 55 },
        cropUpkeep: 1,
      },
      inf_t3: {
        name: "Siege Levy",
        description: "Conscript engineers and auxiliaries for assaults.",
        stats: { attack: 55, defenseInfantry: 35, defenseCavalry: 25, speed: 6, carry: 45 },
        cost: { wood: 140, clay: 130, iron: 150, crop: 60 },
        cropUpkeep: 1,
      },
      scout: {
        name: "Mangudai Scout",
        stats: { attack: 0, defenseInfantry: 15, defenseCavalry: 15, speed: 18, carry: 0 },
        cost: { wood: 125, clay: 135, iron: 20, crop: 40 },
        cropUpkeep: 2,
      },
      cav_t1: {
        name: "Light Horse Archer",
        description: "Core Mongol arm — speed and harassment.",
        stats: { attack: 130, defenseInfantry: 40, defenseCavalry: 45, speed: 17, carry: 100 },
        cost: { wood: 450, clay: 360, iron: 250, crop: 90 },
        cropUpkeep: 3,
      },
      cav_t2: {
        name: "Heavy Lancers",
        description: "Armored cavalry for the final shock.",
        stats: { attack: 175, defenseInfantry: 70, defenseCavalry: 90, speed: 13, carry: 80 },
        cost: { wood: 520, clay: 560, iron: 700, crop: 160 },
        cropUpkeep: 4,
      },
      cav_t3: {
        name: "Mangudai Elite",
        description: "Veteran tumen horse archers.",
        stats: { attack: 160, defenseInfantry: 55, defenseCavalry: 65, speed: 16, carry: 90 },
        cost: { wood: 500, clay: 480, iron: 520, crop: 150 },
        cropUpkeep: 4,
      },
      ram: {
        name: "Captured Ram",
        stats: { attack: 55, defenseInfantry: 25, defenseCavalry: 65, speed: 4, carry: 0 },
        cost: { wood: 860, clay: 340, iron: 470, crop: 65 },
        cropUpkeep: 3,
      },
      catapult: {
        name: "Traction Trebuchet",
        stats: { attack: 75, defenseInfantry: 50, defenseCavalry: 10, speed: 3, carry: 0 },
        cost: { wood: 930, clay: 1280, iron: 580, crop: 85 },
        cropUpkeep: 6,
      },
      chief: {
        name: "Noyan",
        stats: { attack: 50, defenseInfantry: 35, defenseCavalry: 30, speed: 5, carry: 0 },
        cost: { wood: 29000, clay: 26000, iron: 42000, crop: 35000 },
        cropUpkeep: 5,
      },
      settler: {
        name: "Settler",
        stats: { attack: 0, defenseInfantry: 80, defenseCavalry: 80, speed: 5, carry: 3000 },
        cost: { wood: 5600, clay: 5100, iron: 7000, crop: 5300 },
        cropUpkeep: 1,
      },
    },
    hero: {
      name: "Mongol Hero",
      description: "Ordu commander — operational mobility and horse-archer doctrine.",
      stats: { attack: 115, defenseInfantry: 90, defenseCavalry: 95, speed: 12, carry: 110 },
      cropUpkeep: 6,
    },
  },
  {
    id: "japanese",
    name: "Japanese",
    era: "Sengoku / late medieval Japan (15th–16th c. CE)",
    region: "Japanese archipelago",
    theme: "Ashigaru masses, samurai quality, weak native cavalry tradition",
    historicalContext:
      "Sengoku armies mixed ashigaru pike and arquebus lines with samurai retainers; cavalry existed but infantry decided most battles.",
    keywords: ["japanese", "japan", "samurai", "ashigaru", "sengoku", "shogun", "bushido", "naginata"],
    palette: { primary: "#8B1A1A", secondary: "#F5F0E6", notes: "Lacquer red + rice-paper cream" },
    archetype: "infantry",
    fightingStrengthPerPoint: 90,
    logos: {
      inf_t1: "infantry/stone-spear.svg",
      inf_t2: "infantry/kusarigama.svg",
      inf_t3: "infantry/machete.svg",
      scout: "infantry/shuriken.svg",
      cav_t1: "cavalry/horse-head.svg",
      cav_t2: "cavalry/chess-knight.svg",
      cav_t3: "cavalry/donkey.svg",
      ram: "infantry/crowbar.svg",
      catapult: "powder.svg",
      chief: "infantry/baton.svg",
      settler: "resources/wheat-pile.svg",
    },
    training: {
      inf_t1: { building: "barracks", timeSeconds: 960 },
      inf_t2: { building: "barracks", timeSeconds: 1200 },
      inf_t3: { building: "barracks", timeSeconds: 1500 },
      scout: { building: "barracks", timeSeconds: 1100 },
      cav_t1: { building: "stable", timeSeconds: 2000 },
      cav_t2: { building: "stable", timeSeconds: 2400 },
      cav_t3: { building: "stable", timeSeconds: 2500 },
      ram: { building: "workshop", timeSeconds: 4600 },
      catapult: { building: "workshop", timeSeconds: 9000 },
      chief: { building: "residence", timeSeconds: 90720 },
      settler: { building: "residence", timeSeconds: 26920 },
    },
    troops: {
      inf_t1: {
        name: "Ashigaru Yari",
        description: "Pike ashigaru — backbone of Sengoku armies.",
        stats: { attack: 35, defenseInfantry: 45, defenseCavalry: 55, speed: 6, carry: 40 },
        cost: { wood: 100, clay: 85, iron: 100, crop: 35 },
        cropUpkeep: 1,
      },
      inf_t2: {
        name: "Ashigaru Yumi",
        description: "Bow ashigaru supporting the spear line.",
        stats: { attack: 50, defenseInfantry: 30, defenseCavalry: 25, speed: 7, carry: 30 },
        cost: { wood: 130, clay: 90, iron: 70, crop: 45 },
        cropUpkeep: 1,
      },
      inf_t3: {
        name: "Samurai",
        description: "Elite retainers — costly, versatile melee.",
        stats: { attack: 80, defenseInfantry: 55, defenseCavalry: 40, speed: 7, carry: 45 },
        cost: { wood: 170, clay: 160, iron: 230, crop: 100 },
        cropUpkeep: 1,
      },
      scout: {
        name: "Shinobi Scout",
        stats: { attack: 0, defenseInfantry: 20, defenseCavalry: 10, speed: 16, carry: 0 },
        cost: { wood: 130, clay: 145, iron: 30, crop: 40 },
        cropUpkeep: 2,
      },
      cav_t1: {
        name: "Ki Cavalry",
        stats: { attack: 110, defenseInfantry: 55, defenseCavalry: 50, speed: 14, carry: 90 },
        cost: { wood: 520, clay: 420, iron: 340, crop: 100 },
        cropUpkeep: 3,
      },
      cav_t2: {
        name: "Samurai Cavalry",
        stats: { attack: 160, defenseInfantry: 75, defenseCavalry: 95, speed: 11, carry: 70 },
        cost: { wood: 560, clay: 620, iron: 760, crop: 175 },
        cropUpkeep: 4,
      },
      cav_t3: {
        name: "Hatamoto Horse",
        stats: { attack: 150, defenseInfantry: 70, defenseCavalry: 85, speed: 12, carry: 75 },
        cost: { wood: 540, clay: 580, iron: 700, crop: 160 },
        cropUpkeep: 4,
      },
      ram: {
        name: "Ram",
        stats: { attack: 60, defenseInfantry: 30, defenseCavalry: 75, speed: 4, carry: 0 },
        cost: { wood: 900, clay: 360, iron: 500, crop: 70 },
        cropUpkeep: 3,
      },
      catapult: {
        name: "Hōsha",
        stats: { attack: 75, defenseInfantry: 60, defenseCavalry: 10, speed: 3, carry: 0 },
        cost: { wood: 950, clay: 1350, iron: 600, crop: 90 },
        cropUpkeep: 6,
      },
      chief: {
        name: "Daimyō",
        stats: { attack: 50, defenseInfantry: 40, defenseCavalry: 30, speed: 4, carry: 0 },
        cost: { wood: 30500, clay: 27000, iron: 44500, crop: 37000 },
        cropUpkeep: 5,
      },
      settler: {
        name: "Settler",
        stats: { attack: 0, defenseInfantry: 80, defenseCavalry: 80, speed: 5, carry: 3000 },
        cost: { wood: 5800, clay: 5300, iron: 7200, crop: 5500 },
        cropUpkeep: 1,
      },
    },
    hero: {
      name: "Japanese Hero",
      description: "Sengoku warlord — infantry discipline and retainer quality.",
      stats: { attack: 110, defenseInfantry: 120, defenseCavalry: 95, speed: 8, carry: 100 },
      cropUpkeep: 6,
    },
  },
];

const REFS = [
  "inf_t1",
  "inf_t2",
  "inf_t3",
  "scout",
  "cav_t1",
  "cav_t2",
  "cav_t3",
  "ram",
  "catapult",
  "chief",
  "settler",
];

/**
 * @param {string} query
 * @returns {CultureProfile | null}
 */
export function matchProfile(query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return null;
  for (const p of CULTURE_PROFILES) {
    if (p.id === q || p.name.toLowerCase() === q) return p;
  }
  let best = null;
  let bestScore = 0;
  for (const p of CULTURE_PROFILES) {
    let score = 0;
    for (const kw of p.keywords) {
      if (q.includes(kw) || kw.includes(q)) score += kw.length;
    }
    if (q.includes(p.name.toLowerCase())) score += 20;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore > 0 ? best : null;
}

/** @returns {{ id: string, name: string, era: string, region: string, theme: string, historicalContext: string, archetype: string, palette: object }[]} */
export function listProfileSummaries() {
  return CULTURE_PROFILES.map((p) => ({
    id: p.id,
    name: p.name,
    era: p.era,
    region: p.region,
    theme: p.theme,
    historicalContext: p.historicalContext,
    archetype: p.archetype,
    palette: p.palette,
  }));
}

export function getProfile(id) {
  return CULTURE_PROFILES.find((p) => p.id === id) || null;
}

export { REFS };
