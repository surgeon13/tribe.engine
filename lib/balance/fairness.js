/**
 * Price-fairness diagnostics for one tribe's roster, measured against the
 * six-core anchor (see anchors.js). Shared by scripts/validate-balance.js
 * (the build gate) and scripts/build-dashboard-data.js (the dashboard's
 * Balance tab), so there is exactly one place that knows what "fair" means.
 */
import { SCORED_REFS, SLOT_ANCHORS, combatIndex, totalCost } from "./anchors.js";

/**
 * @typedef {{
 *   stats: { attack?: number, defenseInfantry?: number, defenseCavalry?: number, speed?: number, carry?: number },
 *   cropUpkeep?: number,
 *   cost?: { wood?: number, clay?: number, iron?: number, crop?: number },
 *   trainSeconds?: number | null,
 * }} FairnessUnit
 */

/**
 * @param {Map<string, FairnessUnit> | Record<string, FairnessUnit>} troops
 *   Scored-slot units for one tribe, keyed by ref (`inf_t1`, `cav_t3`, …).
 */
export function computeFairness(troops) {
  const get = (ref) => (troops instanceof Map ? troops.get(ref) : troops[ref]);

  let ci = 0;
  let crop = 0;
  let res = 0;
  let time = 0;
  let anchorCi = 0;
  let anchorCrop = 0;
  let anchorRes = 0;
  let anchorTime = 0;

  for (const ref of SCORED_REFS) {
    const u = get(ref);
    if (!u) continue;
    const anchor = SLOT_ANCHORS[ref];
    const unitCi = combatIndex(u.stats || {});

    ci += unitCi;
    crop += u.cropUpkeep || 0;
    res += totalCost(u.cost);
    if (u.trainSeconds != null) time += u.trainSeconds;

    anchorCi += anchor.ci;
    // What the anchor would charge for exactly this much power, in each
    // currency — crop and resources are priced and enforced; training time
    // is the third currency, measured the same way but not yet enforced
    // everywhere that reads this module (see validate-balance.js).
    anchorCrop += unitCi / anchor.ciPerCrop;
    anchorRes += (unitCi / anchor.ciPerRes) * 1000;
    anchorTime += unitCi * (anchor.time / anchor.ci);
  }

  return {
    // >1 means more raw combat index than the anchor roster.
    power: anchorCi ? ci / anchorCi : 0,
    // >1 means the tribe gets more power per unit of that currency than the
    // anchor rate — i.e. it's cheaper than average in that currency.
    cropEfficiency: crop ? anchorCrop / crop : 0,
    resEfficiency: res ? anchorRes / res : 0,
    timeEfficiency: time ? anchorTime / time : 0,
  };
}
