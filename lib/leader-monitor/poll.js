import { fetchMockLeaders } from "./adapter-mock.js";
import { fetchTravianLeaders } from "./adapter-travian.js";
import { loadConfig, saveConfig } from "./config.js";
import { appendSnapshot, loadSnapshots } from "./store.js";
import { buildAnalytics, formatNumber, formatResources } from "./analytics.js";

/** @typedef {import('./types.js').LeaderSnapshot} LeaderSnapshot */
/** @typedef {import('./types.js').MonitorConfig} MonitorConfig */

/**
 * @param {MonitorConfig} config
 */
async function fetchLeaders(config) {
  const topCount = config.topCount || 10;
  if (config.adapter === "travian") {
    return fetchTravianLeaders(config.serverUrl, topCount);
  }
  return fetchMockLeaders(topCount);
}

export class LeaderMonitor {
  /** @type {NodeJS.Timeout|null} */
  #timer = null;
  /** @type {MonitorConfig|null} */
  #config = null;
  /** @type {LeaderSnapshot|null} */
  #lastSnapshot = null;
  /** @type {LeaderSnapshot[]} */
  #memorySnapshots = [];
  #running = false;
  /** @type {((snap: LeaderSnapshot) => void)|null} */
  #onSnapshot = null;
  /** @type {((line: string) => void)|null} */
  #onTerminal = null;

  /**
   * @param {{ onSnapshot?: (snap: LeaderSnapshot) => void, onTerminal?: (line: string) => void }} [hooks]
   */
  constructor(hooks = {}) {
    this.#onSnapshot = hooks.onSnapshot || null;
    this.#onTerminal = hooks.onTerminal || null;
  }

  get lastSnapshot() {
    return this.#lastSnapshot;
  }

  get isRunning() {
    return this.#running;
  }

  async getConfig() {
    if (!this.#config) this.#config = await loadConfig();
    return this.#config;
  }

  /** @param {Partial<MonitorConfig>} patch */
  async updateConfig(patch) {
    const current = await this.getConfig();
    this.#config = await saveConfig({ ...current, ...patch });
    if (this.#config.enabled) await this.start();
    else await this.stop();
    return this.#config;
  }

  /** @param {string} line */
  #terminal(line) {
    if (this.#config?.terminalOutput) {
      this.#onTerminal?.(line);
    }
  }

  async pollOnce() {
    const config = await this.getConfig();
    const started = Date.now();

    const leaders = await fetchLeaders(config);
    /** @type {LeaderSnapshot} */
    const snapshot = {
      timestamp: new Date().toISOString(),
      pollMs: Date.now() - started,
      adapter: config.adapter,
      leaders,
    };

    this.#lastSnapshot = snapshot;
    let snapshots;
    if (config.storeSnapshots) {
      snapshots = await appendSnapshot(snapshot, config.maxSnapshots);
    } else {
      this.#memorySnapshots.push(snapshot);
      if (this.#memorySnapshots.length > config.maxSnapshots) {
        this.#memorySnapshots = this.#memorySnapshots.slice(-config.maxSnapshots);
      }
      snapshots = this.#memorySnapshots;
    }
    const analytics = buildAnalytics(snapshots, config);
    this.#printTerminalSummary(snapshot, analytics);

    this.#onSnapshot?.(snapshot);
    return snapshot;
  }

  /** @param {LeaderSnapshot} snapshot @param {import('./types.js').MonitorAnalytics} analytics */
  #printTerminalSummary(snapshot, analytics) {
    const agg = analytics.aggregate;
    const hour = analytics.rates.find((r) => r.windowMs === 3_600_000);
    const activeRaid = analytics.raids.find((r) => r.status === "active");

    const lines = [
      `[${snapshot.timestamp}] Top ${snapshot.leaders.length} aggregate`,
      `  Points: ${formatNumber(agg.points)} (+${formatNumber(hour?.pointsPerHour || 0)}/hr)`,
      `  Resources: ${formatNumber(agg.totalResources)} (+${formatNumber(hour?.totalResourcesPerHour || 0)}/hr)`,
      `  ${formatResources(agg.resources)}`,
    ];

    if (activeRaid) {
      lines.push(
        `  Raid ACTIVE since ${activeRaid.start} — loot ${formatNumber(activeRaid.totalResourcesRaised)}`
      );
    } else {
      const lastEnded = [...analytics.raids].reverse().find((r) => r.status === "ended");
      if (lastEnded) {
        lines.push(
          `  Last raid ended ${lastEnded.end} — loot ${formatNumber(lastEnded.totalResourcesRaised)}`
        );
      }
    }

    for (const line of lines) this.#terminal(line);
  }

  async start() {
    const config = await this.getConfig();
    if (!config.enabled) {
      await this.stop();
      return;
    }

    if (this.#running) {
      clearInterval(this.#timer);
    }

    this.#running = true;
    this.#terminal(`Leader monitor started (${config.adapter}, every ${config.pollIntervalMs}ms)`);

    await this.pollOnce().catch((e) => this.#terminal(`Poll error: ${e.message}`));

    this.#timer = setInterval(() => {
      this.pollOnce().catch((e) => this.#terminal(`Poll error: ${e.message}`));
    }, config.pollIntervalMs);
  }

  async stop() {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    this.#running = false;
    this.#terminal("Leader monitor stopped");
  }

  async getAnalytics() {
    const config = await this.getConfig();
    const snapshots = config.storeSnapshots
      ? await loadSnapshots()
      : this.#memorySnapshots.length
        ? this.#memorySnapshots
        : await loadSnapshots();
    return buildAnalytics(snapshots, config);
  }

  async getSnapshots() {
    const config = await this.getConfig();
    if (config.storeSnapshots) return loadSnapshots();
    if (this.#memorySnapshots.length) return this.#memorySnapshots;
    return loadSnapshots();
  }
}

/** @type {LeaderMonitor|null} */
let singleton = null;

/** @param {{ onSnapshot?: (snap: LeaderSnapshot) => void, onTerminal?: (line: string) => void }} [hooks] */
export function getLeaderMonitor(hooks = {}) {
  if (!singleton) {
    singleton = new LeaderMonitor(hooks);
  }
  return singleton;
}
