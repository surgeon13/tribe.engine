#!/usr/bin/env node
/**
 * Compute a median baseline tribe from the original Travian-sourced playable cores
 * (Romans, Teutons, Gauls, Egyptians, Huns, Spartans).
 *
 * Writes:
 *   data/balance/median-baseline.json  — precise median + mean + per-tribe ranges
 *   data/tribes/median.json            — integer playable reference tribe (schema-safe)
 *   plus registry hooks (index, palettes, training, logos, hero modifiers)
 *
 * Usage: node scripts/compute-median-tribe.js [--no-register]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveTribe } from "../lib/merge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");

const CORE_PLAYABLE = Object.freeze([
  "roman",
  "teuton",
  "gaul",
  "egyptian",
  "hun",
  "spartan",
]);

const STAT_KEYS = ["attack", "defenseInfantry", "defenseCavalry", "speed", "carry"];
const COST_KEYS = ["wood", "clay", "iron", "crop"];
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

const UNIT_NAMES = {
  inf_t1: "Median Levy",
  inf_t2: "Median Warrior",
  inf_t3: "Median Elite",
  scout: "Median Scout",
  cav_t1: "Median Light Cavalry",
  cav_t2: "Median Heavy Cavalry",
  cav_t3: "Median Guard Cavalry",
  ram: "Median Ram",
  catapult: "Median Catapult",
  chief: "Median Chief",
  settler: "Settler",
};

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, rel), "utf8"));
}

function writeJson(rel, value) {
  const filePath = path.join(dataDir, rel);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function median(arr) {
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function mean(arr) {
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

const round1 = (n) => Math.round(n * 10) / 10;
/** Nearest integer; .5 rounds away from zero (schema requires integers). */
const roundInt = (n) => Math.round(n);

function combatIndex(stats) {
  return (
    stats.attack +
    0.5 * (stats.defenseInfantry + stats.defenseCavalry) +
    0.1 * stats.speed +
    0.02 * stats.carry
  );
}

function costSum(cost) {
  return cost.wood + cost.clay + cost.iron + cost.crop;
}

function main() {
  const register = !process.argv.includes("--no-register");
  const base = readJson("units.base.json");
  const roster = readJson("roster.json");
  const tribeTraining = readJson("tribe-training.json");
  const logoGroups = readJson("logo-groups.json");
  const tribeLogos = readJson("tribe-logos.json");
  const logoData = { defaults: logoGroups.defaults, tribes: tribeLogos.tribes };

  /** @type {Record<string, ReturnType<typeof resolveTribe>>} */
  const resolved = {};
  for (const id of CORE_PLAYABLE) {
    const raw = readJson(`tribes/${id}.json`);
    resolved[id] = resolveTribe(raw, base.units, roster, tribeTraining, logoData);
  }

  /** @type {Record<string, object>} */
  const slots = {};
  for (const ref of REFS) {
    const series = { stats: {}, cost: {}, cropUpkeep: [], timeSeconds: [] };
    for (const k of STAT_KEYS) series.stats[k] = [];
    for (const k of COST_KEYS) series.cost[k] = [];

    for (const id of CORE_PLAYABLE) {
      const t = resolved[id].troops.find((x) => x.ref === ref);
      if (!t) throw new Error(`Missing ${ref} on ${id}`);
      for (const k of STAT_KEYS) series.stats[k].push(Number(t.stats[k]));
      for (const k of COST_KEYS) series.cost[k].push(Number(t.cost[k]));
      series.cropUpkeep.push(Number(t.cropUpkeep));
      series.timeSeconds.push(Number(t.training.timeSeconds));
    }

    const preciseMedian = {
      stats: Object.fromEntries(STAT_KEYS.map((k) => [k, median(series.stats[k])])),
      cost: Object.fromEntries(COST_KEYS.map((k) => [k, median(series.cost[k])])),
      cropUpkeep: median(series.cropUpkeep),
      timeSeconds: median(series.timeSeconds),
    };
    const preciseMean = {
      stats: Object.fromEntries(STAT_KEYS.map((k) => [k, round1(mean(series.stats[k]))])),
      cost: Object.fromEntries(COST_KEYS.map((k) => [k, roundInt(mean(series.cost[k]))])),
      cropUpkeep: round1(mean(series.cropUpkeep)),
      timeSeconds: roundInt(mean(series.timeSeconds)),
    };
    const playable = {
      stats: Object.fromEntries(STAT_KEYS.map((k) => [k, roundInt(preciseMedian.stats[k])])),
      cost: Object.fromEntries(COST_KEYS.map((k) => [k, roundInt(preciseMedian.cost[k])])),
      cropUpkeep: roundInt(preciseMedian.cropUpkeep),
      timeSeconds: roundInt(preciseMedian.timeSeconds),
    };

    slots[ref] = {
      preciseMedian,
      preciseMean,
      playableInteger: playable,
      range: Object.fromEntries(
        STAT_KEYS.map((k) => {
          const min = Math.min(...series.stats[k]);
          const max = Math.max(...series.stats[k]);
          return [k, { min, max, spread: max - min }];
        })
      ),
      byTribe: Object.fromEntries(
        CORE_PLAYABLE.map((id, i) => [
          id,
          {
            stats: Object.fromEntries(STAT_KEYS.map((k) => [k, series.stats[k][i]])),
            cost: Object.fromEntries(COST_KEYS.map((k) => [k, series.cost[k][i]])),
          },
        ])
      ),
    };
  }

  const heroSeries = { stats: {}, cropUpkeep: [] };
  for (const k of STAT_KEYS) heroSeries.stats[k] = [];
  for (const id of CORE_PLAYABLE) {
    const h = resolved[id].hero;
    for (const k of STAT_KEYS) heroSeries.stats[k].push(Number(h.stats[k]));
    heroSeries.cropUpkeep.push(Number(h.cropUpkeep ?? 6));
  }
  const heroPreciseMedian = {
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, median(heroSeries.stats[k])])),
    cropUpkeep: median(heroSeries.cropUpkeep),
  };
  const heroPlayable = {
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, roundInt(heroPreciseMedian.stats[k])])),
    cropUpkeep: roundInt(heroPreciseMedian.cropUpkeep),
  };

  const combatRefs = REFS.filter((r) => !["chief", "settler", "ram", "catapult"].includes(r));
  const tribePower = Object.fromEntries(
    CORE_PLAYABLE.map((id) => {
      let ci = 0;
      let cs = 0;
      for (const ref of combatRefs) {
        const t = resolved[id].troops.find((x) => x.ref === ref);
        ci += combatIndex(t.stats);
        cs += costSum(t.cost);
      }
      return [id, { combatIndex: round1(ci), resourceCost: cs, efficiency: round1((1000 * ci) / cs) }];
    })
  );
  let medCi = 0;
  let medCs = 0;
  for (const ref of combatRefs) {
    medCi += combatIndex(slots[ref].preciseMedian.stats);
    medCs += costSum(slots[ref].preciseMedian.cost);
  }
  tribePower.median = {
    combatIndex: round1(medCi),
    resourceCost: medCs,
    efficiency: round1((1000 * medCi) / medCs),
  };

  const baseline = {
    version: 1,
    game: "Tevel",
    generatedAt: new Date().toISOString(),
    methodology: {
      sources: CORE_PLAYABLE,
      excluded: ["natar", "nature"],
      exclusionReason: "NPC factions — not used for playable balance baseline",
      aggregator: "per-slot median across the 6 original playable tribes (resolved overrides)",
      alsoIncludes: "arithmetic mean for comparison; integer playable tribe rounds median to nearest int",
      combatIndex:
        "attack + 0.5*(defInf+defCav) + 0.1*speed + 0.02*carry  (diagnostic only, not a sim)",
    },
    tribePower,
    hero: {
      preciseMedian: heroPreciseMedian,
      playableInteger: heroPlayable,
    },
    slots,
  };
  writeJson("balance/median-baseline.json", baseline);

  const troops = REFS.map((ref) => {
    const p = slots[ref].playableInteger;
    /** @type {Record<string, unknown>} */
    const overrides = {
      name: { en: UNIT_NAMES[ref] },
      stats: p.stats,
      cost: p.cost,
      cropUpkeep: p.cropUpkeep,
      description: {
        en: `Statistical median of ${CORE_PLAYABLE.join(", ")} for slot ${ref}.`,
      },
    };
    return { ref, overrides };
  });

  const medianTribe = {
    $schema: "../units.schema.json",
    version: 1,
    game: "Tevel",
    tribe: {
      id: "median",
      name: { en: "Median" },
      theme:
        "Statistical baseline — per-slot median of Romans, Teutons, Gauls, Egyptians, Huns, Spartans. Use as the balance origin for tribe identity offsets.",
      graphics: { banner: "tribes/median/banner.png" },
    },
    palette: {
      primary: "#4A5568",
      secondary: "#A0AEC0",
    },
    buildings: {
      usePalette: true,
      spriteRoot: "tribes/median/buildings",
    },
    troops,
    hero: {
      id: "median_hero",
      progression: "hero.system.json",
      role: "hero",
      category: "hero",
      name: { en: "Median Hero" },
      description: {
        en: "Baseline hero — median combat profile of the six original playable tribes.",
      },
      isBase: false,
      stats: heroPlayable.stats,
      cost: { wood: 0, clay: 0, iron: 0, crop: 0 },
      cropUpkeep: heroPlayable.cropUpkeep,
      training: { building: "hero_mansion", timeSeconds: 0, requirements: [] },
      graphics: {
        sprite: "tribes/median/hero/hero.png",
        icon: "tribes/median/hero/hero_icon.png",
        portrait: "tribes/median/hero/hero_portrait.png",
      },
    },
    meta: {
      generated: true,
      baseline: true,
      aggregator: "median",
      sources: CORE_PLAYABLE,
      preciseSource: "balance/median-baseline.json",
      createdAt: new Date().toISOString(),
    },
  };
  writeJson("tribes/median.json", medianTribe);

  if (register) {
    const index = readJson("tribes/index.json");
    if (!index.tribes.some((t) => t.id === "median")) {
      index.tribes.push({
        id: "median",
        file: "median.json",
        type: "playable",
        name: { en: "Median" },
      });
      writeJson("tribes/index.json", index);
    }

    const palettes = readJson("tribes/palettes.json");
    palettes.palettes.median = {
      primary: "#4A5568",
      secondary: "#A0AEC0",
      notes: "Neutral baseline — slate",
    };
    writeJson("tribes/palettes.json", palettes);

    const training = readJson("tribe-training.json");
    training.tribes.median = Object.fromEntries(
      REFS.map((ref) => {
        const building =
          ref.startsWith("cav") ? "stable" : ["ram", "catapult"].includes(ref) ? "workshop" : ["chief", "settler"].includes(ref) ? "residence" : "barracks";
        return [
          ref,
          { building, timeSeconds: slots[ref].playableInteger.timeSeconds },
        ];
      })
    );
    writeJson("tribe-training.json", training);

    const logos = readJson("tribe-logos.json");
    logos.tribes.median = {
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
    writeJson("tribe-logos.json", logos);

    const heroSystem = readJson("hero.system.json");
    // Median of fightingStrengthPerPoint across cores
    const fspp = CORE_PLAYABLE.map((id) => heroSystem.tribeModifiers[id]?.fightingStrengthPerPoint ?? 80);
    heroSystem.tribeModifiers.median = {
      fightingStrengthPerPoint: roundInt(median(fspp)),
      resourceProductionBonusPercent: 0,
    };
    writeJson("hero.system.json", heroSystem);
  }

  console.log(`[Tevel] Wrote data/balance/median-baseline.json`);
  console.log(`[Tevel] Wrote data/tribes/median.json (integer medians)`);
  if (register) console.log(`[Tevel] Registered median in index/palettes/training/logos/hero`);
  console.log(`[Tevel] Sources: ${CORE_PLAYABLE.join(", ")}`);
  console.log(
    `[Tevel] Median combat-slot CI=${tribePower.median.combatIndex} cost=${tribePower.median.resourceCost} eff=${tribePower.median.efficiency}`
  );
}

main();
