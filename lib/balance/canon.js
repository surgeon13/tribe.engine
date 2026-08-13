/**
 * The Travian tribes, as Travian ships them.
 *
 * Eight of the eighteen tribes in this project are not ours to balance: the
 * Romans, Teutons, Gauls, Egyptians, Huns and Spartans are the game's own, and
 * the Natars and Nature are its NPCs. Their numbers are published, players
 * already know them by heart, and every combat calculator on the internet
 * assumes them. Regenerating those from our identity dials — which is what was
 * happening — quietly turned a Marksman from 110/80/70 into 142/46/42 and made
 * the whole roster wrong in a way no amount of internal consistency fixes.
 *
 * So the canon is data, loaded from data/balance/travian-canon.json, and the
 * generator is told to keep its hands off it.
 *
 * Each canonical tribe fills ten of our eleven slots. Travian gives every tribe
 * ten units and our roster has eleven, so exactly one slot per tribe is ours to
 * invent — Rome's Equites Regales, Gaul's Tracker, the Hun Warrior. That slot,
 * and that slot only, is still generated, and it is held to the tribe's own
 * canonical roster rather than allowed to tower over it.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const canonPath = path.join(__dirname, "..", "..", "data", "balance", "travian-canon.json");

/** @typedef {{ attack: number, defenseInfantry: number, defenseCavalry: number, speed: number, carry: number }} Stats */
/** @typedef {{ wood: number, clay: number, iron: number, crop: number }} Cost */
/** @typedef {{ name: string, stats: Stats, cost?: Cost, cropUpkeep?: number, timeSeconds?: number }} CanonUnit */

/** @type {{ version: number, tribes: Record<string, { extendedSlot: string, units: Record<string, CanonUnit> }> }} */
export const TRAVIAN_CANON = JSON.parse(fs.readFileSync(canonPath, "utf8"));

/** Tribe ids Travian defines and we only transcribe. */
export const CANON_TRIBES = Object.freeze(Object.keys(TRAVIAN_CANON.tribes));

/**
 * @param {string} tribeId
 * @returns {boolean}
 */
export function isCanonTribe(tribeId) {
  return Boolean(TRAVIAN_CANON.tribes[tribeId]);
}

/**
 * The published units for a tribe, by slot.
 * @param {string} tribeId
 * @returns {Record<string, CanonUnit>}
 */
export function canonUnits(tribeId) {
  return TRAVIAN_CANON.tribes[tribeId]?.units || {};
}

/**
 * The one slot in a canonical tribe that Travian does not fill, and we do.
 * @param {string} tribeId
 * @returns {string | null}
 */
export function extendedSlot(tribeId) {
  return TRAVIAN_CANON.tribes[tribeId]?.extendedSlot ?? null;
}

/**
 * True when this tribe/slot pair is published by Travian and must not move.
 * @param {string} tribeId
 * @param {string} ref
 */
export function isCanonUnit(tribeId, ref) {
  return Boolean(TRAVIAN_CANON.tribes[tribeId]?.units?.[ref]);
}
