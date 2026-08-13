#!/usr/bin/env node
/**
 * Pins the smithy formula to Travian's published numbers.
 *
 * The dashboard is only worth trusting here if it agrees with the game, and
 * the formula is easy to break in ways that look plausible — dropping the
 * upkeep term turns it into a flat multiplier that is right for a one-crop
 * unit and wrong for everything else. These cases are taken from Travian's own
 * worked example and from the shape of the formula itself.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { smithyStat, SMITHY_MAX_LEVEL, upgradeTroop } from "../dashboard/smithy.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "dashboard/data.json"), "utf8"));

const problems = [];
const near = (a, b, tol = 0.0005) => Math.abs(a - b) <= tol;

function check(label, actual, expected, tol) {
  if (near(actual, expected, tol)) return;
  problems.push(`${label}: got ${actual}, expected ${expected}`);
}

// The worked example published with the formula: a clubswinger, 40 attack and
// 1 crop, fully upgraded. Every source quotes 52.4048.
check("clubswinger attack at level 20", smithyStat(40, 1, 20), 52.4048, 0.0001);

// Level 0 is the identity, and it has to be exactly so — the compare view
// renders base data unchanged at level 0 rather than a rounded near-miss.
for (const [base, upkeep] of [
  [40, 1],
  [180, 4],
  [10, 6],
]) {
  check(`level 0 leaves ${base}/${upkeep} alone`, smithyStat(base, upkeep, 0), base, 0);
}

// A stat of zero stays zero. Travian scores scouts on hidden scouting values,
// so a scout's listed 0 attack must not sprout an attack from the upkeep term.
check("zero stays zero", smithyStat(0, 2, 20), 0, 0);

// The upkeep term is the whole point: two units with identical stats but
// different upkeep must not gain the same amount.
const light = smithyStat(100, 1, 20);
const heavy = smithyStat(100, 4, 20);
if (!(heavy > light)) {
  problems.push(`upkeep ignored: 1-crop gained ${light - 100}, 4-crop gained ${heavy - 100}`);
}

// Monotonic in level, so dragging the slider never walks a stat backwards.
let previous = -Infinity;
for (let level = 0; level <= SMITHY_MAX_LEVEL; level++) {
  const value = smithyStat(65, 3, level);
  if (value < previous) problems.push(`level ${level} is weaker than level ${level - 1}`);
  previous = value;
}

// Real rosters: upgrading must leave everything that is not weapons or armour
// exactly as it was, and must never lower a combat stat.
const UNTOUCHED = ["speed", "carry"];
for (const tribe of data.tribes) {
  for (const troop of tribe.troops) {
    const up = upgradeTroop(troop, SMITHY_MAX_LEVEL);
    for (const key of UNTOUCHED) {
      if (up.stats[key] !== troop.stats[key]) {
        problems.push(`${tribe.name} ${troop.name}: ${key} changed with the smithy`);
      }
    }
    if (up.metrics.resourceCost !== troop.metrics.resourceCost) {
      problems.push(`${tribe.name} ${troop.name}: cost changed with the smithy`);
    }
    if (up.metrics.trainTimeSeconds !== troop.metrics.trainTimeSeconds) {
      problems.push(`${tribe.name} ${troop.name}: training time changed with the smithy`);
    }
    if (up.cropUpkeep !== troop.cropUpkeep) {
      problems.push(`${tribe.name} ${troop.name}: crop upkeep changed with the smithy`);
    }
    for (const key of ["attack", "defenseInfantry", "defenseCavalry"]) {
      if (up.stats[key] < troop.stats[key]) {
        problems.push(`${tribe.name} ${troop.name}: ${key} fell after upgrading`);
      }
    }
  }
}

if (problems.length) {
  console.error("[Tevel] Smithy formula check failed:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const units = data.tribes.reduce((n, t) => n + t.troops.length, 0);
console.log(
  `[Tevel] Smithy OK — matches Travian's published example (clubswinger 40 → 52.4048 at level 20); ` +
    `${units} units upgrade without touching speed, carry, cost, upkeep or training time`
);
