/**
 * Historical troop-name lexicon for custom tribe generation.
 * Scope: roughly 2000 BCE – 1500 CE across major military cultures.
 *
 * Travian slots stay fixed (11 troops + hero). This dictionary supplies
 * culturally specific labels so free-form tribes do not collapse to
 * generic "Spearman / Light Cavalry / Siege Ram" everywhere.
 *
 * Sources (survey): Wikipedia siege-engine lists; Britannica phalanx /
 * cataphract / trebuchet; Greek psiloi / hoplite / peltast terminology;
 * Byzantine skoutatoi / klibanophoroi; Islamic furusiyya (faris, ghazi,
 * mamluk); Persian Immortals / sparabara; Egyptian Medjay; Celtic /
 * Norse / Chinese / Japanese / Indian troop traditions as commonly
 * attested in secondary military-history summaries.
 */

/** Inclusive historical window this lexicon targets. */
export const LEXICON_ERA = { fromYear: -2000, toYear: 1500 };

/** @typedef {Record<string, string[]>} SlotPools */
/** @typedef {{ id: string, label: string, years: [number, number], match: string[], archetype?: string, palette?: { primary: string, secondary: string }, era?: string, region?: string, logos?: Record<string, string>, units: SlotPools }} CultureLexicon */

const SLOTS = [
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
  "hero",
];

/** Cross-cultural siege vocabulary (Assyria → late medieval). */
export const SIEGE_LEXICON = {
  ram: [
    "Battering Ram",
    "Siege Ram",
    "Covered Ram",
    "Gate Ram",
    "Timber Ram",
    "Iron-shod Ram",
    "Tortoise Ram",
  ],
  catapult: [
    "Stone Thrower",
    "Catapult",
    "Ballista",
    "Onager",
    "Mangonel",
    "Traction Trebuchet",
    "Counterweight Trebuchet",
    "Scorpio",
    "Oxybeles",
    "Lithobolos",
    "Springald",
    "Petrary",
  ],
};

/** Generic fallbacks when no culture pack matches. */
export const GENERIC_UNITS = {
  inf_t1: ["Spearman", "Militia", "Footman", "Shield Bearer", "Line Infantry", "Pikeman"],
  inf_t2: ["Archer", "Skirmisher", "Slinger", "Javelin Thrower", "Swordsman", "Axeman", "Crossbowman"],
  inf_t3: ["Champion", "Guard", "Veteran", "Shock Infantry", "Heavy Infantry", "Elite Guard"],
  scout: ["Scout", "Outrider", "Watcher", "Ranger", "Pathfinder", "Courier"],
  cav_t1: ["Light Cavalry", "Rider", "Horse Archer", "Scout Cavalry", "Mounted Javelin"],
  cav_t2: ["Lancer", "Heavy Cavalry", "Shock Cavalry", "Cataphract", "Knight"],
  cav_t3: ["Guard Cavalry", "Royal Cavalry", "Household Horse", "Elite Cavalry"],
  ram: SIEGE_LEXICON.ram,
  catapult: SIEGE_LEXICON.catapult,
  chief: ["Chief", "Warlord", "Governor", "Captain", "Warden"],
  settler: ["Settler", "Colonist", "Pioneer"],
  hero: ["Hero"],
};

/**
 * Culture packs with historical unit-name pools (2000 BCE – 1500 CE).
 * First entries in each pool are preferred defaults; later entries add variety.
 * @type {CultureLexicon[]}
 */
export const CULTURE_LEXICONS = [
  {
    id: "egyptian",
    label: "Egyptian / Nubian Nile",
    years: [-2000, -300],
    match: ["egypt", "egyptian", "pharaoh", "nile", "nubia", "nubian", "medjay", "kush", "thebes"],
    archetype: "infantry",
    palette: { primary: "#C4A35A", secondary: "#1B3A4B" },
    era: "Bronze Age Nile",
    region: "Egypt & Nubia",
    units: {
      inf_t1: ["Spearman", "Shield Bearer", "Nubian Spearman", "Conscription Spearman"],
      inf_t2: ["Nubian Archer", "Composite Bowman", "Javelin Thrower", "Axeman"],
      inf_t3: ["Medjay", "Royal Guard", "Sherden Mercenary", "Close-Combat Infantry"],
      scout: ["Desert Ranger", "Medjay Scout", "Frontier Watcher"],
      cav_t1: ["Chariot Runner", "Light Chariot", "Horse Scout"],
      cav_t2: ["War Chariot", "Maryannu Chariot"],
      cav_t3: ["Royal Chariot", "Elite Chariot"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Stone Thrower", "Siege Engine"],
      chief: ["Nomarch", "Vizier", "Commander"],
      settler: ["Colony Settler", "Frontier Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "assyrian",
    label: "Assyrian / Mesopotamian",
    years: [-1200, -600],
    match: ["assyria", "assyrian", "mesopotamia", "babylon", "babylonian", "sumer", "akkad", "nineveh"],
    archetype: "infantry",
    palette: { primary: "#5C2B2B", secondary: "#C4A35A" },
    era: "Iron Age Mesopotamia",
    region: "Tigris–Euphrates",
    units: {
      inf_t1: ["Spearman", "Shield Bearer", "Auxiliary Spearman"],
      inf_t2: ["Archer", "Slinger", "Javelin Thrower"],
      inf_t3: ["Heavy Infantry", "Royal Guard", "Siege Infantry"],
      scout: ["Outrider", "Frontier Scout"],
      cav_t1: ["Light Cavalry", "Horse Scout"],
      cav_t2: ["Lancer", "Heavy Cavalry"],
      cav_t3: ["Royal Cavalry", "Chariot Guard"],
      ram: ["Battering Ram", "Covered Ram", "Siege Tower Crew"],
      catapult: ["Stone Thrower", "Siege Engine"],
      chief: ["Governor", "Turtanu", "Commander"],
      settler: ["Deportation Settler", "Colony Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "israelite",
    label: "Israelite / Levantine Iron Age",
    years: [-1200, -500],
    match: ["israelite", "israelites", "israel", "hebrew", "hebrews", "judean", "judeans", "judah", "biblical", "canaan"],
    archetype: "infantry",
    palette: { primary: "#1A3C6E", secondary: "#C9A227" },
    era: "Biblical / Iron Age Levant",
    region: "Levant",
    units: {
      // "Levy" is intentional Israelite muster language — keep it on every inf_t1 variant.
      inf_t1: ["Levy Spearman", "Levy Shield Bearer", "Levy Footman"],
      inf_t2: ["Slinger", "Archer", "Javelin Thrower"],
      inf_t3: ["Gibbor", "Royal Guard", "Champion"],
      scout: ["Watchman", "Hill Scout"],
      cav_t1: ["Chariot Runner", "Light Horse"],
      cav_t2: ["Royal Chariot", "Lancer"],
      cav_t3: ["Horse Guard", "Royal Cavalry"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Stone Thrower", "Petrary"],
      chief: ["Elder", "Judge", "Captain"],
      settler: ["Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "greek",
    label: "Greek / Hellenistic",
    years: [-800, -100],
    match: ["greek", "greece", "hellenic", "hellenistic", "hoplite", "phalanx", "sparta", "spartan", "athens", "macedon", "macedonian", "alexander"],
    archetype: "infantry",
    palette: { primary: "#1B3A4B", secondary: "#D4AF37" },
    era: "Classical / Hellenistic Greece",
    region: "Aegean & Hellenic world",
    units: {
      inf_t1: ["Hoplite", "Phalangite", "Militia Hoplite", "Pikeman"],
      inf_t2: ["Peltast", "Psiloi", "Toxotes", "Slinger", "Javelin Skirmisher"],
      inf_t3: ["Hypaspist", "Sacred Band", "Veteran Hoplite", "Agema"],
      scout: ["Prodromoi Scout", "Light Scout"],
      cav_t1: ["Hippeus", "Light Horse", "Prodromoi"],
      cav_t2: ["Companion Cavalry", "Hetairoi", "Lancer"],
      cav_t3: ["Royal Cavalry", "Agema Cavalry"],
      ram: ["Battering Ram", "Helepolis Ram"],
      catapult: ["Oxybeles", "Ballista", "Lithobolos", "Catapult"],
      chief: ["Strategos", "Polemarch", "Archon"],
      settler: ["Cleruch", "Colony Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "roman",
    label: "Roman / Italic",
    years: [-500, 500],
    match: ["roman", "rome", "legion", "legionary", "latin", "italic", "republic", "imperial rome"],
    archetype: "infantry",
    palette: { primary: "#5C2B2B", secondary: "#C0C0C0" },
    era: "Roman Republic / Empire",
    region: "Italy & Mediterranean",
    logos: { inf_t3: "infantry/gladius.svg" },
    units: {
      inf_t1: ["Hastatus", "Legionary Recruit", "Auxiliary Spearman", "Militia"],
      inf_t2: ["Princeps", "Auxiliary Archer", "Velite", "Swordsman"],
      inf_t3: ["Triarius", "Praetorian", "Veteran Legionary", "Evocatus"],
      scout: ["Explorator", "Speculator", "Courier Scout"],
      cav_t1: ["Equites", "Auxiliary Cavalry", "Light Horse"],
      cav_t2: ["Ala Cavalry", "Heavy Cavalry", "Cataphractarius"],
      cav_t3: ["Praetorian Cavalry", "Equites Singulares"],
      ram: ["Aries", "Battering Ram", "Testudo Ram"],
      catapult: ["Ballista", "Onager", "Scorpio", "Carroballista"],
      chief: ["Centurion", "Legate", "Tribune"],
      settler: ["Colonist", "Veteran Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "persian",
    label: "Persian / Iranian",
    years: [-600, 650],
    match: ["persian", "persia", "achaemenid", "sasanian", "sassanid", "iran", "iranian", "immortal", "sparabara", "parthian"],
    archetype: "cavalry",
    palette: { primary: "#6B2D2D", secondary: "#E6B422" },
    era: "Achaemenid / Sasanian Iran",
    region: "Iranian plateau",
    units: {
      inf_t1: ["Sparabara", "Shield Bearer", "Foot Spearman"],
      inf_t2: ["Takabara", "Archer", "Slinger"],
      inf_t3: ["Immortal", "Apple Bearer", "Daylami Infantry"],
      scout: ["Outrider", "Frontier Scout"],
      cav_t1: ["Horse Archer", "Light Cavalry", "Asavaran Scout"],
      cav_t2: ["Cataphract", "Clibanarius", "Lancer"],
      cav_t3: ["Savaran", "Royal Cataphract", "Grivpanvar"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Stone Thrower", "Mangonel", "Ballista"],
      chief: ["Satrap", "Spahbed", "Commander"],
      settler: ["Colony Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "carthaginian",
    label: "Carthaginian / Punic",
    years: [-800, -100],
    match: ["carthage", "carthaginian", "punic", "phoenician", "hannibal"],
    archetype: "cavalry",
    palette: { primary: "#1A3C6E", secondary: "#C9A227" },
    era: "Punic wars era",
    region: "North Africa & western Mediterranean",
    units: {
      inf_t1: ["Libyan Spearman", "Citizen Militia", "Shield Bearer"],
      inf_t2: ["Balearic Slinger", "Numidian Javelin", "Archer"],
      inf_t3: ["Sacred Band", "Veteran Infantry", "Iberian Swordsman"],
      scout: ["Numidian Scout", "Coast Watcher"],
      cav_t1: ["Numidian Cavalry", "Light Horse"],
      cav_t2: ["Citizen Cavalry", "Heavy Cavalry"],
      cav_t3: ["War Elephant", "Elephant Guard"],
      ram: ["Battering Ram", "Siege Ram"],
      catapult: ["Ballista", "Catapult", "Stone Thrower"],
      chief: ["Sufete", "General", "Commander"],
      settler: ["Colony Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "celtic",
    label: "Celtic / Gallic",
    years: [-500, 500],
    match: ["celtic", "celt", "gaul", "gaulish", "gallic", "briton", "pict", "gaesatae", "boii"],
    archetype: "raider",
    palette: { primary: "#2D4A22", secondary: "#C4A35A" },
    era: "Celtic Iron Age",
    region: "Gaul, Britain & Alpine marches",
    units: {
      inf_t1: ["Spearman", "Clan Warrior", "Shield Bearer"],
      inf_t2: ["Javelin Skirmisher", "Slinger", "Axeman"],
      inf_t3: ["Gaesatae", "Sword Champion", "Oathsworn"],
      scout: ["Tracker", "Forest Scout"],
      cav_t1: ["Light Horse", "Raider"],
      cav_t2: ["Noble Cavalry", "Shock Rider"],
      cav_t3: ["Chariot", "War Chariot", "Household Cavalry"],
      ram: ["Timber Ram", "Siege Ram"],
      catapult: ["Stone Thrower", "Petrary"],
      chief: ["Chieftain", "Ri", "Warlord"],
      settler: ["Clan Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "germanic",
    label: "Germanic / Early medieval north",
    years: [-100, 1000],
    match: ["germanic", "teuton", "teutonic", "frank", "saxon", "goth", "vandal", "lombard", "alamanni"],
    archetype: "raider",
    palette: { primary: "#4A4E69", secondary: "#C0C0C0" },
    era: "Migration / early medieval",
    region: "Germania & successor kingdoms",
    units: {
      inf_t1: ["Spearman", "Free Freeman", "Shield Bearer"],
      inf_t2: ["Axeman", "Skirmisher", "Archer"],
      inf_t3: ["Huscarl", "Housecarl", "Champion", "Hearthguard"],
      scout: ["Tracker", "Border Scout"],
      cav_t1: ["Light Rider", "Raider"],
      cav_t2: ["Shock Cavalry", "Noble Rider"],
      cav_t3: ["Comitatus Cavalry", "Guard Cavalry"],
      ram: ["Timber Ram", "Siege Ram"],
      catapult: ["Stone Thrower", "Mangonel"],
      chief: ["Warlord", "Duke", "Jarl"],
      settler: ["Folk Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "norse",
    label: "Norse / Viking",
    years: [700, 1100],
    match: ["norse", "viking", "scandinavia", "scandinavian", "dane", "swedish", "norwegian", "varangian", "longship"],
    archetype: "raider",
    palette: { primary: "#1B3A4B", secondary: "#A8DADC" },
    era: "Viking Age",
    region: "Scandinavia & North Sea",
    units: {
      inf_t1: ["Bondi", "Spearman", "Shield Bearer"],
      inf_t2: ["Archer", "Skirmisher", "Axeman"],
      inf_t3: ["Huscarl", "Berserker", "Hirdman", "Varangian"],
      scout: ["Coast Watcher", "Tracker"],
      cav_t1: ["Shore Rider", "Light Horse"],
      cav_t2: ["Heavy Raider", "Shock Rider"],
      cav_t3: ["Hird Cavalry", "Guard Cavalry"],
      ram: ["Ship Ram", "Timber Ram"],
      catapult: ["Stone Thrower", "Deck Catapult"],
      chief: ["Jarl", "Sea King", "Hersir"],
      settler: ["Colony Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "byzantine",
    label: "Byzantine / East Roman",
    years: [500, 1453],
    match: ["byzantine", "byzantium", "east roman", "constantinople", "roman empire east", "skoutatoi", "kataphrakt"],
    archetype: "defensive",
    palette: { primary: "#4A1C6B", secondary: "#D4AF37" },
    era: "Byzantine Empire",
    region: "Eastern Mediterranean",
    units: {
      inf_t1: ["Skoutatos", "Spearman", "Militia"],
      inf_t2: ["Toxotes", "Peltast", "Akritai Skirmisher"],
      inf_t3: ["Varangian Guard", "Optimatoi", "Heavy Infantry"],
      scout: ["Akritai Scout", "Courier Scout"],
      cav_t1: ["Light Horse", "Trapezitos", "Horse Archer"],
      cav_t2: ["Kataphraktos", "Klibanophoros", "Lancer"],
      cav_t3: ["Tagmatic Cavalry", "Imperial Cavalry"],
      ram: ["Battering Ram", "Siege Ram"],
      catapult: ["Ballista", "Mangonel", "Springald", "Trebuchet"],
      chief: ["Strategos", "Domestikos", "Governor"],
      settler: ["Theme Settler", "Colonist"],
      hero: ["Hero"],
    },
  },
  {
    id: "arab",
    label: "Arab / early Islamic",
    years: [500, 1500],
    match: [
      "arab",
      "arabs",
      "arabian",
      "arabia",
      "ishmaelite",
      "ishmaelites",
      "quraysh",
      "ghassan",
      "lakhmid",
      "nabatean",
      "nabateans",
      "nabataean",
      "nabataeans",
      "mamluk",
      "saracen",
    ],
    archetype: "cavalry",
    palette: { primary: "#6B3F2A", secondary: "#E6B422" },
    era: "Arabian / Islamic frontier",
    region: "Arabia & Near East",
    logos: {
      cav_t1: "cavalry/camel-head.svg",
      cav_t3: "cavalry/camel-head.svg",
      chief: "infantry/crescent-staff.svg",
    },
    units: {
      inf_t1: ["Foot Spearman", "Tribal Spearman", "Shield Bearer", "Askari"],
      inf_t2: ["Archer", "Javelin Skirmisher", "Slinger"],
      inf_t3: ["Ghazi", "Mamluk Infantry", "Heavy Askari"],
      scout: ["Desert Scout", "Outrider"],
      cav_t1: ["Camel Rider", "Light Faris", "Horse Archer"],
      cav_t2: ["Faris", "Mamluk", "Lancer"],
      cav_t3: ["Heavy Faris", "Royal Mamluk", "Ghulam Cavalry"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Mangonel", "Trebuchet", "Ballista"],
      chief: ["Sheikh", "Emir", "Amir"],
      settler: ["Clan Settler", "Oasis Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "desert",
    label: "Desert / Maghreb frontier",
    years: [-500, 1500],
    match: [
      "desert",
      "sand",
      "camel",
      "bedouin",
      "sahara",
      "maghreb",
      "andalus",
      "oasis",
      "dune",
      "berber",
      "moor",
      "moors",
      "hejaz",
      "najd",
      "yemen",
      "amalekite",
      "amalekites",
    ],
    archetype: "cavalry",
    palette: { primary: "#8B5E3C", secondary: "#E8C547" },
    era: "Desert / arid frontier",
    region: "Desert marches",
    logos: { cav_t1: "cavalry/camel-head.svg", cav_t3: "cavalry/camel-head.svg" },
    units: {
      inf_t1: ["Tribal Spearman", "Oasis Militia", "Shield Bearer"],
      inf_t2: ["Javelin Skirmisher", "Archer", "Slinger"],
      inf_t3: ["Desert Guard", "Veteran Warrior", "Camel Guard Infantry"],
      scout: ["Dune Scout", "Desert Ranger"],
      cav_t1: ["Camel Rider", "Light Horse", "Numidian Rider"],
      cav_t2: ["Heavy Camel", "Faris", "Lancer"],
      cav_t3: ["Camel Guard", "Desert Cataphract", "Noble Faris"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Sand Catapult", "Mangonel", "Stone Thrower"],
      chief: ["Emir", "Sheikh", "Chieftain"],
      settler: ["Oasis Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "steppe",
    label: "Steppe nomad",
    years: [-800, 1500],
    match: ["steppe", "nomad", "horde", "mongol", "mongolian", "scythian", "sarmatian", "hun", "huns", "turk", "khagan", "yurt", "horse archer"],
    archetype: "cavalry",
    palette: { primary: "#4A6741", secondary: "#C4A35A" },
    era: "Steppe nomad",
    region: "Eurasian steppe",
    units: {
      inf_t1: ["Camp Guard", "Foot Spearman", "Wagon Guard"],
      inf_t2: ["Foot Archer", "Skirmisher"],
      inf_t3: ["Keshig Infantry", "Heavy Infantry", "DisMounted Elite"],
      scout: ["Outrider Scout", "Horse Scout"],
      cav_t1: ["Horse Archer", "Light Cavalry", "Vanguard Rider"],
      cav_t2: ["Lancer", "Heavy Cavalry", "Shock Rider"],
      cav_t3: ["Keshig", "Noyan Guard", "Cataphract"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Traction Trebuchet", "Mangonel", "Stone Thrower"],
      chief: ["Khan", "Khagan", "Noyan"],
      settler: ["Ordu Settler", "Camp Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "indian",
    label: "Indian subcontinent",
    years: [-500, 1500],
    match: ["indian", "india", "maurya", "mauryan", "gupta", "tamil", "chola", "rajput", "kshatriya", "magadha"],
    archetype: "cavalry",
    palette: { primary: "#8B4513", secondary: "#E8C547" },
    era: "Classical / medieval India",
    region: "Indian subcontinent",
    units: {
      inf_t1: ["Spearman", "Shield Bearer", "Militia"],
      inf_t2: ["Bowman", "Javelin Thrower", "Swordsman"],
      inf_t3: ["Kshatriya Warrior", "Heavy Infantry", "Palace Guard"],
      scout: ["Forest Scout", "Outrider"],
      cav_t1: ["Light Horse", "Horse Archer"],
      cav_t2: ["Lancer", "Heavy Cavalry", "Cataphract"],
      cav_t3: ["War Elephant", "Elephant Guard", "Royal Cavalry"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Lithobolos", "Stone Thrower", "Mangonel"],
      chief: ["Raja", "Senapati", "Commander"],
      settler: ["Village Settler", "Colony Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "chinese",
    label: "Chinese",
    years: [-1000, 1500],
    match: ["chinese", "china", "han", "tang", "song", "warring states", "qin", "ming", "crossbow"],
    archetype: "infantry",
    palette: { primary: "#8B1E1E", secondary: "#D4AF37" },
    era: "Classical / imperial China",
    region: "East Asia",
    units: {
      inf_t1: ["Spearman", "Militia", "Shield Bearer", "Pikeman"],
      inf_t2: ["Crossbowman", "Archer", "Skirmisher"],
      inf_t3: ["Heavy Infantry", "Guard", "Ji Infantryman"],
      scout: ["Scout", "Frontier Watcher"],
      cav_t1: ["Light Cavalry", "Horse Archer"],
      cav_t2: ["Lancer", "Heavy Cavalry", "Cataphract"],
      cav_t3: ["Guard Cavalry", "Imperial Cavalry"],
      ram: ["Battering Ram", "Assault Wagon", "Siege Ram"],
      catapult: ["Traction Trebuchet", "Mangonel", "Counterweight Trebuchet", "Ballista"],
      chief: ["General", "Commander", "Prefect"],
      settler: ["Colony Settler", "Frontier Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "japanese",
    label: "Japanese",
    years: [700, 1500],
    match: ["japanese", "japan", "samurai", "ashigaru", "shogun", "bushido", "yamato"],
    archetype: "infantry",
    palette: { primary: "#1A1A2E", secondary: "#C0C0C0" },
    era: "Heian–Sengoku Japan",
    region: "Japanese archipelago",
    units: {
      inf_t1: ["Ashigaru Spearman", "Yari Ashigaru", "Militia"],
      inf_t2: ["Ashigaru Archer", "Skirmisher", "Naginata Warrior"],
      inf_t3: ["Samurai", "Hatamoto", "Elite Samurai"],
      scout: ["Shinobi Scout", "Pathfinder"],
      cav_t1: ["Light Cavalry", "Mounted Ashigaru"],
      cav_t2: ["Samurai Cavalry", "Lancer"],
      cav_t3: ["Hatamoto Cavalry", "Guard Cavalry"],
      ram: ["Siege Ram", "Timber Ram"],
      catapult: ["Stone Thrower", "Trebuchet", "Mangonel"],
      chief: ["Daimyo", "Taisho", "Commander"],
      settler: ["Village Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "european",
    label: "Medieval European",
    years: [800, 1500],
    match: [
      "medieval",
      "knight",
      "feudal",
      "crusader",
      "norman",
      "english",
      "french",
      "castile",
      "castilian",
      "holy roman",
      "billman",
      "longbow",
    ],
    archetype: "infantry",
    palette: { primary: "#2B2D42", secondary: "#D4AF37" },
    era: "High / late medieval Europe",
    region: "Western & Central Europe",
    units: {
      inf_t1: ["Spearman", "Militia", "Levy Footman", "Pikeman"],
      inf_t2: ["Longbowman", "Crossbowman", "Billman", "Archer"],
      inf_t3: ["Man-at-Arms", "Sergeant", "DisMounted Knight"],
      scout: ["Scout", "Forester", "Outrider"],
      cav_t1: ["Hobelar", "Light Horse", "Mounted Sergeant"],
      cav_t2: ["Knight", "Lancer", "Heavy Cavalry"],
      cav_t3: ["Household Knight", "Royal Cavalry", "Banneret"],
      ram: ["Battering Ram", "Siege Ram", "Covered Ram"],
      catapult: ["Mangonel", "Trebuchet", "Springald", "Ballista"],
      chief: ["Lord", "Castellan", "Captain"],
      settler: ["Colonist", "Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "naval",
    label: "Seafaring / pirate",
    years: [-500, 1500],
    match: ["naval", "pirate", "sea", "coast", "island", "corsair", "fleet", "galley"],
    archetype: "raider",
    palette: { primary: "#1B3A4B", secondary: "#C0C0C0" },
    era: "Seafaring age",
    region: "Coasts & islands",
    units: {
      inf_t1: ["Oarsman", "Marine", "Deck Spearman"],
      inf_t2: ["Raider", "Archer", "Javelin Thrower"],
      inf_t3: ["Boarding Elite", "Marine Guard", "Veteran Raider"],
      scout: ["Coast Watcher", "Lookout"],
      cav_t1: ["Shore Rider", "Light Horse"],
      cav_t2: ["Heavy Raider", "Shock Rider"],
      cav_t3: ["Guard Cavalry", "Landing Cavalry"],
      ram: ["Ship Ram", "Beak Ram", "Timber Ram"],
      catapult: ["Deck Catapult", "Ballista", "Stone Thrower"],
      chief: ["Sea Chief", "Admiral", "Corsair Captain"],
      settler: ["Colony Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "forest",
    label: "Woodland / ambush",
    years: [-1000, 1500],
    match: ["forest", "woodland", "jungle", "druid", "hunter", "ranger", "ambush"],
    archetype: "defensive",
    palette: { primary: "#2D4A22", secondary: "#A3C585" },
    era: "Woodland realm",
    region: "Deep forest",
    units: {
      inf_t1: ["Woodsman", "Spearman", "Militia"],
      inf_t2: ["Hunter", "Archer", "Skirmisher"],
      inf_t3: ["Forest Guard", "Ambush Elite", "Warden"],
      scout: ["Pathfinder", "Tracker"],
      cav_t1: ["Forest Rider", "Light Horse"],
      cav_t2: ["Stag Cavalry", "Heavy Horse"],
      cav_t3: ["Warden Cavalry", "Guard Cavalry"],
      ram: ["Timber Ram", "Siege Ram"],
      catapult: ["Tree Thrower", "Stone Thrower", "Mangonel"],
      chief: ["Chieftain", "Warden", "Ranger Captain"],
      settler: ["Grove Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "mountain",
    label: "Highland / mountain",
    years: [-1000, 1500],
    match: ["mountain", "highland", "alpine", "cliff", "peak", "dwarf", "fortress"],
    archetype: "defensive",
    palette: { primary: "#4A4E69", secondary: "#9A8C98" },
    era: "Highland / mountain",
    region: "Highlands",
    units: {
      inf_t1: ["Hill Spearman", "Militia", "Shield Bearer"],
      inf_t2: ["Axeman", "Skirmisher", "Slinger"],
      inf_t3: ["Mountain Guard", "Hold Guard", "Veteran"],
      scout: ["Cliff Scout", "Goat Path Scout"],
      cav_t1: ["Hill Rider", "Light Horse"],
      cav_t2: ["Heavy Horse", "Lancer"],
      cav_t3: ["Peak Cavalry", "Hold Cavalry"],
      ram: ["Stone Ram", "Siege Ram"],
      catapult: ["Rock Thrower", "Mangonel", "Onager"],
      chief: ["Highland Chief", "Thane", "Lord"],
      settler: ["Hold Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "imperial",
    label: "Generic imperial / city-state",
    years: [-500, 1500],
    match: ["empire", "imperial", "city-state", "kingdom", "royal", "noble", "city"],
    archetype: "infantry",
    palette: { primary: "#5C2B2B", secondary: "#D4AF37" },
    era: "Imperial age",
    region: "Heartland cities",
    units: {
      inf_t1: ["City Spearman", "Militia", "Watch Spearman"],
      inf_t2: ["Swordsman", "Archer", "Crossbowman"],
      inf_t3: ["Elite Guard", "Palace Guard", "Praetorian"],
      scout: ["Courier Scout", "City Scout"],
      cav_t1: ["Light Horse", "City Cavalry"],
      cav_t2: ["Knight", "Lancer", "Heavy Cavalry"],
      cav_t3: ["Royal Cavalry", "Household Guard"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Siege Engine", "Mangonel", "Trebuchet", "Ballista"],
      chief: ["Governor", "Prefect", "Captain"],
      settler: ["Colonist"],
      hero: ["Hero"],
    },
  },
  {
    id: "arctic",
    label: "Arctic / frost frontier",
    years: [-500, 1500],
    match: ["arctic", "ice", "frost", "snow", "tundra", "glacier", "winter"],
    archetype: "defensive",
    palette: { primary: "#1B3A4B", secondary: "#A8DADC" },
    era: "Frozen frontier",
    region: "Tundra / ice marches",
    units: {
      inf_t1: ["Frost Footman", "Spearman", "Militia"],
      inf_t2: ["Ice Skirmisher", "Archer", "Axeman"],
      inf_t3: ["Glacier Guard", "Huscarl", "Veteran"],
      scout: ["Snow Scout", "Tracker"],
      cav_t1: ["Frost Rider", "Light Horse"],
      cav_t2: ["Ice Lancer", "Heavy Cavalry"],
      cav_t3: ["Winter Cavalry", "Guard Cavalry"],
      ram: ["Ice Ram", "Timber Ram"],
      catapult: ["Frost Catapult", "Stone Thrower", "Mangonel"],
      chief: ["Jarl", "Warlord", "Thane"],
      settler: ["Hold Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "tribal",
    label: "Tribal / barbarian",
    years: [-2000, 1500],
    match: ["barbarian", "tribal", "berserk", "savage", "war paint", "clan folk"],
    archetype: "raider",
    palette: { primary: "#6B2D2D", secondary: "#C4A35A" },
    era: "Tribal age",
    region: "Wild marches",
    units: {
      inf_t1: ["Clan Warrior", "Spearman", "Footman"],
      inf_t2: ["Berserker", "Skirmisher", "Axeman"],
      inf_t3: ["War Champion", "Oathsworn", "Elite Warrior"],
      scout: ["Tracker", "Outrider"],
      cav_t1: ["Raider", "Light Horse"],
      cav_t2: ["Shock Rider", "Heavy Raider"],
      cav_t3: ["War Horse", "Guard Cavalry"],
      ram: ["Timber Ram", "Siege Ram"],
      catapult: ["Stone Thrower", "Petrary"],
      chief: ["Warlord", "Chieftain"],
      settler: ["Clan Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "undead",
    label: "Undead / necromantic (fantasy)",
    years: [0, 1500],
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
      inf_t1: ["Skeleton Warrior", "Bone Spearman", "Risen Militia"],
      inf_t2: ["Ghoul", "Skeleton Archer", "Wight Skirmisher"],
      inf_t3: ["Wight", "Death Guard", "Revenant"],
      scout: ["Shade", "Grave Scout"],
      cav_t1: ["Bone Rider", "Skeletal Horse"],
      cav_t2: ["Death Knight", "Black Rider"],
      cav_t3: ["Black Steed", "Necropolis Cavalry"],
      ram: ["Bone Ram", "Siege Ram"],
      catapult: ["Tomb Catapult", "Bone Thrower", "Mangonel"],
      chief: ["Lich", "Necromancer", "Death Lord"],
      settler: ["Necropolis Settler"],
      hero: ["Death Knight"],
    },
  },
];

/** Specific cultures beat biome / generic packs on equal scores. */
export const LEXICON_PRIORITY = {
  israelite: 4,
  arab: 4,
  egyptian: 3,
  assyrian: 3,
  greek: 3,
  roman: 3,
  persian: 3,
  carthaginian: 3,
  celtic: 3,
  germanic: 3,
  norse: 3,
  byzantine: 3,
  indian: 3,
  chinese: 3,
  japanese: 3,
  european: 3,
  undead: 2,
  desert: 1,
  steppe: 1,
  naval: 1,
  forest: 1,
  mountain: 1,
  imperial: 1,
  arctic: 1,
  tribal: 1,
};

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Stable FNV-1a hash for deterministic pool picks.
 * @param {string} s
 */
export function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param {string[]} pool
 * @param {string} seed
 * @param {string} salt
 */
export function pickFromPool(pool, seed, salt = "") {
  if (!pool?.length) return null;
  if (pool.length === 1) return pool[0];
  // Bias toward earlier (canonical) labels so signature names dominate,
  // while still allowing variety across different tribe seeds.
  const h = hashSeed(`${seed}|${salt}`);
  const weights = pool.map((_, i) => pool.length - i);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = h % total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[0];
}

/**
 * @param {{ match: string[] }} pack
 * @param {string} text
 * @param {string} nameText
 */
export function scoreLexiconPack(pack, text, nameText) {
  let score = 0;
  let nameHits = 0;
  for (const kw of pack.match) {
    const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
    if (re.test(text)) score += kw.length;
    if (re.test(nameText)) {
      score += kw.length + 4;
      nameHits += 1;
    }
  }
  return { score, nameHits };
}

function betterPack(candidate, candMeta, current, curMeta) {
  if (!current) return true;
  if (candMeta.score !== curMeta.score) return candMeta.score > curMeta.score;
  if (candMeta.nameHits !== curMeta.nameHits) return candMeta.nameHits > curMeta.nameHits;
  return (LEXICON_PRIORITY[candidate.id] || 0) > (LEXICON_PRIORITY[current.id] || 0);
}

/**
 * @param {string} text full lore corpus
 * @param {string} nameText stripped tribe-name corpus
 * @returns {CultureLexicon | null}
 */
export function matchCultureLexicon(text, nameText) {
  let best = null;
  let bestMeta = { score: 0, nameHits: 0 };
  for (const pack of CULTURE_LEXICONS) {
    const meta = scoreLexiconPack(pack, text, nameText);
    if (betterPack(pack, meta, best, bestMeta)) {
      best = pack;
      bestMeta = meta;
    }
  }
  return bestMeta.score > 0 ? best : null;
}

/**
 * Build a full 12-slot name sheet from a culture lexicon (or generic pools).
 * @param {CultureLexicon | null} culture
 * @param {string} seed tribe name (for stable variety)
 * @param {{ archetype?: string, weapons?: string[], mounts?: string[] }} [hints]
 * @returns {Record<string, string>}
 */
export function rosterFromLexicon(culture, seed, hints = {}) {
  const out = {};
  const weapons = hints.weapons || [];
  const mounts = hints.mounts || [];
  const archetype = hints.archetype || culture?.archetype || "balanced";

  for (const slot of SLOTS) {
    let pool = culture?.units?.[slot] || GENERIC_UNITS[slot] || ["Unit"];

    // Weapon / mount nudges on generic or overlapping pools
    if (!culture && slot === "inf_t1") {
      if (weapons.includes("phalanx") || weapons.includes("pike")) pool = ["Pikeman", "Phalangite", "Spearman"];
      else if (weapons.includes("spear")) pool = ["Spearman", "Shield Bearer", "Militia"];
      else if (weapons.includes("axe")) pool = ["Axeman", "Footman", "Militia"];
      else if (archetype === "defensive") pool = ["Militia", "Spearman", "Shield Bearer"];
      else if (archetype === "raider") pool = ["Footman", "Clan Warrior", "Spearman"];
    }
    if (!culture && slot === "inf_t2") {
      if (weapons.includes("bow")) pool = ["Archer", "Crossbowman", "Skirmisher"];
      else if (weapons.includes("sling")) pool = ["Slinger", "Skirmisher"];
      else if (weapons.includes("javelin")) pool = ["Javelin Thrower", "Skirmisher"];
      else if (weapons.includes("sword")) pool = ["Swordsman", "Warrior"];
      else if (weapons.includes("falx")) pool = ["Falxman", "Swordsman"];
    }
    if (!culture && (slot === "cav_t1" || slot === "cav_t2" || slot === "cav_t3")) {
      if (mounts.includes("camel")) {
        pool =
          slot === "cav_t1"
            ? ["Camel Rider", "Light Camel"]
            : slot === "cav_t2"
              ? ["Heavy Camel", "Faris"]
              : ["Camel Guard", "Noble Faris"];
      } else if (mounts.includes("elephant")) {
        pool =
          slot === "cav_t1"
            ? ["Light Horse", "Scout Cavalry"]
            : slot === "cav_t2"
              ? ["War Elephant", "Elephant Corps"]
              : ["Elephant Guard", "Royal Elephant"];
      } else if (mounts.includes("chariot")) {
        pool =
          slot === "cav_t1"
            ? ["Chariot", "Light Chariot"]
            : slot === "cav_t2"
              ? ["War Chariot", "Heavy Chariot"]
              : ["Royal Chariot", "Elite Chariot"];
      } else if (mounts.includes("horse-archer") || (archetype === "cavalry" && weapons.includes("bow"))) {
        pool =
          slot === "cav_t1"
            ? ["Horse Archer", "Light Cavalry"]
            : slot === "cav_t2"
              ? ["Lancer", "Heavy Cavalry"]
              : ["Guard Cavalry", "Elite Horse"];
      } else if (mounts.includes("cataphract")) {
        pool =
          slot === "cav_t1"
            ? ["Light Horse", "Scout Cavalry"]
            : slot === "cav_t2"
              ? ["Cataphract", "Clibanarius"]
              : ["Royal Cataphract", "Guard Cavalry"];
      } else if (mounts.includes("knight")) {
        pool =
          slot === "cav_t1"
            ? ["Hobelar", "Light Horse"]
            : slot === "cav_t2"
              ? ["Knight", "Lancer"]
              : ["Household Knight", "Royal Cavalry"];
      }
    }

    out[slot] = pickFromPool(pool, seed, `${culture?.id || "generic"}:${slot}`) || pool[0];
  }
  return out;
}

/**
 * Flat inventory of unique labels (for docs / audits).
 * @returns {{ cultures: number, uniqueNames: number, bySlot: Record<string, number> }}
 */
export function lexiconStats() {
  const names = new Set();
  const bySlot = Object.fromEntries(SLOTS.map((s) => [s, new Set()]));
  for (const c of CULTURE_LEXICONS) {
    for (const slot of SLOTS) {
      for (const n of c.units[slot] || []) {
        names.add(n.toLowerCase());
        bySlot[slot].add(n.toLowerCase());
      }
    }
  }
  for (const slot of SLOTS) {
    for (const n of GENERIC_UNITS[slot] || []) {
      names.add(n.toLowerCase());
      bySlot[slot].add(n.toLowerCase());
    }
  }
  return {
    cultures: CULTURE_LEXICONS.length,
    uniqueNames: names.size,
    bySlot: Object.fromEntries(Object.entries(bySlot).map(([k, v]) => [k, v.size])),
    era: LEXICON_ERA,
  };
}

export { SLOTS };
