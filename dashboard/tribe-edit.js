/**
 * Edit mode for created (non-core) tribes — tune troop names, combat stats, and costs.
 */

import { isRemovableTribe } from "./tribe-create.js";
import { upsertSessionTribe } from "./session-tribes.js";

/**
 * @param {{ attack?: number, defenseInfantry?: number, defenseCavalry?: number, speed?: number, carry?: number }} stats
 * @param {number} cropUpkeep
 * @param {{ timeSeconds?: number, timeFormatted?: string }} [training]
 * @param {number} [resourceCost]
 */
export function computeMetricsClient(stats = {}, cropUpkeep = 1, training = {}, resourceCost = 0) {
  const attack = Number(stats.attack) || 0;
  const defInf = Number(stats.defenseInfantry) || 0;
  const defCav = Number(stats.defenseCavalry) || 0;
  const speed = Number(stats.speed) || 0;
  const carry = Number(stats.carry) || 0;
  const upkeep = Number(cropUpkeep) || 1;
  const trainTimeSeconds = training?.timeSeconds ?? 0;
  return {
    offense: attack,
    defenseInfantry: defInf,
    defenseCavalry: defCav,
    defenseCombined: Math.round((defInf + defCav) / 2),
    defenseTotal: defInf + defCav,
    speed,
    carry,
    cropUpkeep: upkeep,
    attackPerCrop: upkeep > 0 ? Math.round((attack / upkeep) * 10) / 10 : attack,
    defensePerCrop:
      upkeep > 0 ? Math.round(((defInf + defCav) / upkeep) * 10) / 10 : defInf + defCav,
    trainTimeSeconds,
    trainTimeFormatted: training?.timeFormatted ?? "—",
    resourceCost: resourceCost || 0,
  };
}

function totalCost(cost = {}) {
  return (
    (Number(cost.wood) || 0) +
    (Number(cost.clay) || 0) +
    (Number(cost.iron) || 0) +
    (Number(cost.crop) || 0)
  );
}

/**
 * @param {Array<object>} troops
 */
export function summarizeTribeClient(troops) {
  const combat = troops.filter((t) => !["settler", "chief"].includes(t.role));
  const max = (fn) => Math.max(0, ...combat.map(fn));
  const sum = (fn) => combat.reduce((a, t) => a + fn(t), 0);
  return {
    unitCount: troops.length,
    maxAttack: max((t) => t.metrics.offense),
    maxDefenseInfantry: max((t) => t.metrics.defenseInfantry),
    maxDefenseCavalry: max((t) => t.metrics.defenseCavalry),
    maxSpeed: max((t) => t.metrics.speed),
    maxCarry: max((t) => t.metrics.carry),
    avgAttack: Math.round(sum((t) => t.metrics.offense) / (combat.length || 1)),
    avgDefenseCombined: Math.round(
      sum((t) => t.metrics.defenseCombined) / (combat.length || 1)
    ),
    totalCropUpkeep: troops.reduce((a, t) => a + (Number(t.cropUpkeep) || 0), 0),
  };
}

/**
 * @param {object} tribe
 * @param {{ name?: string, theme?: string, troops?: Array<{ ref: string, name?: string, stats?: object, cost?: object, cropUpkeep?: number }> }} edits
 */
export function applyEditsToTribe(tribe, edits) {
  const next = structuredClone(tribe);
  if (edits.name != null && String(edits.name).trim()) next.name = String(edits.name).trim();
  if (edits.theme != null) next.theme = String(edits.theme);
  const byRef = new Map((edits.troops || []).map((t) => [t.ref, t]));
  for (const troop of next.troops || []) {
    const patch = byRef.get(troop.ref);
    if (!patch) continue;
    if (patch.name != null && String(patch.name).trim()) troop.name = String(patch.name).trim();
    if (patch.stats) troop.stats = { ...(troop.stats || {}), ...patch.stats };
    if (patch.cost) troop.cost = { ...(troop.cost || {}), ...patch.cost };
    if (patch.cropUpkeep != null) troop.cropUpkeep = Number(patch.cropUpkeep);
    troop.totalCost = totalCost(troop.cost);
    troop.metrics = computeMetricsClient(
      troop.stats,
      troop.cropUpkeep,
      troop.training,
      troop.totalCost
    );
  }
  next.summary = summarizeTribeClient(next.troops || []);
  return next;
}

/**
 * Collect troopOverrides payload for PUT /api/tribes/:id from an edited tribe.
 * @param {object} tribe
 */
export function tribeToUpdatePayload(tribe) {
  /** @type {Record<string, object>} */
  const troopOverrides = {};
  /** @type {Record<string, string>} */
  const troopNames = {};
  for (const t of tribe.troops || []) {
    troopNames[t.ref] = t.name;
    troopOverrides[t.ref] = {
      name: t.name,
      stats: {
        attack: Number(t.stats?.attack) || 0,
        defenseInfantry: Number(t.stats?.defenseInfantry) || 0,
        defenseCavalry: Number(t.stats?.defenseCavalry) || 0,
        speed: Number(t.stats?.speed) || 0,
        carry: Number(t.stats?.carry) || 0,
      },
      cost: {
        wood: Number(t.cost?.wood) || 0,
        clay: Number(t.cost?.clay) || 0,
        iron: Number(t.cost?.iron) || 0,
        crop: Number(t.cost?.crop) || 0,
      },
      cropUpkeep: Number(t.cropUpkeep) || 0,
    };
  }
  return {
    name: tribe.name,
    theme: tribe.theme,
    type: tribe.type === "npc" ? "npc" : "playable",
    palette: tribe.palette
      ? { primary: tribe.palette.primary, secondary: tribe.palette.secondary }
      : undefined,
    troopNames,
    troopOverrides,
    heroName: tribe.hero?.name,
    historicalContext: tribe.theme,
  };
}

/**
 * @param {string} tribeId
 * @param {object} payload
 */
export async function saveTribeEdits(tribeId, payload) {
  const res = await fetch(`/api/tribes/${encodeURIComponent(tribeId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) throw new Error(body.error || res.statusText || "Save failed");
  // Session upsert is a no-op on the writable applet; required on Netlify.
  if (body.dashboardTribe) {
    upsertSessionTribe(body.dashboardTribe);
  }
  return body;
}

export function canEditTribe(id) {
  return Boolean(id) && isRemovableTribe(id);
}

/**
 * Read editable fields from the troop table while in edit mode.
 * @param {HTMLElement} tbody
 * @param {object} tribe
 */
export function readEditsFromTable(tbody, tribe) {
  const troops = (tribe.troops || []).map((t) => {
    const row = tbody?.querySelector(`tr[data-troop-ref="${t.ref}"]`);
    if (!row) {
      return {
        ref: t.ref,
        name: t.name,
        stats: { ...t.stats },
        cost: { ...t.cost },
        cropUpkeep: t.cropUpkeep,
      };
    }
    const num = (key) => {
      const el = /** @type {HTMLInputElement | null} */ (row.querySelector(`[data-edit="${key}"]`));
      return el ? Number(el.value) : undefined;
    };
    const nameEl = /** @type {HTMLInputElement | null} */ (row.querySelector(`[data-edit="name"]`));
    return {
      ref: t.ref,
      name: nameEl?.value?.trim() || t.name,
      stats: {
        attack: num("attack") ?? t.stats?.attack,
        defenseInfantry: num("defenseInfantry") ?? t.stats?.defenseInfantry,
        defenseCavalry: num("defenseCavalry") ?? t.stats?.defenseCavalry,
        speed: num("speed") ?? t.stats?.speed,
        carry: num("carry") ?? t.stats?.carry,
      },
      cost: {
        wood: num("wood") ?? t.cost?.wood,
        clay: num("clay") ?? t.cost?.clay,
        iron: num("iron") ?? t.cost?.iron,
        crop: num("crop") ?? t.cost?.crop,
      },
      cropUpkeep: num("cropUpkeep") ?? t.cropUpkeep,
    };
  });

  const nameInput = /** @type {HTMLInputElement | null} */ (document.querySelector("#edit-tribe-name"));
  const themeInput = /** @type {HTMLInputElement | null} */ (document.querySelector("#edit-tribe-theme"));
  return {
    name: nameInput?.value?.trim() || tribe.name,
    theme: themeInput?.value ?? tribe.theme,
    troops,
  };
}
