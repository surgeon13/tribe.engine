/** Normalize combat stats by crop, resources, or training time. */

export const NORMALIZE_MODES = [
  { id: "raw", label: "Raw stats", unit: "", description: "Game values as-is." },
  {
    id: "crop",
    label: "Per crop upkeep",
    unit: "/ crop",
    description: "Stat ÷ hourly crop consumption — higher means more power per upkeep.",
  },
  {
    id: "cost",
    label: "Per 1k resources",
    unit: "/ 1k res",
    description: "Stat ÷ (total training cost ÷ 1000) — power per resource spent.",
  },
  {
    id: "time",
    label: "Per train hour",
    unit: "/ hr",
    description: "Stat ÷ training hours — power produced per hour in the building queue.",
  },
];

export const COMBAT_STAT_KEYS = [
  "offense",
  "defenseInfantry",
  "defenseCavalry",
  "speed",
  "carry",
];

/** Profile axes when showing raw game numbers. */
export const RAW_PROFILE_AXES = [
  { key: "offense", label: "ATK", name: "Attack", higherBetter: true, colorVar: "--stat-atk" },
  {
    key: "defenseInfantry",
    label: "DEF-I",
    name: "Def vs infantry",
    higherBetter: true,
    colorVar: "--stat-def-inf",
  },
  {
    key: "defenseCavalry",
    label: "DEF-C",
    name: "Def vs cavalry",
    higherBetter: true,
    colorVar: "--stat-def-cav",
  },
  { key: "speed", label: "SPD", name: "Speed", higherBetter: true, colorVar: "--stat-spd" },
  { key: "carry", label: "CRR", name: "Carry capacity", higherBetter: true, colorVar: "--stat-carry" },
  {
    key: "trainTimeSeconds",
    label: "TRN",
    name: "Training time",
    higherBetter: false,
    colorVar: "--stat-trn",
  },
  {
    key: "resourceCost",
    label: "COST",
    name: "Resource cost",
    higherBetter: false,
    colorVar: "--stat-cost",
  },
];

const AXIS_COLORS = {
  offense: "--stat-atk",
  defenseInfantry: "--stat-def-inf",
  defenseCavalry: "--stat-def-cav",
  speed: "--stat-spd",
  carry: "--stat-carry",
  trainTimeSeconds: "--stat-trn",
  resourceCost: "--stat-cost",
};

/** @param {string} id */
export function getNormalizeMode(id) {
  return NORMALIZE_MODES.find((m) => m.id === id) || NORMALIZE_MODES[0];
}

/**
 * @param {object} metrics
 * @param {string} mode
 * @returns {number | null}
 */
export function normalizeDivisor(metrics, mode) {
  if (mode === "raw") return 1;
  if (mode === "crop") return Math.max(metrics.cropUpkeep ?? 1, 0.1);
  if (mode === "cost") {
    const cost = metrics.resourceCost ?? 0;
    return cost > 0 ? cost / 1000 : null;
  }
  if (mode === "time") {
    const sec = metrics.trainTimeSeconds ?? 0;
    return sec > 0 ? sec / 3600 : null;
  }
  return 1;
}

/**
 * @param {number | null | undefined} raw
 * @param {object} metrics
 * @param {string} mode
 */
export function normalizeStatValue(raw, metrics, mode) {
  if (mode === "raw") return raw ?? 0;
  const div = normalizeDivisor(metrics, mode);
  if (div == null || div <= 0) return 0;
  return (raw ?? 0) / div;
}

/**
 * Metrics object for bars / scales (adds _normalizeMode for formatting).
 * @param {object} baseMetrics
 * @param {string} mode
 */
export function buildViewMetrics(baseMetrics, mode) {
  if (mode === "raw") return { ...baseMetrics, _normalizeMode: "raw" };
  const out = { ...baseMetrics, _normalizeMode: mode };
  for (const key of COMBAT_STAT_KEYS) {
    out[key] = normalizeStatValue(baseMetrics[key], baseMetrics, mode);
  }
  return out;
}

/**
 * @param {string} mode
 */
export function getProfileAxes(mode) {
  if (mode === "raw") return RAW_PROFILE_AXES;
  const { unit } = getNormalizeMode(mode);
  return COMBAT_STAT_KEYS.map((key) => {
    const raw = RAW_PROFILE_AXES.find((a) => a.key === key);
    const suffix = unit ? ` ${unit}` : "";
    return {
      key,
      label: raw?.label || key,
      name: `${raw?.name || key}${suffix}`,
      higherBetter: true,
      colorVar: AXIS_COLORS[key] || "--stat-atk",
    };
  });
}

/**
 * @param {number} n
 * @param {string} [mode]
 */
export function formatNormalizedNumber(n, mode = "raw") {
  if (mode === "raw") return String(Math.round(n));
  if (n === 0) return "0";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

/**
 * @param {string} key
 * @param {number} raw
 * @param {object} metrics
 * @param {{ normalizeMode?: string }} [opts]
 */
export function formatViewStatValue(key, raw, metrics = {}, opts = {}) {
  const mode = opts.normalizeMode || metrics._normalizeMode || "raw";
  if (mode !== "raw" && COMBAT_STAT_KEYS.includes(key)) {
    return formatNormalizedNumber(raw ?? 0, mode);
  }
  if (key === "trainTimeSeconds") {
    return metrics.trainTimeFormatted || (raw > 0 ? `${raw}s` : "—");
  }
  if (key === "resourceCost") {
    const n = raw ?? 0;
    return n > 0 ? n.toLocaleString() : "0";
  }
  return String(Math.round(raw ?? 0));
}

/**
 * @param {object} troop
 * @param {string} metricKey
 * @param {string} normalizeMode
 */
export function chartMetricValue(troop, metricKey, normalizeMode) {
  const m = troop.metrics;
  if (normalizeMode === "raw") return rawChartValue(troop, metricKey);

  if (COMBAT_STAT_KEYS.includes(metricKey)) {
    return normalizeStatValue(m[metricKey], m, normalizeMode);
  }
  if (metricKey === "trainTimeSeconds" && normalizeMode === "time") {
    const sec = m.trainTimeSeconds ?? 0;
    return sec > 0 ? 3600 / sec : 0;
  }
  return rawChartValue(troop, metricKey);
}

/** @param {object} troop @param {string} metricKey */
export function rawChartValue(troop, metricKey) {
  const m = troop.metrics;
  if (metricKey === "trainTimeSeconds") return m.trainTimeSeconds ?? 0;
  if (metricKey === "resourceCost") return m.resourceCost ?? troop.totalCost ?? 0;
  return m[metricKey] ?? 0;
}

/**
 * @param {{ label: string, key: string, combat?: boolean }} metric
 * @param {string} normalizeMode
 */
export function chartMetricLabel(metric, normalizeMode) {
  if (normalizeMode === "raw") return metric.label;
  if (metric.combat) {
    const unit = getNormalizeMode(normalizeMode).unit;
    return `${metric.label}${unit ? ` ${unit}` : ""}`;
  }
  if (metric.key === "trainTimeSeconds" && normalizeMode === "time") {
    return "Trains per hour";
  }
  return metric.label;
}

/** @param {string} normalizeMode */
export function normalizeModeHint(normalizeMode) {
  return getNormalizeMode(normalizeMode).description;
}
