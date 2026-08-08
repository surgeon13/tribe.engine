/**
 * Edit mode for created (non-core) tribes — tune every stored troop-table field.
 */

import { isRemovableTribe } from "./tribe-create.js";
import { upsertSessionTribe } from "./session-tribes.js";

export const ROLE_OPTIONS = ["infantry", "scout", "cavalry", "siege", "chief", "settler"];

export const BUILDING_OPTIONS = [
  { id: "barracks", label: "Barracks" },
  { id: "stable", label: "Stable" },
  { id: "workshop", label: "Workshop" },
  { id: "residence", label: "Residence / Palace" },
  { id: "hero_mansion", label: "Hero's Mansion" },
];

const BUILDING_LABELS = Object.fromEntries(BUILDING_OPTIONS.map((b) => [b.id, b.label]));

/**
 * @param {number | null | undefined} seconds
 */
export function formatTrainingTimeClient(seconds) {
  if (seconds == null || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

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
    trainTimeFormatted: training?.timeFormatted ?? formatTrainingTimeClient(trainTimeSeconds),
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
 * @param {{ name?: string, theme?: string, troops?: Array<object> }} edits
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
    if (patch.role) troop.role = String(patch.role);
    if (patch.stats) troop.stats = { ...(troop.stats || {}), ...patch.stats };
    if (patch.cost) troop.cost = { ...(troop.cost || {}), ...patch.cost };
    if (patch.cropUpkeep != null) troop.cropUpkeep = Number(patch.cropUpkeep);
    if (patch.training) {
      const building = String(patch.training.building || troop.training?.building || "barracks");
      const timeSeconds = Number(patch.training.timeSeconds ?? troop.training?.timeSeconds ?? 0);
      troop.training = {
        ...(troop.training || {}),
        building,
        buildingLabel: BUILDING_LABELS[building] || building,
        timeSeconds,
        timeFormatted: formatTrainingTimeClient(timeSeconds),
      };
    }
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
 * Collect troopOverrides + training payload for PUT /api/tribes/:id.
 * @param {object} tribe
 */
export function tribeToUpdatePayload(tribe) {
  /** @type {Record<string, object>} */
  const troopOverrides = {};
  /** @type {Record<string, string>} */
  const troopNames = {};
  /** @type {Record<string, { building: string, timeSeconds: number }>} */
  const training = {};
  for (const t of tribe.troops || []) {
    troopNames[t.ref] = t.name;
    training[t.ref] = {
      building: t.training?.building || "barracks",
      timeSeconds: Number(t.training?.timeSeconds) || 0,
    };
    troopOverrides[t.ref] = {
      name: t.name,
      role: t.role,
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
      training: training[t.ref],
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
    training,
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
  if (body.dashboardTribe) {
    upsertSessionTribe(body.dashboardTribe);
  }
  return body;
}

export function canEditTribe(id) {
  return Boolean(id) && isRemovableTribe(id);
}

function escapeAttr(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/**
 * @param {string} key
 * @param {string | number} value
 * @param {{ name?: boolean, title?: string }} [opts]
 */
export function cellInputHtml(key, value, opts = {}) {
  const v = value ?? (opts.name ? "" : 0);
  const cls = opts.name ? "cell-edit cell-edit-name" : "cell-edit";
  const type = opts.name ? "text" : "number";
  const extra = opts.name ? "" : 'min="0" step="1"';
  const title = opts.title ? ` title="${escapeAttr(opts.title)}"` : "";
  return `<input class="${cls}" type="${type}" data-edit="${key}" value="${escapeAttr(v)}" ${extra}${title} />`;
}

/**
 * @param {string} key
 * @param {string} value
 * @param {Array<{ id: string, label?: string } | string>} options
 */
export function cellSelectHtml(key, value, options) {
  const opts = options
    .map((o) => {
      const id = typeof o === "string" ? o : o.id;
      const label = typeof o === "string" ? o : o.label || o.id;
      const sel = id === value ? " selected" : "";
      return `<option value="${escapeAttr(id)}"${sel}>${escapeAttr(label)}</option>`;
    })
    .join("");
  return `<select class="cell-edit cell-edit-select" data-edit="${key}">${opts}</select>`;
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
        role: t.role,
        stats: { ...t.stats },
        cost: { ...t.cost },
        cropUpkeep: t.cropUpkeep,
        training: {
          building: t.training?.building,
          timeSeconds: t.training?.timeSeconds,
        },
      };
    }
    const val = (key) => {
      const el = /** @type {HTMLInputElement | HTMLSelectElement | null} */ (
        row.querySelector(`[data-edit="${key}"]`)
      );
      return el ? el.value : undefined;
    };
    const num = (key) => {
      const raw = val(key);
      return raw === undefined || raw === "" ? undefined : Number(raw);
    };
    const building = val("building") || t.training?.building || "barracks";
    const timeSeconds = num("timeSeconds") ?? t.training?.timeSeconds ?? 0;
    return {
      ref: t.ref,
      name: (val("name") || "").trim() || t.name,
      role: val("role") || t.role,
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
      training: { building, timeSeconds },
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
