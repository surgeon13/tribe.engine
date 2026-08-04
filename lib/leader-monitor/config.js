import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const CONFIG_PATH = path.join(root, "data", "leader-monitor.config.json");

/** @typedef {import('./types.js').MonitorConfig} MonitorConfig */

const DEFAULTS = {
  enabled: false,
  pollIntervalMs: 300_000,
  topCount: 10,
  adapter: "mock",
  serverUrl: null,
  terminalOutput: true,
  storeSnapshots: true,
  maxSnapshots: 2000,
  raidActivityThreshold: 5000,
  raidIdlePolls: 2,
};

/** @returns {MonitorConfig} */
export function defaultConfig() {
  return { ...DEFAULTS };
}

/** @param {Partial<MonitorConfig>} patch */
function mergeConfig(patch = {}) {
  return { ...DEFAULTS, ...patch };
}

/** @returns {Promise<MonitorConfig>} */
export async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return mergeConfig(JSON.parse(raw));
  } catch (e) {
    if (e?.code === "ENOENT") {
      const cfg = defaultConfig();
      await saveConfig(cfg);
      return cfg;
    }
    throw e;
  }
}

/** @param {Partial<MonitorConfig>} config */
export async function saveConfig(config) {
  const merged = mergeConfig(config);
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2) + "\n", "utf8");
  return merged;
}

export function configPath() {
  return CONFIG_PATH;
}
