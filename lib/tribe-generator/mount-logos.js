/**
 * Curated cavalry and scout logos.
 *
 * Both slots had collapsed onto a handful of icons — one horse head covered 12
 * tribes and a single arrow covered 9 — while seven cavalry icons were never
 * assigned at all. These pairings spread the existing pools across the roster
 * and keep each tribe's three mounts visually distinct from one another.
 *
 * A mounted unit draws from the cavalry pool. Spreading the icons had reached
 * into the animal pool for four riders, which reads as a tribe fielding two
 * horsemen and a farm animal.
 */

/**
 * Tribes whose mounted slots hold animals rather than riders. Nature's cavalry
 * is a wild boar and a wolf, so the animal pool is right there and only there.
 */
export const WILDLIFE_MOUNTS = Object.freeze(["nature"]);
export const MOUNT_LOGOS = Object.freeze({
  roman: {
    cav_t1: "cavalry/horse-head.svg",
    cav_t2: "cavalry/chess-knight.svg",
    // Rome never fought from elephants; it fought against them.
    cav_t3: "cavalry/mounted-knight.svg",
    scout: "infantry/heavy-arrow.svg",
  },
  teuton: {
    cav_t1: "cavalry/horse-head-alt.svg",
    cav_t2: "cavalry/mounted-knight.svg",
    cav_t3: "cavalry/cavalry.svg",
    scout: "infantry/crossbow.svg",
  },
  gaul: {
    cav_t1: "cavalry/horse-head.svg",
    cav_t2: "cavalry/cavalry.svg",
    // The Haeduan is the third of three Gallic horse, not a ram.
    cav_t3: "cavalry/mounted-knight.svg",
    scout: "infantry/boomerang.svg",
  },
  egyptian: {
    cav_t1: "cavalry/camel-head.svg",
    cav_t2: "cavalry/camel.svg",
    cav_t3: "cavalry/elephant-head.svg",
    scout: "infantry/barbed-spear.svg",
  },
  hun: {
    cav_t1: "cavalry/horse-head-alt.svg",
    cav_t2: "cavalry/cloaked-rider.svg",
    // The Marauder is the third of three Hun horse, and no winged one.
    cav_t3: "cavalry/cavalry.svg",
    scout: "infantry/flying-shuriken.svg",
  },
  spartan: {
    cav_t1: "cavalry/horse-head.svg",
    cav_t2: "cavalry/chess-knight.svg",
    cav_t3: "cavalry/mounted-knight.svg",
    scout: "infantry/barbed-spear.svg",
  },
  natar: {
    cav_t1: "cavalry/cloaked-rider.svg",
    cav_t2: "cavalry/mounted-knight.svg",
    cav_t3: "cavalry/mammoth.svg",
    scout: "infantry/star-shuriken.svg",
  },
  nature: {
    cav_t1: "animals/cow.svg",
    cav_t2: "animals/rhinoceros-horn.svg",
    cav_t3: "cavalry/mammoth.svg",
    scout: "animals/duck.svg",
  },
  carthaginian: {
    cav_t1: "cavalry/horse-head.svg",
    cav_t2: "cavalry/camel.svg",
    cav_t3: "cavalry/elephant.svg",
    scout: "infantry/harpoon-chain.svg",
  },
  japanese: {
    cav_t1: "cavalry/horse-head-alt.svg",
    cav_t2: "cavalry/chess-knight.svg",
    cav_t3: "cavalry/mounted-knight.svg",
    scout: "infantry/shuriken.svg",
  },
  byzantine: {
    cav_t1: "cavalry/horse-head.svg",
    cav_t2: "cavalry/chess-knight.svg",
    cav_t3: "cavalry/cavalry.svg",
    scout: "infantry/double-shot.svg",
  },
  israelite: {
    cav_t1: "cavalry/donkey.svg",
    cav_t2: "cavalry/horse-head.svg",
    cav_t3: "cavalry/chess-knight.svg",
    scout: "infantry/harpoon-chain.svg",
  },
  persian: {
    cav_t1: "cavalry/camel-head.svg",
    cav_t2: "cavalry/cavalry.svg",
    // The unit is a Camel Corps, so it should not be an elephant.
    cav_t3: "cavalry/camel.svg",
    scout: "infantry/arrowhead.svg",
  },
  axum: {
    cav_t1: "cavalry/camel.svg",
    cav_t2: "cavalry/horse-head-alt.svg",
    cav_t3: "cavalry/elephant-head.svg",
    scout: "infantry/tomahawk.svg",
  },
  arab: {
    cav_t1: "cavalry/camel-head.svg",
    cav_t2: "cavalry/camel.svg",
    cav_t3: "cavalry/cloaked-rider.svg",
    scout: "infantry/heavy-arrow.svg",
  },
  nabateans: {
    cav_t1: "cavalry/donkey.svg",
    cav_t2: "cavalry/camel-head.svg",
    cav_t3: "cavalry/camel.svg",
    scout: "infantry/double-shot.svg",
  },
  undead: {
    cav_t1: "cavalry/cloaked-rider.svg",
    cav_t2: "cavalry/mounted-knight.svg",
    cav_t3: "cavalry/mammoth.svg",
    scout: "infantry/whirlpool-shuriken.svg",
  },
  median: {
    cav_t1: "cavalry/horse-head.svg",
    cav_t2: "cavalry/chess-knight.svg",
    cav_t3: "cavalry/cavalry.svg",
    scout: "infantry/arrowhead.svg",
  },
});
