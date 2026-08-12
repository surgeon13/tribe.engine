/**
 * Historical troop-name lexicon for custom tribe generation.
 * Scope: roughly 2000 BCE – 1500 CE across major military cultures.
 *
 * Travian slots stay fixed (11 troops + hero). This dictionary supplies
 * culturally specific labels so free-form tribes do not collapse to
 * generic "Spearman / Light Cavalry / Siege Ram" everywhere.
 *
 * Sources (survey): Wikipedia siege-engine / warfare pages; Britannica
 * phalanx, cataphract, trebuchet, Ottoman military; Greek psiloi / hoplite /
 * peltast; Byzantine skoutatoi / klibanophoroi; Islamic furusiyya; Persian
 * Immortals / sparabara; Egyptian Medjay; Hittite chariot armies; Dacian
 * falxmen; Aksumite sarwe; early Ottoman yaya / janissary / sipahi; Slavic
 * druzhina; Korean hwarang; Mesoamerican eagle / jaguar warrior societies;
 * Celtic / Norse / Chinese / Japanese / Indian traditions in secondary
 * military-history summaries (c. 2000 BCE – 1500 CE).
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
    "Aries",
    "Testudo Ram",
    "Helepolis Ram",
    "Assault Ram",
    "Ship Ram",
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
    "Carroballista",
    "Polybolos",
    "Gastraphetes",
    "Cheiroballistra",
    "Humbaracı Mortar",
  ],
};

/** Generic fallbacks when no culture pack matches. */
export const GENERIC_UNITS = {
  inf_t1: ["Spearman", "Militia", "Footman", "Shield Bearer", "Line Infantry", "Pikeman", "Town Guard", "Muster Footman"],
  inf_t2: ["Archer", "Skirmisher", "Slinger", "Javelin Thrower", "Swordsman", "Axeman", "Crossbowman", "Longbowman", "Billman"],
  inf_t3: ["Champion", "Guard", "Veteran", "Shock Infantry", "Heavy Infantry", "Elite Guard", "Man-at-Arms", "Household Guard"],
  scout: ["Scout", "Outrider", "Watcher", "Ranger", "Pathfinder", "Courier", "Frontier Scout", "Explorator"],
  cav_t1: ["Light Cavalry", "Rider", "Horse Archer", "Scout Cavalry", "Mounted Javelin", "Hobelar", "Mounted Skirmisher"],
  cav_t2: ["Lancer", "Heavy Cavalry", "Shock Cavalry", "Cataphract", "Knight", "Clibanarius", "Mounted Sergeant"],
  cav_t3: ["Guard Cavalry", "Royal Cavalry", "Household Horse", "Elite Cavalry", "Banneret", "Household Knight"],
  ram: SIEGE_LEXICON.ram,
  catapult: SIEGE_LEXICON.catapult,
  chief: ["Chief", "Warlord", "Governor", "Captain", "Warden", "Castellan", "Strategos"],
  settler: ["Settler", "Colonist", "Pioneer", "Village Settler"],
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
      inf_t1: ["Spearman", "Shield Bearer", "Nubian Spearman", "Conscription Spearman", "Nakhtu-Aa", "Marine Spearman", "Libyan Spearman"],
      inf_t2: ["Nubian Archer", "Composite Bowman", "Javelin Thrower", "Axeman", "Keftiu Archer", "Desert Bowman"],
      inf_t3: ["Medjay", "Royal Guard", "Sherden Mercenary", "Close-Combat Infantry", "Pharaoh's Guard", "Maryannu Elite"],
      scout: ["Desert Ranger", "Medjay Scout", "Frontier Watcher"],
      cav_t1: ["Chariot Runner", "Light Chariot", "Horse Scout", "Light Chariot Crew"],
      cav_t2: ["War Chariot", "Maryannu Chariot", "Battle Chariot"],
      cav_t3: ["Royal Chariot", "Elite Chariot"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Stone Thrower", "Siege Engine"],
      chief: ["Nomarch", "Vizier", "Commander", "Pharaoh's General"],
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
      inf_t1: ["Levy Spearman", "Levy Shield Bearer", "Levy Footman", "Muster Levy", "Benjaminite Spearman"],
      inf_t2: ["Slinger", "Archer", "Javelin Thrower", "Benjaminite Slinger", "Judean Archer"],
      inf_t3: ["Gibbor", "Royal Guard", "Champion", "Gibborim", "Cherethite Guard"],
      scout: ["Watchman", "Hill Scout", "Sentinel", "Hill Watch"],
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
      inf_t1: ["Hoplite", "Phalangite", "Militia Hoplite", "Pikeman", "Perioikoi Hoplite", "Spartiate Recruit", "Sarissa Pike"],
      inf_t2: ["Peltast", "Psiloi", "Toxotes", "Slinger", "Javelin Skirmisher", "Thracian Peltast", "Cretan Archer", "Rhodian Slinger"],
      inf_t3: ["Hypaspist", "Sacred Band", "Veteran Hoplite", "Agema", "Spartiate", "Argyraspides", "Pezhetairos"],
      scout: ["Prodromoi Scout", "Light Scout"],
      cav_t1: ["Hippeus", "Light Horse", "Prodromoi", "Tarentine Cavalry", "Thessalian Scout"],
      cav_t2: ["Companion Cavalry", "Hetairoi", "Lancer", "Thessalian Cavalry", "Xystophoros"],
      cav_t3: ["Royal Cavalry", "Agema Cavalry"],
      ram: ["Battering Ram", "Helepolis Ram"],
      catapult: ["Oxybeles", "Ballista", "Lithobolos", "Catapult", "Gastraphetes", "Polybolos"],
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
      inf_t1: ["Hastatus", "Legionary Recruit", "Auxiliary Spearman", "Militia", "Hastati", "Socii Spearman", "Auxilia"],
      inf_t2: ["Princeps", "Auxiliary Archer", "Velite", "Swordsman", "Principes", "Sagittarius", "Gladius Infantry"],
      inf_t3: ["Triarius", "Praetorian", "Veteran Legionary", "Evocatus", "Triarii", "Praetorian Guard", "First Cohort"],
      scout: ["Explorator", "Speculator", "Courier Scout", "Speculatores", "Exploratores"],
      cav_t1: ["Equites", "Auxiliary Cavalry", "Light Horse", "Equites Alares", "Numidian Ally"],
      cav_t2: ["Ala Cavalry", "Heavy Cavalry", "Cataphractarius", "Equites Extraordinarii", "Contarius"],
      cav_t3: ["Praetorian Cavalry", "Equites Singulares"],
      ram: ["Aries", "Battering Ram", "Testudo Ram"],
      catapult: ["Ballista", "Onager", "Scorpio", "Carroballista", "Cheiroballistra"],
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
      inf_t1: ["Sparabara", "Shield Bearer", "Foot Spearman", "Kardakes", "Persian Spearman"],
      inf_t2: ["Takabara", "Archer", "Slinger", "Sparabara Archer", "Scythian Ally Archer"],
      inf_t3: ["Immortal", "Apple Bearer", "Daylami Infantry", "Anusiya", "Immortal Guard"],
      scout: ["Outrider", "Frontier Scout"],
      cav_t1: ["Horse Archer", "Light Cavalry", "Asavaran Scout", "Asabaran Scout", "Median Horse"],
      cav_t2: ["Cataphract", "Clibanarius", "Lancer", "Grivpanvar", "Parthian Cataphract"],
      cav_t3: ["Savaran", "Royal Cataphract", "Grivpanvar", "Pushtegban", "Royal Savaran"],
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
    match: [
      "carthage",
      "carthaginian",
      "carthaginians",
      "punic",
      "phoenician",
      "phoenicians",
      "hannibal",
      "utica",
      "libyphoenician",
    ],
    archetype: "cavalry",
    palette: { primary: "#1A3C6E", secondary: "#C9A227" },
    era: "Punic wars era",
    region: "North Africa & western Mediterranean",
    units: {
      inf_t1: [
        "Libyan Spearman",
        "Citizen Militia",
        "Shield Bearer",
        "Libyphoenician Spearman",
        "Punic Militia",
      ],
      inf_t2: [
        "Balearic Slinger",
        "Numidian Javelin",
        "Archer",
        "Iberian Skirmisher",
        "Punic Archer",
      ],
      inf_t3: ["Sacred Band", "Veteran Infantry", "Iberian Swordsman", "Punic Heavy Infantry"],
      scout: ["Numidian Scout", "Coast Watcher", "Punic Outrider"],
      cav_t1: ["Numidian Cavalry", "Light Horse", "Libyan Rider"],
      cav_t2: ["Citizen Cavalry", "Heavy Cavalry", "Punic Lancer"],
      cav_t3: ["War Elephant", "Elephant Guard", "African Elephant"],
      ram: ["Battering Ram", "Siege Ram", "Covered Ram"],
      catapult: ["Ballista", "Catapult", "Stone Thrower", "Oxybeles"],
      chief: ["Sufete", "General", "Commander", "Shophet"],
      settler: ["Colony Settler", "Punic Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "celtic",
    label: "Celtic / Gallic / Brittonic",
    years: [-500, 500],
    match: [
      "celtic",
      "celt",
      "celts",
      "gaul",
      "gauls",
      "gaulish",
      "gallic",
      "briton",
      "britons",
      "brittonic",
      "pict",
      "picts",
      "gaesatae",
      "boii",
      "helvetii",
      "aedui",
      "iceni",
      "caledo",
      "irish",
      "gaelic",
      "welsh",
      "cymru",
    ],
    archetype: "raider",
    palette: { primary: "#2D4A22", secondary: "#C4A35A" },
    era: "Celtic Iron Age",
    region: "Gaul, Britain, Ireland & Alpine marches",
    units: {
      inf_t1: ["Spearman", "Clan Warrior", "Shield Bearer", "Kern Recruit", "Tribal Footman"],
      inf_t2: ["Javelin Skirmisher", "Slinger", "Axeman", "Kern", "Sling Warrior"],
      inf_t3: ["Gaesatae", "Sword Champion", "Oathsworn", "Gallowglass", "Fianna Warrior"],
      scout: ["Tracker", "Forest Scout", "Hill Watcher"],
      cav_t1: ["Light Horse", "Raider", "Mounted Skirmisher"],
      cav_t2: ["Noble Cavalry", "Shock Rider", "Chieftain's Horse"],
      cav_t3: ["Chariot", "War Chariot", "Household Cavalry", "Essedum"],
      ram: ["Timber Ram", "Siege Ram"],
      catapult: ["Stone Thrower", "Petrary"],
      chief: ["Chieftain", "Ri", "Warlord", "Brenin"],
      settler: ["Clan Settler", "Tuath Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "germanic",
    label: "Germanic / Early medieval north",
    years: [-100, 1000],
    match: [
      "germanic",
      "teuton",
      "teutons",
      "teutonic",
      "frank",
      "franks",
      "frankish",
      "saxon",
      "saxons",
      "goth",
      "goths",
      "vandal",
      "vandals",
      "lombard",
      "alamanni",
    ],
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
    label: "Norse / Scandinavian",
    years: [700, 1100],
    match: [
      "norse",
      "viking",
      "vikings",
      "scandinavia",
      "scandinavian",
      "dane",
      "danes",
      "danish",
      "sweden",
      "swedish",
      "swede",
      "swedes",
      "norway",
      "norwegian",
      "norwegians",
      "iceland",
      "icelandic",
      "geat",
      "geats",
      "gautar",
      "svear",
      "varangian",
      "varangians",
      "longship",
      "leidang",
      "hird",
      "jarl",
      "berserker",
      "nordic",
    ],
    archetype: "raider",
    palette: { primary: "#1B3A4B", secondary: "#A8DADC" },
    era: "Viking Age Scandinavia",
    region: "Scandinavia & North Sea",
    units: {
      inf_t1: [
        "Bondi",
        "Spearman",
        "Shield Bearer",
        "Leidang Spearman",
        "Bondi Militia",
        "Thingmann",
        "Karls Spearman",
      ],
      inf_t2: [
        "Archer",
        "Skirmisher",
        "Axeman",
        "Bogemann",
        "Viking Skirmisher",
        "Danish Axeman",
        "Bow Leidang",
      ],
      inf_t3: [
        "Huscarl",
        "Berserker",
        "Hirdman",
        "Varangian",
        "Huskarl",
        "Varangian Guard",
        "Ulfhednar",
        "Hird Elite",
        "Svear Champion",
      ],
      scout: ["Coast Watcher", "Tracker", "Fjord Scout", "Pathfinder"],
      cav_t1: ["Shore Rider", "Light Horse", "Hestmann", "Shore Raider", "Leidang Rider"],
      cav_t2: ["Heavy Raider", "Shock Rider", "Hird Rider"],
      cav_t3: ["Hird Cavalry", "Guard Cavalry", "Jarl's Horse"],
      ram: ["Ship Ram", "Timber Ram", "Beak Ram"],
      catapult: ["Stone Thrower", "Deck Catapult", "Petrary"],
      chief: ["Jarl", "Sea King", "Hersir", "Konungr"],
      settler: ["Colony Settler", "Landnam Settler"],
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
      inf_t1: ["Skoutatos", "Spearman", "Militia", "Skoutatoi Spearman", "Tagma Recruit"],
      inf_t2: ["Toxotes", "Peltast", "Akritai Skirmisher", "Toxotai", "Psiloi"],
      inf_t3: ["Varangian Guard", "Optimatoi", "Heavy Infantry", "Varangians", "Hetaireia"],
      scout: ["Akritai Scout", "Courier Scout"],
      cav_t1: ["Light Horse", "Trapezitos", "Horse Archer", "Prokoursatores", "Trapezitai"],
      cav_t2: ["Kataphraktos", "Klibanophoros", "Lancer", "Kataphraktoi", "Klibanophoroi"],
      cav_t3: ["Tagmatic Cavalry", "Imperial Cavalry", "Scholai Cavalry", "Vigla"],
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
      chief: "chiefs/scepter.svg",
      settler: "settlers/old-wagon.svg",
      ram: "rams/siege-tower.svg",
      catapult: "catapults/trebuchet.svg",
    },
    units: {
      inf_t1: ["Foot Spearman", "Tribal Spearman", "Shield Bearer", "Askari", "Murabit", "Ansari Foot"],
      inf_t2: ["Archer", "Javelin Skirmisher", "Slinger", "Rami Archer", "Najdi Skirmisher"],
      inf_t3: ["Ghazi", "Mamluk Infantry", "Heavy Askari", "Abna Infantry", "Mamluk Foot"],
      scout: ["Desert Scout", "Outrider"],
      cav_t1: ["Camel Rider", "Light Faris", "Horse Archer", "Fursan Scout", "Bedouin Rider"],
      cav_t2: ["Faris", "Mamluk", "Lancer", "Sipahi Ally", "Ghulam"],
      cav_t3: ["Heavy Faris", "Royal Mamluk", "Ghulam Cavalry", "Askari Elite", "Sultan's Faris"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Mangonel", "Trebuchet", "Ballista", "Manjaniq", "Arradah"],
      chief: ["Sheikh", "Emir", "Amir"],
      settler: ["Clan Settler", "Oasis Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "nabatean",
    label: "Nabataean / Petra",
    years: [-400, 200],
    match: [
      "nabatean",
      "nabateans",
      "nabataean",
      "nabataeans",
      "petra",
      "nabataea",
      "nabatea",
    ],
    archetype: "cavalry",
    palette: { primary: "#7A4A28", secondary: "#C4A35A" },
    era: "Nabataean Kingdom (4th c. BCE–2nd c. CE)",
    region: "Northwest Arabia / Petra",
    logos: {
      cav_t1: "cavalry/camel-head.svg",
      cav_t3: "cavalry/camel-head.svg",
      chief: "chiefs/diadem.svg",
      settler: "settlers/wheelbarrow.svg",
      ram: "rams/siege-ram.svg",
      catapult: "catapults/ballista.svg",
    },
    units: {
      inf_t1: ["Petra Spearman", "Rock Guard", "Caravan Militia", "Shield Bearer"],
      inf_t2: ["Desert Archer", "Javelin Skirmisher", "Slinger", "Cliff Skirmisher"],
      inf_t3: ["Petra Guard", "Royal Rock Guard", "Heavy Caravan Guard"],
      scout: ["Caravan Scout", "Wadi Scout", "Desert Outrider"],
      cav_t1: ["Camel Rider", "Light Desert Horse", "Caravan Escort"],
      cav_t2: ["Nabatean Lancer", "Heavy Camel", "Trade Route Faris"],
      cav_t3: ["Royal Camel Guard", "Petra Cataphract", "Noble Desert Horse"],
      ram: ["Siege Ram", "Battering Ram", "Covered Ram"],
      catapult: ["Stone Thrower", "Ballista", "Mangonel"],
      chief: ["King of Petra", "Ethnarch", "Caravan Lord"],
      settler: ["Oasis Settler", "Caravan Settler", "Petra Colonist"],
      hero: ["Hero"],
    },
  },
  {
    id: "desert",
    label: "Desert / arid frontier",
    years: [-500, 1500],
    match: [
      "desert",
      "sand",
      "camel",
      "bedouin",
      "sahara",
      "oasis",
      "dune",
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
      cav_t1: ["Camel Rider", "Light Horse", "Desert Rider"],
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
    id: "north_african",
    label: "North African / Berber / Maghreb",
    years: [-300, 1500],
    match: [
      "north african",
      "north africa",
      "maghreb",
      "maghrebi",
      "berber",
      "berbers",
      "amazigh",
      "numidian",
      "numidia",
      "numidians",
      "moor",
      "moors",
      "moorish",
      "andalus",
      "andalusia",
      "almoravid",
      "almohad",
      "hafsid",
      "marinid",
      "zirid",
      "fatimid",
      "tunis",
      "tunisia",
      "algeria",
      "algerian",
      "morocco",
      "moroccan",
      "mauretania",
      "mauretanian",
      "libya",
      "libyan",
      "kabyle",
      "tuareg",
    ],
    archetype: "cavalry",
    palette: { primary: "#6B3F2A", secondary: "#C9A227" },
    era: "Classical–medieval Maghreb",
    region: "North Africa",
    logos: { cav_t1: "cavalry/camel-head.svg", cav_t3: "cavalry/camel-head.svg" },
    units: {
      inf_t1: [
        "Zenata Spearman",
        "Tribal Footman",
        "Shield Bearer",
        "Maghrebi Militia",
        "Kabyle Spearman",
      ],
      inf_t2: [
        "Javelin Skirmisher",
        "Archer",
        "Slinger",
        "Berber Skirmisher",
        "Andalusi Archer",
      ],
      inf_t3: [
        "Black Guard",
        "Veteran Warrior",
        "Murabitun",
        "Almohad Infantry",
        "Heavy Askari",
      ],
      scout: ["Desert Scout", "Coast Watcher", "Atlas Scout"],
      cav_t1: [
        "Numidian Cavalry",
        "Light Horse",
        "Zenata Rider",
        "Camel Rider",
        "Berber Rider",
      ],
      cav_t2: ["Heavy Camel", "Faris", "Lancer", "Andalusi Cavalry", "Zenata Lancer"],
      cav_t3: [
        "Noble Faris",
        "Camel Guard",
        "Royal Cavalry",
        "Black Guard Cavalry",
        "Emir's Horse",
      ],
      ram: ["Siege Ram", "Battering Ram", "Covered Ram"],
      catapult: ["Mangonel", "Manjaniq", "Stone Thrower", "Trebuchet"],
      chief: ["Emir", "Sheikh", "Agellid", "Sultan"],
      settler: ["Oasis Settler", "Ribat Settler"],
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
      inf_t1: ["Camp Guard", "Foot Spearman", "Wagon Guard", "Keshig Camp Guard", "Wagon Spearman"],
      inf_t2: ["Foot Archer", "Skirmisher", "Dismounted Archer", "Mangudai Foot"],
      inf_t3: ["Keshig Infantry", "Heavy Infantry", "DisMounted Elite"],
      scout: ["Outrider Scout", "Horse Scout"],
      cav_t1: ["Horse Archer", "Light Cavalry", "Vanguard Rider", "Mangudai", "Vanguard Horse Archer"],
      cav_t2: ["Lancer", "Heavy Cavalry", "Shock Rider", "Bahadur", "Lancer Noyan"],
      cav_t3: ["Keshig", "Noyan Guard", "Cataphract", "Keshig Guard", "Tumen Elite"],
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
    match: [
      "indian",
      "india",
      "bharat",
      "maurya",
      "mauryan",
      "gupta",
      "tamil",
      "chola",
      "cholas",
      "pandya",
      "chera",
      "rajput",
      "rajputs",
      "kshatriya",
      "magadha",
      "maratha",
      "marathas",
      "vijayanagara",
      "delhi sultanate",
      "mughal",
      "mughals",
      "sikh",
      "punjab",
      "bengal",
      "kannauj",
      "pala",
      "rashtrakuta",
      "chalukya",
      "hoysala",
      "ahom",
      "naga",
      "gurjara",
      "pratihara",
      "yadava",
      "kerala",
      "deccan",
      "hindustan",
    ],
    archetype: "cavalry",
    palette: { primary: "#8B4513", secondary: "#E8C547" },
    era: "Classical / medieval India",
    region: "Indian subcontinent",
    units: {
      inf_t1: [
        "Spearman",
        "Shield Bearer",
        "Militia",
        "Paik",
        "Dhanushya Recruit",
        "Infantry Sepoy",
        "Village Footman",
      ],
      inf_t2: [
        "Bowman",
        "Javelin Thrower",
        "Swordsman",
        "Dhanurdhara",
        "Composite Bowman",
        "Katar Fighter",
        "Skirmisher",
      ],
      inf_t3: [
        "Kshatriya Warrior",
        "Heavy Infantry",
        "Palace Guard",
        "Rajput Warrior",
        "Gajapati Guard",
        "Maratha Infantry",
        "Urumi Warrior",
      ],
      scout: ["Forest Scout", "Outrider", "Hill Watcher", "Char Scout"],
      cav_t1: ["Light Horse", "Horse Archer", "Ashvaka", "Mounted Skirmisher", "Maratha Rider"],
      cav_t2: ["Lancer", "Heavy Cavalry", "Cataphract", "Rajput Cavalry", "Armoured Horse"],
      cav_t3: [
        "War Elephant",
        "Elephant Guard",
        "Royal Cavalry",
        "Gaja Corps",
        "Howdah Guard",
        "Mahout Guard",
      ],
      ram: ["Siege Ram", "Battering Ram", "Covered Ram"],
      catapult: ["Lithobolos", "Stone Thrower", "Mangonel", "Yantra", "Ballista"],
      chief: ["Raja", "Senapati", "Commander", "Maharaja", "Nayak"],
      settler: ["Village Settler", "Colony Settler", "Gram Settler"],
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
      inf_t1: ["Spearman", "Militia", "Shield Bearer", "Pikeman", "Bu Bing", "Halberdier", "Ji Militia"],
      inf_t2: ["Crossbowman", "Archer", "Skirmisher", "Nu Bing", "Crossbow Corps", "Chu-ko-nu Team"],
      inf_t3: ["Heavy Infantry", "Guard", "Ji Infantryman", "Wei Guard", "Tiger-Warrior"],
      scout: ["Scout", "Frontier Watcher"],
      cav_t1: ["Light Cavalry", "Horse Archer", "Qingqi", "Mounted Crossbow"],
      cav_t2: ["Lancer", "Heavy Cavalry", "Cataphract", "Tujue Ally Cavalry", "Heavy Lancer"],
      cav_t3: ["Guard Cavalry", "Imperial Cavalry"],
      ram: ["Battering Ram", "Assault Wagon", "Siege Ram"],
      catapult: ["Traction Trebuchet", "Mangonel", "Counterweight Trebuchet", "Ballista", "Pao", "Whirlwind Trebuchet"],
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
      inf_t1: ["Ashigaru Spearman", "Yari Ashigaru", "Militia", "Foot Samurai"],
      inf_t2: ["Ashigaru Archer", "Skirmisher", "Naginata Warrior", "Yumi Ashigaru", "Negoro Monk"],
      inf_t3: ["Samurai", "Hatamoto", "Elite Samurai", "Samurai Bushi", "Sohei"],
      scout: ["Shinobi Scout", "Pathfinder"],
      cav_t1: ["Light Cavalry", "Mounted Ashigaru", "Kihei", "Mounted Archer"],
      cav_t2: ["Samurai Cavalry", "Lancer", "Uma-Mawari"],
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
    label: "Western / Central medieval Europe",
    years: [800, 1500],
    match: [
      "medieval",
      "knight",
      "feudal",
      "crusader",
      "norman",
      "normans",
      "english",
      "england",
      "french",
      "france",
      "frank",
      "franks",
      "castile",
      "castilian",
      "spain",
      "spanish",
      "portugal",
      "portuguese",
      "holy roman",
      "german",
      "burgundy",
      "burgundian",
      "italian",
      "italy",
      "venice",
      "venetian",
      "genoa",
      "genoese",
      "milan",
      "swiss",
      "switzerland",
      "flemish",
      "flanders",
      "dutch",
      "holland",
      "scotland",
      "scottish",
      "scots",
      "billman",
      "longbow",
      "western europe",
      "west european",
      "angevin",
      "plantagenet",
      "capetian",
      "aragon",
      "aragonese",
    ],
    archetype: "infantry",
    palette: { primary: "#2B2D42", secondary: "#D4AF37" },
    era: "High / late medieval Western Europe",
    region: "Western & Central Europe",
    units: {
      inf_t1: [
        "Spearman",
        "Militia",
        "Muster Footman", "Pikeman",
        "Spearmen",
        "Burgher Militia",
        "Pavise Spearman",
        "Swiss Pikeman",
        "Communal Militia",
      ],
      inf_t2: [
        "Longbowman",
        "Crossbowman",
        "Billman",
        "Archer",
        "Yeoman Archer",
        "Genoese Crossbowman",
        "Halberdier",
        "Flemish Pike",
        "Voulgier",
      ],
      inf_t3: [
        "Man-at-Arms",
        "Sergeant",
        "Dismounted Knight",
        "Men-at-Arms",
        "Sergeant-at-Arms",
        "Knight Errant",
        "Swiss Halberdier",
        "Condottiere Foot",
      ],
      scout: ["Scout", "Forester", "Outrider", "March Watcher"],
      cav_t1: ["Hobelar", "Light Horse", "Mounted Sergeant", "Hobelars", "Coursers", "Jinetes"],
      cav_t2: ["Knight", "Lancer", "Heavy Cavalry", "Lances Fournies", "Gendarme", "Serjeant Cavalry"],
      cav_t3: ["Household Knight", "Royal Cavalry", "Banneret", "Gendarme Elite", "Oriflamme Guard"],
      ram: ["Battering Ram", "Siege Ram", "Covered Ram", "Sow"],
      catapult: ["Mangonel", "Trebuchet", "Springald", "Ballista", "Couillard", "Bricole"],
      chief: ["Lord", "Castellan", "Captain", "Constable", "Podesta"],
      settler: ["Colonist", "Settler", "Borough Settler"],
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
    id: "hittite",
    label: "Hittite / Anatolian",
    years: [-1700, -1100],
    match: ["hittite", "hittites", "hatti", "anatolia", "anatolian", "hattusa", "qadesh", "kadesh"],
    archetype: "infantry",
    palette: { primary: "#6B4423", secondary: "#C4A35A" },
    era: "Bronze Age Anatolia",
    region: "Anatolian highlands",
    units: {
      inf_t1: ["Hittite Spearman", "Anatolian Militia", "Shield Bearer", "Vassal Spearman"],
      inf_t2: ["Javelin Skirmisher", "Archer", "Slinger", "Mountain Skirmisher"],
      inf_t3: ["Royal Bodyguard", "Meshedi Guard", "Heavy Infantry", "Shock Infantry"],
      scout: ["Frontier Patrol", "Messenger Scout", "Highland Scout"],
      cav_t1: ["Chariot Runner", "Light Chariot", "Horse Scout"],
      cav_t2: ["Battle Chariot", "Three-Man Chariot", "Heavy Chariot"],
      cav_t3: ["Royal Chariot", "Elite Chariot Corps"],
      ram: ["Siege Ram", "Battering Ram", "Assault Cover"],
      catapult: ["Stone Thrower", "Siege Engine"],
      chief: ["Tuhkanti", "Gal Meshedi", "King's General"],
      settler: ["Colony Settler", "Hold Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "thracian",
    label: "Thracian / Balkan light infantry",
    years: [-600, 200],
    match: ["thracian", "thracians", "thrace", "thracia", "odrysian", "paeonian", "peltast", "rhomphaia"],
    archetype: "raider",
    palette: { primary: "#4A2C0A", secondary: "#C45C26" },
    era: "Classical Thrace",
    region: "Balkans",
    units: {
      inf_t1: ["Thracian Spearman", "Tribal Footman", "Shield Bearer"],
      inf_t2: ["Peltast", "Javelin Skirmisher", "Rhomphaia Skirmisher"],
      inf_t3: ["Rhomphaia Warrior", "Odrysian Champion", "Elite Peltast"],
      scout: ["Hill Scout", "Tracker", "Border Watcher"],
      cav_t1: ["Light Horse", "Thracian Rider", "Mounted Javelin"],
      cav_t2: ["Noble Cavalry", "Shock Rider"],
      cav_t3: ["Royal Cavalry", "Guard Cavalry"],
      ram: ["Timber Ram", "Siege Ram"],
      catapult: ["Stone Thrower", "Petrary"],
      chief: ["King", "Chieftain", "Warlord"],
      settler: ["Clan Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "dacian",
    label: "Dacian / Carpathian",
    years: [-200, 200],
    match: ["dacian", "dacians", "dacia", "decebalus", "falx", "falxman", "getae", "carpathian"],
    archetype: "raider",
    palette: { primary: "#2D4A22", secondary: "#C9A227" },
    era: "Dacian kingdoms",
    region: "Carpathians & Danube",
    units: {
      inf_t1: ["Dacian Spearman", "Tribal Footman", "Shield Bearer"],
      inf_t2: ["Archer", "Javelin Skirmisher", "Sica Fighter"],
      inf_t3: ["Falxman", "Falx Warrior", "Draco Champion"],
      scout: ["Mountain Scout", "Forest Tracker"],
      cav_t1: ["Light Horse", "Sarmatian Ally Scout"],
      cav_t2: ["Noble Cavalry", "Sarmatian Lancer"],
      cav_t3: ["Royal Cavalry", "Allied Cataphract"],
      ram: ["Timber Ram", "Siege Ram"],
      catapult: ["Stone Thrower", "Petrary"],
      chief: ["King", "Decebalus' Captain", "Warlord"],
      settler: ["Hold Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "slavic",
    label: "Eastern European / Slavic",
    years: [500, 1500],
    match: [
      "slav",
      "slavic",
      "slavs",
      "rus",
      "kievan",
      "druzhina",
      "polans",
      "wend",
      "wends",
      "polish",
      "poland",
      "pole",
      "poles",
      "serb",
      "serbs",
      "serbia",
      "bulgarian",
      "bulgarians",
      "bulgaria",
      "czech",
      "czechs",
      "bohemia",
      "bohemian",
      "moravia",
      "croatia",
      "croatian",
      "croatians",
      "bosnian",
      "bosnia",
      "lithuania",
      "lithuanian",
      "lithuanians",
      "ruthenia",
      "ruthenian",
      "ruthenians",
      "novgorod",
      "muscovy",
      "moscow",
      "eastern europe",
      "east european",
      "balkan",
      "balkans",
      "wallachia",
      "moldavia",
      "vlach",
      "boyar",
      "voivode",
    ],
    archetype: "infantry",
    palette: { primary: "#1B3A4B", secondary: "#8B9A6B" },
    era: "Medieval Eastern Europe",
    region: "Eastern & East-Central Europe",
    units: {
      inf_t1: [
        "Spearman",
        "Peasant Militia",
        "Shield Bearer",
        "Posad Militia",
        "Communal Spearman",
        "East Footman",
      ],
      inf_t2: [
        "Archer",
        "Javelin Skirmisher",
        "Axeman",
        "Crossbowman",
        "Skirmisher",
        "Composite Bowman",
      ],
      inf_t3: [
        "Druzhina",
        "Bogatyr",
        "Heavy Infantry",
        "Palace Guard",
        "Szlachta Foot",
        "Voivode Guard Foot",
      ],
      scout: ["Forest Scout", "Tracker", "Border Watch", "Steppe Watcher"],
      cav_t1: ["Light Rider", "Mounted Scout", "Horse Archer", "Border Rider"],
      cav_t2: ["Druzhina Cavalry", "Lancer", "Heavy Lancer", "Boyar Rider"],
      cav_t3: ["Boyar Cavalry", "Princely Guard", "Noble Lancer", "Voivode Guard"],
      ram: ["Timber Ram", "Siege Ram", "Covered Ram"],
      catapult: ["Stone Thrower", "Mangonel", "Trebuchet", "Ballista"],
      chief: ["Knyaz", "Voivode", "Chieftain", "Ban", "Hetman"],
      settler: ["Village Settler", "Posad Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "magyar",
    label: "Magyar / Hungarian steppe-kingdom",
    years: [800, 1500],
    match: [
      "magyar",
      "magyars",
      "hungarian",
      "hungary",
      "hunnic remnant",
      "avar",
      "avars",
      "honfoglalas",
      "arpad",
    ],
    archetype: "cavalry",
    palette: { primary: "#6B1E1E", secondary: "#C9A227" },
    era: "Magyar conquest / medieval Hungary",
    region: "Carpathian Basin",
    units: {
      inf_t1: ["Spearman", "Shield Bearer", "Peasant Militia", "Jobbagy Foot"],
      inf_t2: ["Archer", "Horse Archer Foot", "Skirmisher", "Composite Bowman"],
      inf_t3: ["Heavy Infantry", "Royal Guard", "Banderium Foot"],
      scout: ["Steppe Scout", "Frontier Watcher"],
      cav_t1: ["Horse Archer", "Light Rider", "Mounted Skirmisher"],
      cav_t2: ["Magyar Lancer", "Heavy Cavalry", "Armoured Horse"],
      cav_t3: ["Royal Cavalry", "Banderium", "Noble Guard"],
      ram: ["Siege Ram", "Timber Ram"],
      catapult: ["Mangonel", "Stone Thrower", "Trebuchet"],
      chief: ["Nagyfejedelem", "Voivode", "Ispán"],
      settler: ["Village Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "axumite",
    label: "Aksumite / Ethiopian highland",
    years: [-100, 800],
    match: ["aksum", "axum", "axumite", "aksumite", "ethiopian", "ethiopia", "nubian highland"],
    archetype: "infantry",
    palette: { primary: "#6B1E1E", secondary: "#E6B422" },
    era: "Aksumite kingdom",
    region: "Horn of Africa",
    units: {
      inf_t1: ["Sarwe Spearman", "Highland Militia", "Shield Bearer"],
      inf_t2: ["Archer", "Javelin Thrower", "Slinger"],
      inf_t3: ["Sarwe Elite", "Royal Guard", "Heavy Infantry"],
      scout: ["Highland Scout", "Caravan Watcher"],
      cav_t1: ["Light Horse", "Camel Scout"],
      cav_t2: ["War Elephant", "Heavy Cavalry", "Lancer"],
      cav_t3: ["Royal Elephant", "Elephant Guard"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Stone Thrower", "Mangonel"],
      chief: ["Negus", "Commander", "Ras"],
      settler: ["Colony Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "ottoman",
    label: "Early Ottoman",
    years: [1290, 1500],
    match: ["ottoman", "ottomans", "osmanli", "janissary", "sipahi", "akinci", "turkic anatolia", "rumelia"],
    archetype: "infantry",
    palette: { primary: "#1A1A2E", secondary: "#C9A227" },
    era: "Early Ottoman (to 1500)",
    region: "Anatolia & Balkans",
    units: {
      inf_t1: ["Yaya", "Azap", "Piyade Footman"],
      inf_t2: ["Archer", "Akinci Foot", "Skirmisher"],
      inf_t3: ["Janissary", "Kapikulu Infantry", "Solak"],
      scout: ["Akinci Scout", "Frontier Scout"],
      cav_t1: ["Akinci", "Light Horse", "Deli Rider"],
      cav_t2: ["Sipahi", "Timariot", "Lancer"],
      cav_t3: ["Kapikulu Sipahi", "Silahdar", "Household Cavalry"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Mangonel", "Trebuchet", "Humbaracı Mortar", "Topçu Gun"],
      chief: ["Bey", "Pasha", "Agha"],
      settler: ["Timar Settler", "Colony Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "korean",
    label: "Korean Three Kingdoms / early Goryeo",
    years: [300, 1400],
    match: ["korean", "koreans", "korea", "silla", "goguryeo", "baekje", "hwarang", "goryeo", "joseon"],
    archetype: "infantry",
    palette: { primary: "#1B3A4B", secondary: "#C0C0C0" },
    era: "Three Kingdoms / Goryeo",
    region: "Korean peninsula",
    units: {
      inf_t1: ["Spearman", "Militia", "Shield Bearer"],
      inf_t2: ["Archer", "Crossbowman", "Skirmisher"],
      inf_t3: ["Hwarang", "Heavy Infantry", "Palace Guard"],
      scout: ["Mountain Scout", "Border Watcher"],
      cav_t1: ["Light Cavalry", "Horse Archer"],
      cav_t2: ["Heavy Cavalry", "Lancer"],
      cav_t3: ["Guard Cavalry", "Royal Cavalry"],
      ram: ["Siege Ram", "Battering Ram"],
      catapult: ["Stone Thrower", "Traction Trebuchet", "Mangonel"],
      chief: ["General", "Hwarang Leader", "Commander"],
      settler: ["Village Settler"],
      hero: ["Hero"],
    },
  },
  {
    id: "mesoamerican",
    label: "Mesoamerican (to c. 1500)",
    years: [-200, 1500],
    match: [
      "aztec",
      "aztecs",
      "mexica",
      "maya",
      "mayan",
      "mayas",
      "inca",
      "incas",
      "toltec",
      "mixtec",
      "mesoamerican",
      "jaguar warrior",
      "eagle warrior",
    ],
    archetype: "infantry",
    palette: { primary: "#1B4D3E", secondary: "#E8C547" },
    era: "Postclassic Mesoamerica",
    region: "Mesoamerica",
    units: {
      inf_t1: ["Macehualtin Warrior", "Spearman", "Militia"],
      inf_t2: ["Archer", "Atlatl Skirmisher", "Slinger"],
      inf_t3: ["Jaguar Warrior", "Eagle Warrior", "Cuachicqueh"],
      scout: ["Forest Scout", "Pathfinder"],
      cav_t1: ["Light Runner", "Skirmish Band"], // no horses pre-contact — keep foot-mobile "cav" slots thematic
      cav_t2: ["Shock Warrior Band", "Otomi Warrior"],
      cav_t3: ["Elite Warrior Society", "Shorn Ones"],
      ram: ["Siege Ladder Crew", "Mantlet Crew"],
      catapult: ["Stone Thrower", "Siege Engine"],
      chief: ["Tlatoani", "War Chief", "Calpulli Captain"],
      settler: ["Calpulli Settler"],
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
      hero: ["Hero"],
    },
  },
];

/** Specific cultures beat biome / generic packs on equal scores. */
export const LEXICON_PRIORITY = {
  nabatean: 5,
  israelite: 4,
  arab: 4,
  north_african: 4,
  hittite: 3,
  thracian: 3,
  dacian: 3,
  slavic: 3,
  magyar: 3,
  axumite: 3,
  ottoman: 3,
  korean: 3,
  mesoamerican: 3,
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
