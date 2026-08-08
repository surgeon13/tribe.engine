/**
 * Append-only tribe edit history — helps normalize stats across contributor updates.
 */

import fs from "fs/promises";
import path from "path";
import { resolveRepoRoot } from "../repo-root.js";

const root = resolveRepoRoot();
const historyRel = "tribe-edit-history.json";
const MAX_GLOBAL = 400;
const MAX_PER_TRIBE = 40;

/**
 * @returns {Promise<{ version: number, entries: object[] }>}
 */
export async function readEditHistory() {
  try {
    const raw = await fs.readFile(path.join(root, "data", historyRel), "utf8");
    const doc = JSON.parse(raw);
    return {
      version: doc.version || 1,
      entries: Array.isArray(doc.entries) ? doc.entries : [],
    };
  } catch (e) {
    if (e.code === "ENOENT") return { version: 1, entries: [] };
    throw e;
  }
}

async function writeEditHistory(doc) {
  await fs.writeFile(
    path.join(root, "data", historyRel),
    `${JSON.stringify(doc, null, 2)}\n`,
    "utf8"
  );
}

/**
 * Compact troop snapshot for history / normalization.
 * @param {object} tribeDoc on-disk tribe JSON or dashboard tribe
 */
export function snapshotFromTribeDoc(tribeDoc) {
  if (!tribeDoc) return null;
  // Dashboard-resolved tribe
  if (Array.isArray(tribeDoc.troops) && tribeDoc.troops[0]?.stats) {
    return {
      name: tribeDoc.name,
      theme: tribeDoc.theme,
      palette: tribeDoc.palette
        ? { primary: tribeDoc.palette.primary, secondary: tribeDoc.palette.secondary }
        : null,
      troops: tribeDoc.troops.map((t) => ({
        ref: t.ref,
        name: t.name,
        role: t.role,
        stats: { ...(t.stats || {}) },
        cost: { ...(t.cost || {}) },
        cropUpkeep: t.cropUpkeep,
        training: t.training
          ? { building: t.training.building, timeSeconds: t.training.timeSeconds }
          : null,
      })),
    };
  }
  // On-disk tribe document
  return {
    name: tribeDoc.tribe?.name?.en || tribeDoc.tribe?.id,
    theme: tribeDoc.tribe?.theme,
    palette: tribeDoc.palette
      ? { primary: tribeDoc.palette.primary, secondary: tribeDoc.palette.secondary }
      : null,
    troops: (tribeDoc.troops || []).map((t) => ({
      ref: t.ref,
      name: t.overrides?.name?.en || t.ref,
      role: t.overrides?.role,
      stats: { ...(t.overrides?.stats || {}) },
      cost: { ...(t.overrides?.cost || {}) },
      cropUpkeep: t.overrides?.cropUpkeep,
      training: t.overrides?.training
        ? {
            building: t.overrides.training.building,
            timeSeconds: t.overrides.training.timeSeconds,
          }
        : null,
    })),
  };
}

function summarizeDiff(before, after) {
  if (!before || !after) return "Full update";
  const bits = [];
  if (before.name !== after.name) bits.push("name");
  if (before.theme !== after.theme) bits.push("theme");
  if (
    before.palette?.primary !== after.palette?.primary ||
    before.palette?.secondary !== after.palette?.secondary
  ) {
    bits.push("colors");
  }
  let troopEdits = 0;
  const afterByRef = new Map((after.troops || []).map((t) => [t.ref, t]));
  for (const b of before.troops || []) {
    const a = afterByRef.get(b.ref);
    if (!a) continue;
    if (JSON.stringify(b) !== JSON.stringify(a)) troopEdits += 1;
  }
  if (troopEdits) bits.push(`${troopEdits} unit${troopEdits === 1 ? "" : "s"}`);
  return bits.length ? bits.join(", ") : "No field changes detected";
}

/**
 * @param {object} opts
 * @param {string} opts.tribeId
 * @param {string} [opts.tribeName]
 * @param {string} [opts.author]
 * @param {string} [opts.source]
 * @param {string} [opts.note]
 * @param {object} [opts.before]
 * @param {object} [opts.after]
 * @param {boolean} [opts.persist=true]
 */
export async function appendEditHistory(opts = {}) {
  const tribeId = String(opts.tribeId || "").trim();
  if (!tribeId) throw new Error("tribeId required for history");

  const entry = {
    id: `eh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    tribeId,
    tribeName: opts.tribeName || tribeId,
    at: new Date().toISOString(),
    author: String(opts.author || "anonymous").trim().slice(0, 80) || "anonymous",
    source: opts.source || (opts.persist === false ? "session" : "applet"),
    note: opts.note ? String(opts.note).slice(0, 240) : "",
    summary: summarizeDiff(opts.before, opts.after),
    before: opts.before || null,
    after: opts.after || null,
  };

  if (opts.persist === false) {
    return { entry, persisted: false };
  }

  const doc = await readEditHistory();
  doc.entries.unshift(entry);
  // Cap per-tribe and global
  const perTribe = new Map();
  const kept = [];
  for (const e of doc.entries) {
    const n = perTribe.get(e.tribeId) || 0;
    if (n >= MAX_PER_TRIBE) continue;
    perTribe.set(e.tribeId, n + 1);
    kept.push(e);
    if (kept.length >= MAX_GLOBAL) break;
  }
  doc.entries = kept;
  doc.version = 1;
  await writeEditHistory(doc);
  return { entry, persisted: true, total: doc.entries.length };
}

/**
 * @param {{ tribeId?: string, limit?: number }} [opts]
 */
export async function listEditHistory(opts = {}) {
  const doc = await readEditHistory();
  let entries = doc.entries;
  if (opts.tribeId) {
    const id = String(opts.tribeId);
    entries = entries.filter((e) => e.tribeId === id);
  }
  const limit = Math.max(1, Math.min(200, Number(opts.limit) || 40));
  return {
    version: doc.version,
    entries: entries.slice(0, limit),
    total: entries.length,
  };
}

/**
 * Collect prior numeric samples for a slot — useful for normalization UI.
 * @param {string} tribeId
 * @param {string} ref
 * @param {number} [limit=12]
 */
export async function slotHistorySamples(tribeId, ref, limit = 12) {
  const { entries } = await listEditHistory({ tribeId, limit: 80 });
  const samples = [];
  for (const e of entries) {
    const troop = (e.after?.troops || []).find((t) => t.ref === ref);
    if (!troop?.stats) continue;
    samples.push({
      at: e.at,
      author: e.author,
      attack: troop.stats.attack,
      defenseInfantry: troop.stats.defenseInfantry,
      defenseCavalry: troop.stats.defenseCavalry,
      speed: troop.stats.speed,
      carry: troop.stats.carry,
      cropUpkeep: troop.cropUpkeep,
    });
    if (samples.length >= limit) break;
  }
  return samples;
}
