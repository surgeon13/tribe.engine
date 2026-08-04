import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const STORE_DIR = path.join(root, "data", "leader-monitor");
const SNAPSHOTS_PATH = path.join(STORE_DIR, "snapshots.json");

/** @typedef {import('./types.js').LeaderSnapshot} LeaderSnapshot */

/** @returns {Promise<LeaderSnapshot[]>} */
export async function loadSnapshots() {
  try {
    const raw = await fs.readFile(SNAPSHOTS_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    if (e?.code === "ENOENT") return [];
    throw e;
  }
}

/** @param {LeaderSnapshot[]} snapshots */
async function writeSnapshots(snapshots) {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(SNAPSHOTS_PATH, JSON.stringify(snapshots, null, 2) + "\n", "utf8");
}

/**
 * @param {LeaderSnapshot} snapshot
 * @param {number} [maxSnapshots]
 */
export async function appendSnapshot(snapshot, maxSnapshots = 2000) {
  const snapshots = await loadSnapshots();
  snapshots.push(snapshot);
  const trimmed = snapshots.length > maxSnapshots ? snapshots.slice(-maxSnapshots) : snapshots;
  await writeSnapshots(trimmed);
  return trimmed;
}

/** @returns {Promise<void>} */
export async function clearSnapshots() {
  await writeSnapshots([]);
}

export function snapshotsPath() {
  return SNAPSHOTS_PATH;
}
