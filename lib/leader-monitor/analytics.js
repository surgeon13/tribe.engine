/** @typedef {import('./types.js').LeaderEntry} LeaderEntry */
/** @typedef {import('./types.js').LeaderResources} LeaderResources */
/** @typedef {import('./types.js').LeaderSnapshot} LeaderSnapshot */
/** @typedef {import('./types.js').RateWindow} RateWindow */
/** @typedef {import('./types.js').RaidSession} RaidSession */
/** @typedef {import('./types.js').MonitorAnalytics} MonitorAnalytics */
/** @typedef {import('./types.js').MonitorConfig} MonitorConfig */

const RATE_WINDOWS = [
  { label: "1 hour", windowMs: 3_600_000 },
  { label: "2 hours", windowMs: 7_200_000 },
  { label: "24 hours", windowMs: 86_400_000 },
];

/** @param {LeaderEntry[]} leaders */
export function aggregateLeaders(leaders) {
  const resources = { wood: 0, clay: 0, iron: 0, crop: 0 };
  let points = 0;
  for (const l of leaders) {
    points += l.points || 0;
    resources.wood += l.resources?.wood || 0;
    resources.clay += l.resources?.clay || 0;
    resources.iron += l.resources?.iron || 0;
    resources.crop += l.resources?.crop || 0;
  }
  return {
    points,
    resources,
    totalResources: resources.wood + resources.clay + resources.iron + resources.crop,
  };
}

/**
 * @param {LeaderSnapshot} a
 * @param {LeaderSnapshot} b
 */
export function snapshotDelta(a, b) {
  const aggA = aggregateLeaders(a.leaders);
  const aggB = aggregateLeaders(b.leaders);
  return {
    points: aggB.points - aggA.points,
    resources: {
      wood: aggB.resources.wood - aggA.resources.wood,
      clay: aggB.resources.clay - aggA.resources.clay,
      iron: aggB.resources.iron - aggA.resources.iron,
      crop: aggB.resources.crop - aggA.resources.crop,
    },
    totalResources:
      aggB.totalResources - aggA.totalResources,
    elapsedMs: new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  };
}

/**
 * @param {number} delta
 * @param {number} elapsedMs
 */
function perHour(delta, elapsedMs) {
  if (!elapsedMs || elapsedMs <= 0) return 0;
  return (delta / elapsedMs) * 3_600_000;
}

/**
 * @param {LeaderSnapshot[]} snapshots
 * @param {number} windowMs
 * @returns {{ older: LeaderSnapshot, newer: LeaderSnapshot }|null}
 */
function findWindowPair(snapshots, windowMs) {
  if (snapshots.length < 2) return null;
  const newer = snapshots[snapshots.length - 1];
  const newerTs = new Date(newer.timestamp).getTime();
  const target = newerTs - windowMs;

  let older = snapshots[0];
  for (let i = snapshots.length - 2; i >= 0; i--) {
    const ts = new Date(snapshots[i].timestamp).getTime();
    if (ts <= target) {
      older = snapshots[i];
      break;
    }
    older = snapshots[i];
  }

  if (older.timestamp === newer.timestamp) return null;
  return { older, newer };
}

/** @param {LeaderSnapshot[]} snapshots */
export function computeRates(snapshots) {
  /** @type {RateWindow[]} */
  const rates = [];

  for (const { label, windowMs } of RATE_WINDOWS) {
    const pair = findWindowPair(snapshots, windowMs);
    if (!pair) {
      rates.push({
        label,
        windowMs,
        pointsPerHour: 0,
        resourcesPerHour: { wood: 0, clay: 0, iron: 0, crop: 0 },
        totalResourcesPerHour: 0,
      });
      continue;
    }

    const delta = snapshotDelta(pair.older, pair.newer);
    rates.push({
      label,
      windowMs,
      pointsPerHour: perHour(delta.points, delta.elapsedMs),
      resourcesPerHour: {
        wood: perHour(delta.resources.wood, delta.elapsedMs),
        clay: perHour(delta.resources.clay, delta.elapsedMs),
        iron: perHour(delta.resources.iron, delta.elapsedMs),
        crop: perHour(delta.resources.crop, delta.elapsedMs),
      },
      totalResourcesPerHour: perHour(delta.totalResources, delta.elapsedMs),
    });
  }

  return rates;
}

/**
 * Detect raid activity from aggregate resource deltas between polls.
 * @param {LeaderSnapshot[]} snapshots
 * @param {Pick<MonitorConfig, 'raidActivityThreshold'|'raidIdlePolls'>} config
 */
export function detectRaidSessions(snapshots, config) {
  if (snapshots.length < 2) return [];

  const threshold = config.raidActivityThreshold ?? 5000;
  const idlePolls = config.raidIdlePolls ?? 2;

  /** @type {RaidSession[]} */
  const sessions = [];
  /** @type {RaidSession|null} */
  let current = null;
  let idleCount = 0;

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const next = snapshots[i];
    const delta = snapshotDelta(prev, next);
    const active = delta.totalResources >= threshold;

    if (active) {
      idleCount = 0;
      if (!current) {
        current = {
          start: next.timestamp,
          end: next.timestamp,
          durationMs: delta.elapsedMs,
          pointsGained: delta.points,
          resourcesRaised: { ...delta.resources },
          totalResourcesRaised: delta.totalResources,
          status: "active",
        };
      } else {
        current.end = next.timestamp;
        current.durationMs += delta.elapsedMs;
        current.pointsGained += delta.points;
        current.resourcesRaised.wood += delta.resources.wood;
        current.resourcesRaised.clay += delta.resources.clay;
        current.resourcesRaised.iron += delta.resources.iron;
        current.resourcesRaised.crop += delta.resources.crop;
        current.totalResourcesRaised += delta.totalResources;
      }
    } else if (current) {
      idleCount++;
      if (idleCount >= idlePolls) {
        current.status = "ended";
        sessions.push(current);
        current = null;
        idleCount = 0;
      }
    }
  }

  if (current) {
    sessions.push(current);
  }

  return sessions;
}

/**
 * @param {LeaderSnapshot[]} snapshots
 * @param {MonitorConfig} [config]
 * @returns {MonitorAnalytics}
 */
export function buildAnalytics(snapshots, config = {}) {
  const latest = snapshots.length ? snapshots[snapshots.length - 1] : null;
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  return {
    latest,
    previous,
    rates: computeRates(snapshots),
    raids: detectRaidSessions(snapshots, config),
    aggregate: latest ? aggregateLeaders(latest.leaders) : {
      points: 0,
      resources: { wood: 0, clay: 0, iron: 0, crop: 0 },
      totalResources: 0,
    },
    snapshotCount: snapshots.length,
  };
}

/** @param {number} n */
export function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toLocaleString("en-US");
}

/** @param {LeaderResources} res */
export function formatResources(res) {
  return `W ${formatNumber(res.wood)} · C ${formatNumber(res.clay)} · I ${formatNumber(res.iron)} · Cr ${formatNumber(res.crop)}`;
}
