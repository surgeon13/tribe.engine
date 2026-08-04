/** @typedef {import('./types.js').LeaderEntry} LeaderEntry */

const NAMES = [
  "Legionnaire",
  "WarChief",
  "IronFist",
  "CropKing",
  "NightRaider",
  "SpartanShield",
  "DesertFox",
  "Hammerfall",
  "Oakheart",
  "SilverSpear",
];


/** Simulation epoch — first poll anchors elapsed time at zero. */
let simEpochMs = null;

/** @type {Map<string, { basePoints: number, baseRes: { wood: number, clay: number, iron: number, crop: number }, raidPhase: number }>} */
const state = new Map();

function seedPlayer(id, rank) {
  if (state.has(id)) return state.get(id);
  const base = {
    basePoints: 800_000 + (11 - rank) * 120_000 + Math.floor(Math.random() * 40_000),
    baseRes: {
      wood: 2_000_000 + rank * 180_000,
      clay: 1_800_000 + rank * 160_000,
      iron: 1_600_000 + rank * 140_000,
      crop: 900_000 + rank * 90_000,
    },
    raidPhase: Math.random() * Math.PI * 2,
  };
  state.set(id, base);
  return base;
}

/**
 * Simulates top leaders with passive growth and periodic raid bursts.
 * @param {number} topCount
 * @param {number} [nowMs]
 * @returns {Promise<LeaderEntry[]>}
 */
export async function fetchMockLeaders(topCount = 10, nowMs = Date.now()) {
  if (simEpochMs == null) simEpochMs = nowMs;
  const elapsedSec = (nowMs - simEpochMs) / 1000;
  const leaders = [];

  for (let rank = 1; rank <= topCount; rank++) {
    const id = `mock-player-${rank}`;
    const seed = seedPlayer(id, rank);
    const raidBurst =
      Math.max(0, Math.sin(elapsedSec / 900 + seed.raidPhase) * 0.5 + Math.sin(elapsedSec / 420 + rank) * 0.35);
    const passiveGrowth = (11 - rank) * 12 + 8;
    const raidLoot = Math.floor(raidBurst * (4000 + rank * 600));
    const pointGain = Math.floor(passiveGrowth * 3 + raidBurst * 180);

    const wood = seed.baseRes.wood + Math.floor(elapsedSec * (40 + rank * 3) + raidLoot * 0.35);
    const clay = seed.baseRes.clay + Math.floor(elapsedSec * (36 + rank * 2) + raidLoot * 0.28);
    const iron = seed.baseRes.iron + Math.floor(elapsedSec * (32 + rank * 2) + raidLoot * 0.22);
    const crop = seed.baseRes.crop + Math.floor(elapsedSec * (18 + rank) + raidLoot * 0.15);
    const points = seed.basePoints + Math.floor(elapsedSec * pointGain);

    leaders.push({
      rank,
      id,
      name: NAMES[rank - 1] || `Player ${rank}`,
      points,
      resources: { wood, clay, iron, crop },
      population: 1200 + (11 - rank) * 180 + Math.floor(elapsedSec / 30),
      villages: Math.min(20, 8 + Math.floor((11 - rank) / 2) + Math.floor(elapsedSec / 3600)),
    });
  }

  return leaders;
}

/** Reset simulation clock (testing). */
export function resetMockSimulation() {
  simEpochMs = null;
  state.clear();
}
