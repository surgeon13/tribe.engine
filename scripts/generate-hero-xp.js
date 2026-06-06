import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "../data/hero.system.json");
const max = 100;
const levels = [];
let total = 0;
for (let level = 1; level <= max; level++) {
  const xpToNext = level >= max ? 0 : Math.round(50 * Math.pow(level, 1.85));
  levels.push({ level, xpTotal: total, xpToNext });
  total += xpToNext;
}

const data = {
  $schema: "./hero.schema.json",
  version: 1,
  game: "Tevel",
  description:
    "Hero experience, leveling, and attribute progression (Travian Legends inspired).",
  leveling: {
    maxLevel: max,
    attributePointsPerLevel: 4,
    startingAttributePoints: 4,
    defaultAllocation: {
      fightingStrength: 0,
      offBonus: 0,
      defBonus: 0,
      resources: 4,
    },
    fullHealOnLevelUp: true,
    curve: {
      id: "tevel_standard",
      description: "xpToNext = round(50 * level^1.85) for level N -> N+1",
      formula: "round(50 * pow(level, 1.85))",
    },
    levels,
  },
  attributes: {
    fightingStrength: {
      id: "fightingStrength",
      name: { en: "Fighting Strength" },
      description: {
        en: "Adds to hero personal attack and defense in combat.",
      },
      effect: {
        type: "heroCombat",
        perPoint: { attack: 1, defenseInfantry: 1, defenseCavalry: 1 },
      },
      tribeScaling: true,
    },
    offBonus: {
      id: "offBonus",
      name: { en: "Off Bonus" },
      description: {
        en: "Increases attack of all troops in armies led by the hero.",
      },
      effect: { type: "armyAttackPercent", perPoint: 0.2, maxPercent: 20 },
    },
    defBonus: {
      id: "defBonus",
      name: { en: "Def Bonus" },
      description: {
        en: "Increases defense of all own troops in armies with the hero.",
      },
      effect: { type: "armyDefensePercent", perPoint: 0.2, maxPercent: 20 },
    },
    resources: {
      id: "resources",
      name: { en: "Resources" },
      description: {
        en: "Boosts resource production in the hero home village.",
      },
      effect: {
        type: "homeVillageProductionPercent",
        perPoint: 0.5,
        maxPercent: 25,
      },
    },
  },
  tribeModifiers: {
    roman: { fightingStrengthPerPoint: 100, resourceProductionBonusPercent: 0 },
    teuton: { fightingStrengthPerPoint: 80, resourceProductionBonusPercent: 0 },
    gaul: { fightingStrengthPerPoint: 80, resourceProductionBonusPercent: 0 },
    egyptian: {
      fightingStrengthPerPoint: 80,
      resourceProductionBonusPercent: 25,
    },
    hun: { fightingStrengthPerPoint: 80, resourceProductionBonusPercent: 0 },
    spartan: { fightingStrengthPerPoint: 80, resourceProductionBonusPercent: 0 },
    natar: {
      fightingStrengthPerPoint: 80,
      resourceProductionBonusPercent: 0,
      playable: false,
    },
    nature: {
      fightingStrengthPerPoint: 0,
      resourceProductionBonusPercent: 0,
      playable: false,
    },
  },
  xpSources: {
    combat: {
      enabled: true,
      description: {
        en: "1 XP per 1 crop upkeep of enemy units killed (attacker always; defender split by army weight).",
      },
      rules: {
        xpPerEnemyCropUpkeep: 1,
        attackerReceivesOnLoss: true,
        defenderSplitByArmyCropConsumption: true,
      },
    },
    adventure: {
      enabled: true,
      description: {
        en: "XP from clearing oases / adventures based on nature troop crop upkeep.",
      },
      rules: { xpPerNatureUnitCropUpkeep: 1 },
    },
    quests: {
      enabled: true,
      description: {
        en: "Flat XP rewards from daily quests and village tasks.",
      },
      rules: { rewardTable: "quests.json" },
    },
    items: {
      enabled: true,
      description: { en: "Consumables and equipment XP multipliers." },
      examples: [
        { id: "scroll_of_knowledge", xpGrant: 10 },
        { id: "helmet_of_awareness", xpMultiplier: 1.25 },
      ],
    },
  },
  health: {
    baseHealth: 100,
    healthPerLevel: 10,
    regenerationPerHour: 10,
    regenerationMultiplierWithRegenItem: 2,
  },
  death: {
    canDie: true,
    reviveAtLevelPercent: 0,
    reviveCostsByLevelBracket: [
      { maxLevel: 10, cost: { crop: 100 } },
      { maxLevel: 25, cost: { crop: 500 } },
      { maxLevel: 50, cost: { crop: 2000 } },
      { maxLevel: 100, cost: { crop: 8000 } },
    ],
  },
};

fs.writeFileSync(out, JSON.stringify(data, null, 2));
console.log("Wrote", out);
