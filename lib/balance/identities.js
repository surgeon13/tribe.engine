/**
 * What makes each tribe feel different, expressed as numbers.
 *
 * The design contract (data/balance/BALANCE.md) is that identity is *shape* and
 * fairness is *price*. A tribe may put its power wherever it likes — infantry or
 * cavalry, attack or defense, speed or carry — but every point of combat index
 * costs the same, so no roster is simply better than another.
 *
 * The dials that matter:
 *
 *   slotRoles     which job each of the eleven slots does
 *   shape         where the tribe's power sits: infantry or cavalry, attack or
 *                 defense, and how fast and how loaded it travels
 *   eliteness     unit granularity — a few large units or many small ones.
 *                 Big units are crop-efficient and expensive; small ones are
 *                 the reverse, which is why Romans and Teutons feel different
 *                 while fielding the same power per village
 *   cropPressure  how many mouths a unit costs for its power. Resource cost
 *                 then settles the balance, so this shifts the currency mix
 *                 rather than the total price
 *   centerpiece   how far the heavy cavalry outweighs the rest of the roster.
 *                 Every tribe is built around its tier-3 horse, so this is a
 *                 floor the generator enforces rather than a free dial; raise
 *                 it for a tribe whose whole plan is that one unit
 *   trainBias     queue length, mixBias the resource flavor, siege the workshop
 */

/** @typedef {{ infAtk?: number, infDef?: number, cavAtk?: number, cavDef?: number, speed?: number, carry?: number }} Shape */

/**
 * Tiers outside the player band. NPC and boss rosters are deliberately not fair
 * — they are content, not opponents you pick at registration.
 */
export const POWER_TIERS = Object.freeze({
  player: 1,
  wild: 0.82,
  guard: 1.12,
  // The boss host exists to out-fight the Natars, and the Natars are now at
  // Travian's real numbers rather than our generated impression of them —
  // which is a good deal stronger. The dread host had to grow to keep its job.
  boss: 1.38,
});

/** How far a player tribe may sit from the anchor price before the build fails. */
export const FAIRNESS_TOLERANCE = 0.06;
/** How far a tribe may shift its power onto the crop currency. */
export const CROP_PRESSURE_RANGE = Object.freeze([0.9, 1.14]);

/**
 * @type {Record<string, {
 *   tier?: keyof typeof POWER_TIERS,
 *   slotRoles: Record<string, string>,
 *   shape?: Shape,
 *   eliteness?: number,
 *   cropPressure?: number,
 *   centerpiece?: number,
 *   trainBias?: number,
 *   siege?: number,
 *   mixBias?: { wood?: number, clay?: number, iron?: number, crop?: number },
 *   slotShapes?: Record<string, Shape>,
 *   notes: string,
 * }>}
 */
export const TRIBE_IDENTITIES = Object.freeze({
  roman: {
    slotRoles: {
      inf_t1: "line",
      inf_t2: "def_inf",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_off",
      cav_t2: "cav_off",
      // Rome fielded three offensive horses and had no anvil. The Regales is
      // the one that earned no keep — the Caesaris hits harder for less — so
      // it becomes the wall the legion forms up behind: the tribe's most
      // expensive unit, and the one thing in the stable that cannot raid.
      cav_t3: "cav_def",
    },
    shape: { infAtk: 1.02, infDef: 1.06, cavAtk: 1.04, cavDef: 1.06, speed: 0.95, carry: 0.95 },
    slotShapes: {
      // Bought to hold ground: the lance is real but it is not why you buy it.
      // Being the centerpiece, its defence is then lifted until it leads the
      // roster, which is what makes an elite defender expensive.
      cav_t3: { cavAtk: 0.675, speed: 0.8, carry: 0.7 },
    },
    eliteness: 1.08,
    centerpiece: 1.5,
    cropPressure: 1.06,
    trainBias: 1.18,
    siege: 1.12,
    mixBias: { iron: 1.5, wood: 0.85, clay: 0.85 },
    notes: "Elite and expensive: the best unit per crop in the game, paid for in resources and drill time.",
  },
  teuton: {
    slotRoles: {
      inf_t1: "off_inf",
      inf_t2: "def_cav",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_def",
      cav_t2: "cav_off",
      cav_t3: "cav_off",
    },
    shape: { infAtk: 1.12, infDef: 0.96, cavAtk: 1.04, cavDef: 0.94, speed: 0.95, carry: 1.18 },
    slotShapes: {
      // Teutons never bred a riding scout; theirs walks.
      scout: { speed: 0.62 },
    },
    eliteness: 0.92,
    // Teutons win by having more of everything, not by one unlock.
    centerpiece: 1.35,
    cropPressure: 0.93,
    trainBias: 0.82,
    siege: 1.05,
    mixBias: { wood: 1.35, clay: 1.15, iron: 0.7 },
    notes: "Cheap brutal mass: the most army per resource and the fastest to replace, at the worst crop rate.",
  },
  gaul: {
    slotRoles: {
      inf_t1: "def_cav",
      inf_t2: "line",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_off",
      cav_t2: "cav_def",
      cav_t3: "cav_off_armored",
    },
    shape: { infAtk: 0.96, infDef: 1.06, cavAtk: 1, cavDef: 1.08, speed: 1.14, carry: 1.05 },
    slotShapes: {
      // The Pathfinder is the tribe's signature: nothing on the map is faster.
      scout: { speed: 1.18 },
    },
    eliteness: 0.98,
    cropPressure: 1,
    trainBias: 0.95,
    siege: 0.95,
    mixBias: { wood: 1.2, crop: 1.15, iron: 0.85 },
    notes: "Fast and defensive: everything outruns its counterpart, and the Haeduan fights on both sides of the wall.",
  },
  egyptian: {
    slotRoles: {
      inf_t1: "line",
      inf_t2: "def_inf",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_def",
      cav_t2: "cav_off",
      cav_t3: "cav_off",
    },
    shape: { infAtk: 0.94, infDef: 1.14, cavAtk: 0.94, cavDef: 1.06, speed: 0.98, carry: 0.95 },
    eliteness: 0.9,
    // A militia tribe's chariots are a luxury, not the plan.
    centerpiece: 1.3,
    cropPressure: 0.95,
    trainBias: 0.88,
    siege: 1,
    mixBias: { clay: 1.4, wood: 0.9, iron: 0.85 },
    notes: "Cheap militia behind stone: wide defensive infantry that a young village can already afford.",
  },
  hun: {
    slotRoles: {
      inf_t1: "off_inf",
      inf_t2: "line",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_off",
      cav_t2: "cav_off",
      cav_t3: "cav_off",
    },
    shape: { infAtk: 1.06, infDef: 0.84, cavAtk: 1.1, cavDef: 0.86, speed: 1.16, carry: 1.12 },
    slotShapes: {
      // Fast, but the Gaul Pathfinder still gets there first.
      scout: { speed: 1.06 },
    },
    eliteness: 0.95,
    // The whole tribe is a delivery system for this one horse.
    centerpiece: 1.6,
    cropPressure: 1.02,
    trainBias: 0.9,
    siege: 0.9,
    mixBias: { crop: 1.5, wood: 0.85, clay: 0.9 },
    notes: "All horse, no wall: the deepest offense in the game and nothing to hide behind when it is away.",
  },
  spartan: {
    slotRoles: {
      inf_t1: "line",
      inf_t2: "def_inf",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_def",
      cav_t2: "cav_off",
      cav_t3: "cav_off",
    },
    shape: { infAtk: 1.04, infDef: 1.1, cavAtk: 1.06, cavDef: 1, speed: 0.97, carry: 0.9 },
    eliteness: 1.16,
    // The phalanx is the army; the horse is an escort.
    centerpiece: 1.32,
    cropPressure: 1.12,
    trainBias: 1.2,
    siege: 1,
    mixBias: { iron: 1.45, crop: 1.15, clay: 0.75 },
    notes: "Crop-efficient professionals: the fewest mouths per point of power, and the longest queue.",
  },
  carthaginian: {
    slotRoles: {
      inf_t1: "def_cav",
      inf_t2: "line",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_off",
      cav_t2: "cav_off",
      cav_t3: "cav_def",
    },
    shape: { infAtk: 0.98, infDef: 0.92, cavAtk: 1.08, cavDef: 1.04, speed: 1.04, carry: 1.06 },
    slotShapes: {
      // War elephants: a wall that walks, and slowly.
      cav_t3: { speed: 0.5, carry: 0.6 },
    },
    centerpiece: 1.5,
    eliteness: 1.06,
    cropPressure: 1,
    trainBias: 1.05,
    siege: 1.05,
    mixBias: { clay: 1.25, crop: 1.2, wood: 0.85 },
    notes: "Bought armies: soft native infantry, a mercenary mounted punch, and elephants that anchor a line.",
  },
  japanese: {
    slotRoles: {
      inf_t1: "def_cav",
      inf_t2: "def_inf",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_def",
      cav_t2: "cav_off",
      cav_t3: "cav_off",
    },
    shape: { infAtk: 1.08, infDef: 1.1, cavAtk: 0.9, cavDef: 0.94, speed: 0.98, carry: 0.92 },
    eliteness: 0.96,
    // "Cavalry that never caught up" — the smallest lead on the board.
    centerpiece: 1.26,
    cropPressure: 1.04,
    trainBias: 0.95,
    siege: 0.95,
    mixBias: { iron: 1.35, wood: 1.1, clay: 0.75 },
    notes: "Ashigaru wall, samurai edge: the best infantry in the game and cavalry that never caught up.",
  },
  byzantine: {
    slotRoles: {
      inf_t1: "line",
      inf_t2: "def_cav",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_off",
      cav_t2: "cav_off",
      cav_t3: "cav_off_armored",
    },
    shape: { infAtk: 1, infDef: 1.02, cavAtk: 1.08, cavDef: 1.08, speed: 1.02, carry: 0.98 },
    eliteness: 1.08,
    cropPressure: 1.03,
    trainBias: 1.08,
    siege: 1.1,
    mixBias: { iron: 1.25, clay: 1.15, wood: 0.8 },
    notes: "Combined arms: no weak slot anywhere, and cataphracts that defend as well as they charge.",
  },
  israelite: {
    slotRoles: {
      inf_t1: "def_cav",
      inf_t2: "line",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_off",
      cav_t2: "cav_off",
      cav_t3: "cav_off_armored",
    },
    shape: { infAtk: 1.04, infDef: 1.12, cavAtk: 0.98, cavDef: 1.02, speed: 1, carry: 1 },
    eliteness: 0.97,
    cropPressure: 1.05,
    trainBias: 0.98,
    siege: 0.95,
    mixBias: { clay: 1.2, crop: 1.15, iron: 0.9 },
    notes: "Hill-country levies: cheap standing defense in depth, with chariots as the one expensive luxury.",
  },
  persian: {
    slotRoles: {
      inf_t1: "def_cav",
      inf_t2: "def_inf",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_off",
      cav_t2: "cav_off",
      cav_t3: "cav_def",
    },
    shape: { infAtk: 0.94, infDef: 1.06, cavAtk: 1.04, cavDef: 1.02, speed: 1.05, carry: 1.08 },
    slotShapes: {
      // Camels outlast horses and carry the loot home.
      cav_t3: { carry: 1.25 },
    },
    eliteness: 0.92,
    cropPressure: 0.94,
    trainBias: 0.9,
    siege: 1.05,
    mixBias: { wood: 1.2, clay: 1.15, iron: 0.85 },
    notes: "Numbers first: levies raised faster and cheaper than anyone else, with Immortals as the sharp end.",
  },
  axum: {
    slotRoles: {
      inf_t1: "def_cav",
      inf_t2: "line",
      inf_t3: "def_inf",
      scout: "scout",
      cav_t1: "cav_off",
      cav_t2: "cav_off",
      cav_t3: "cav_def",
    },
    shape: { infAtk: 1, infDef: 1.08, cavAtk: 1, cavDef: 1.04, speed: 1.02, carry: 1.14 },
    slotShapes: {
      // Everything Axum fields hauls, and the camel guard most of all.
      cav_t3: { carry: 1.3 },
    },
    eliteness: 1,
    cropPressure: 1,
    trainBias: 1,
    siege: 1,
    mixBias: { crop: 1.35, wood: 1.1, iron: 0.8 },
    notes: "Trade-fed highlands: everything hauls more than its counterpart, so raids pay for the next army.",
  },
  arab: {
    slotRoles: {
      inf_t1: "def_cav",
      inf_t2: "line",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_off",
      cav_t2: "cav_off",
      cav_t3: "cav_off",
    },
    shape: { infAtk: 1.02, infDef: 0.92, cavAtk: 1.06, cavDef: 0.94, speed: 1.14, carry: 1.16 },
    eliteness: 0.93,
    centerpiece: 1.52,
    cropPressure: 0.96,
    trainBias: 0.88,
    siege: 0.9,
    mixBias: { crop: 1.4, wood: 0.85, iron: 0.9 },
    notes: "Desert raiders: three offensive horses, the cheapest remounts, and nothing worth defending with.",
  },
  nabateans: {
    slotRoles: {
      inf_t1: "def_cav",
      inf_t2: "line",
      inf_t3: "def_inf",
      scout: "scout",
      cav_t1: "cav_def",
      cav_t2: "cav_off",
      cav_t3: "cav_def",
    },
    shape: { infAtk: 0.94, infDef: 1.14, cavAtk: 0.92, cavDef: 1.12, speed: 0.94, carry: 1.26 },
    slotShapes: {
      // The caravan guard is the whole point of the tribe: it hauls most.
      cav_t3: { carry: 1.2 },
    },
    centerpiece: 1.5,
    eliteness: 1.02,
    cropPressure: 1.03,
    trainBias: 1.02,
    siege: 0.95,
    mixBias: { clay: 1.4, crop: 1.15, wood: 0.75 },
    notes: "Caravan kingdom: slow, stubborn, and built to carry — camel guards haul more than anyone's settlers.",
  },
  undead: {
    tier: "boss",
    slotRoles: {
      inf_t1: "off_inf",
      inf_t2: "line",
      inf_t3: "off_inf",
      scout: "scout",
      cav_t1: "cav_off",
      cav_t2: "cav_off",
      cav_t3: "cav_off",
    },
    shape: { infAtk: 1.12, infDef: 0.92, cavAtk: 1.12, cavDef: 0.9, speed: 1.08, carry: 0.85 },
    eliteness: 1.05,
    centerpiece: 1.45,
    cropPressure: 1.1,
    trainBias: 1.1,
    siege: 1.15,
    mixBias: { iron: 1.3, crop: 1.2, clay: 0.8 },
    notes: "Boss tier — a dread host meant to out-fight Natars and Nature, not to be picked at registration.",
  },
  natar: {
    tier: "guard",
    slotRoles: {
      inf_t1: "def_cav",
      inf_t2: "off_inf",
      inf_t3: "def_inf",
      scout: "scout",
      cav_t1: "cav_off",
      cav_t2: "cav_off",
      cav_t3: "cav_off",
    },
    slotShapes: {
      inf_t3: { infDef: 1.45 },
    },
    shape: { infAtk: 1.05, infDef: 1.1, cavAtk: 1.06, cavDef: 1.08, speed: 0.98, carry: 0.9 },
    eliteness: 1.06,
    cropPressure: 1.05,
    trainBias: 1.25,
    siege: 1.3,
    mixBias: { iron: 1.3, clay: 1.1, wood: 0.9 },
    notes: "NPC endgame garrison: guards artefacts and Wonder plans, so it sits above every player roster.",
  },
  nature: {
    tier: "wild",
    slotRoles: {
      inf_t1: "line",
      inf_t2: "def_inf",
      inf_t3: "def_cav",
      scout: "scout",
      cav_t1: "cav_def",
      cav_t2: "cav_off",
      cav_t3: "cav_def",
    },
    shape: { infAtk: 0.8, infDef: 1.1, cavAtk: 1.1, cavDef: 1.05, speed: 1.1, carry: 0.2 },
    slotShapes: {
      inf_t3: { infDef: 1.5, infAtk: 1.6 },
    },
    // A bear is the biggest thing in an oasis, but it is still an animal, not
    // a tribe's war-winning unlock.
    centerpiece: 1.2,
    eliteness: 1,
    cropPressure: 1,
    trainBias: 1,
    siege: 1,
    notes: "Oasis animals: no upkeep and no training queue, cleared by heroes rather than fought by armies.",
  },
});

/**
 * Roles a tribe may not hand to its cavalry unless it is a defense specialist.
 * @param {string} id
 * @returns {string[]}
 */
export function cavalryRolesFor(id) {
  const spec = TRIBE_IDENTITIES[id];
  if (!spec) return [];
  return ["cav_t1", "cav_t2", "cav_t3"].map((ref) => spec.slotRoles[ref]);
}
