/** Relative stat profile: labeled bars with optional normalization. */

import {
  buildViewMetrics,
  formatViewStatValue,
  getProfileAxes,
  RAW_PROFILE_AXES,
} from "./metrics-normalize.js";
import { getRadarChromeColors, resolveBarColors } from "./themes.js";
import { mountPortrait, portraitOptsFromUnit } from "./graphics.js";

/** Dashboard profile: combat + training + cost (raw mode). */
export const PROFILE_AXES = RAW_PROFILE_AXES;

const STAT_COLOR_FALLBACKS = {
  offense: "#ff5c38",
  defenseInfantry: "#3d9eff",
  defenseCavalry: "#6eb5ff",
  speed: "#3de68a",
  carry: "#50d4c8",
  trainTimeSeconds: "#ffc233",
  resourceCost: "#c56bff",
};

/** Vivid per-axis colors for bars and radar vertices. */
export function getStatAxisColors() {
  const s = getComputedStyle(document.documentElement);
  const v = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
  return {
    offense: v("--stat-atk", STAT_COLOR_FALLBACKS.offense),
    defenseInfantry: v("--stat-def-inf", STAT_COLOR_FALLBACKS.defenseInfantry),
    defenseCavalry: v("--stat-def-cav", STAT_COLOR_FALLBACKS.defenseCavalry),
    speed: v("--stat-spd", STAT_COLOR_FALLBACKS.speed),
    carry: v("--stat-carry", STAT_COLOR_FALLBACKS.carry),
    trainTimeSeconds: v("--stat-trn", STAT_COLOR_FALLBACKS.trainTimeSeconds),
    resourceCost: v("--stat-cost", STAT_COLOR_FALLBACKS.resourceCost),
  };
}

/** @deprecated use PROFILE_AXES */
export const STAT_AXES = PROFILE_AXES;
export const STAT_BAR_AXES = PROFILE_AXES;

/**
 * @param {Array<{ troops: Array<{ metrics: object }>, hero?: { metrics: object } }>} tribes
 * @param {string} [normalizeMode]
 * @returns {{ maxes: Record<string, number>, mins: Record<string, number>, axes: object[], normalizeMode: string }}
 */
export function computeGlobalScales(tribes, normalizeMode = "raw") {
  const axes = getProfileAxes(normalizeMode);
  const maxes = {};
  const mins = {};
  for (const ax of axes) {
    maxes[ax.key] = 1;
    mins[ax.key] = ax.higherBetter === false ? Infinity : 0;
  }

  const bump = (key, val, higherBetter) => {
    if (higherBetter === false) {
      if (val > 0 && val < (mins[key] ?? Infinity)) mins[key] = val;
      if (val > (maxes[key] || 0)) maxes[key] = val;
    } else if (val > (maxes[key] || 0)) {
      maxes[key] = val;
    }
  };

  const ingest = (metrics) => {
    const view = buildViewMetrics(metrics, normalizeMode);
    for (const ax of axes) {
      bump(ax.key, view[ax.key] ?? 0, ax.higherBetter);
    }
  };

  for (const tribe of tribes) {
    for (const t of tribe.troops) ingest(t.metrics);
    if (tribe.hero?.metrics) ingest(tribe.hero.metrics);
  }

  for (const ax of axes) {
    if (ax.higherBetter === false && !Number.isFinite(mins[ax.key])) {
      mins[ax.key] = 1;
    }
  }

  return { maxes, mins, axes, normalizeMode };
}

/** @deprecated use computeGlobalScales */
export function computeGlobalMaxes(tribes) {
  return computeGlobalScales(tribes);
}

/**
 * @param {string} key
 * @param {number} raw
 * @param {{ maxes: Record<string, number>, mins: Record<string, number> }} scales
 */
export function statBarPercent(key, raw, scales) {
  const ax = (scales.axes || PROFILE_AXES).find((a) => a.key === key);
  const max = scales.maxes[key] || 1;
  const val = raw ?? 0;

  if (ax?.higherBetter === false) {
    const min = scales.mins[key] || 1;
    if (val <= 0) return 0;
    return Math.min(100, Math.round((min / val) * 100));
  }

  return Math.min(100, Math.round((val / max) * 100));
}

/** Bar width for display — tiny non-zero values stay visible without faking large shares. */
export function statBarVisualPercent(key, raw, scales) {
  const pct = statBarPercent(key, raw, scales);
  const val = raw ?? 0;
  if (val <= 0) return 0;
  if (pct >= 18) return pct;
  return Math.max(pct, 10 + Math.round(pct * 0.35));
}

/**
 * @param {object} metrics
 * @param {{ maxes: Record<string, number>, mins: Record<string, number> }} scales
 */
export function metricsToRadar(metrics, scales) {
  const axes = scales.axes || PROFILE_AXES;
  return axes.map((ax) => statBarPercent(ax.key, metrics[ax.key] ?? 0, scales));
}

export function overallRating(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * @param {string} key
 * @param {number} raw
 */
/** @param {number | null | undefined} seconds */
export function formatTrainingTime(seconds) {
  if (seconds == null || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

export function formatStatValue(key, raw, metrics = {}, opts = {}) {
  return formatViewStatValue(key, raw, metrics, opts);
}

function barHint(key, display, scales) {
  const ax = (scales?.axes || PROFILE_AXES).find((a) => a.key === key);
  return `${ax?.name || key}: ${display}`;
}

/**
 * Tile grid of stats with value + bar (replaces circular radar in UI).
 * @param {HTMLElement} container
 * @param {object} metrics
 * @param {{ maxes: Record<string, number>, mins: Record<string, number> }} scales
 * @param {{ primary?: string }} palette
 * @param {{ compact?: boolean, axes?: object[] }} [opts]
 */
export function mountStatGrid(container, metrics, scales, palette, opts = {}) {
  const catalog = opts.axes || scales.axes || PROFILE_AXES;
  const axisColors = getStatAxisColors();
  const fallback = resolveBarColors(palette, palette ? "tribe" : "chart").primary;

  container.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "stat-grid" + (opts.compact ? " stat-grid--compact" : "");

  for (const ax of catalog) {
    const raw = metrics[ax.key] ?? 0;
    const visualPct = statBarVisualPercent(ax.key, raw, scales);
    const display = formatStatValue(ax.key, raw, metrics);
    const color = axisColors[ax.key] || fallback;

    const tile = document.createElement("div");
    tile.className = `stat-grid-tile stat-grid-tile--${ax.key}`;
    tile.innerHTML = `
      <span class="stat-grid-label">${opts.compact ? ax.label : ax.name}</span>
      <strong class="stat-grid-value">${display}</strong>
      <div class="stat-bar-track"><div class="stat-bar-fill"></div></div>
    `;
    const fill = tile.querySelector(".stat-bar-fill");
    fill.style.width = `${visualPct}%`;
    fill.style.setProperty("--stat-bar-color", color);
    fill.title = barHint(ax.key, display, scales);
    grid.append(tile);
  }

  container.append(grid);
  return grid;
}

export function mountStatAxisLegend(container, scales) {
  const axisColors = getStatAxisColors();
  const axes = scales?.axes || PROFILE_AXES;
  container.innerHTML = "";
  const legend = document.createElement("div");
  legend.className = "stat-axis-legend";
  legend.setAttribute("role", "list");
  legend.setAttribute("aria-label", "Stat axis colors");
  for (const ax of axes) {
    const item = document.createElement("span");
    item.className = "stat-axis-legend-item";
    item.setAttribute("role", "listitem");
    item.innerHTML = `<span class="stat-axis-legend-swatch" style="background:${axisColors[ax.key]}" aria-hidden="true"></span><span>${ax.name}</span>`;
    item.title = ax.name;
    legend.append(item);
  }
  container.append(legend);
  return legend;
}

/**
 * Side-by-side stat bars for two tribes on the same axes.
 * @param {HTMLElement} container
 * @param {object} metricsA
 * @param {object} metricsB
 * @param {{ maxes: Record<string, number>, mins: Record<string, number> }} scales
 * @param {{ primary?: string }} paletteA
 * @param {{ primary?: string }} paletteB
 * @param {{ a?: string, b?: string }} [labels]
 */
export function mountDualStatBars(container, metricsA, metricsB, scales, paletteA, paletteB, labels = {}) {
  const axisColors = getStatAxisColors();
  const colorA = paletteA?.primary || resolveBarColors(paletteA, "chart").primary;
  const colorB = paletteB?.primary || resolveBarColors(paletteB, "chart").primary;
  const nameA = labels.a || "Tribe A";
  const nameB = labels.b || "Tribe B";
  const axes = scales.axes || PROFILE_AXES;

  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "stat-bars stat-bars--dual";

  for (const ax of axes) {
    const rawA = metricsA[ax.key] ?? 0;
    const rawB = metricsB[ax.key] ?? 0;
    const pctA = statBarPercent(ax.key, rawA, scales);
    const pctB = statBarPercent(ax.key, rawB, scales);
    const visA = statBarVisualPercent(ax.key, rawA, scales);
    const visB = statBarVisualPercent(ax.key, rawB, scales);
    const axisColor = axisColors[ax.key] || colorA;
    const winner = pctA > pctB ? "a" : pctB > pctA ? "b" : "tie";

    const row = document.createElement("div");
    row.className = `stat-bar-dual-row stat-bar-dual-row--${ax.key}`;
    row.innerHTML = `
      <div class="stat-bar-dual-head">
        <span class="stat-bar-dual-axis">
          <span class="stat-bar-swatch" aria-hidden="true"></span>
          ${ax.name}
        </span>
      </div>
      <div class="stat-bar-dual-pair">
        <div class="stat-bar-dual-side${winner === "a" ? " stat-bar-dual-side--best" : ""}">
          <span class="stat-bar-dual-name" style="color:${colorA}">${nameA}</span>
          <div class="stat-bar-track"><div class="stat-bar-fill"></div></div>
          <span class="stat-bar-dual-meta">
            <strong>${formatStatValue(ax.key, rawA, metricsA)}</strong>
          </span>
        </div>
        <div class="stat-bar-dual-side${winner === "b" ? " stat-bar-dual-side--best" : ""}">
          <span class="stat-bar-dual-name" style="color:${colorB}">${nameB}</span>
          <div class="stat-bar-track"><div class="stat-bar-fill"></div></div>
          <span class="stat-bar-dual-meta">
            <strong>${formatStatValue(ax.key, rawB, metricsB)}</strong>
          </span>
        </div>
      </div>
    `;

    const swatch = row.querySelector(".stat-bar-swatch");
    swatch.style.background = axisColor;

    const fills = row.querySelectorAll(".stat-bar-fill");
    fills[0].style.width = `${visA}%`;
    fills[0].style.setProperty("--stat-bar-color", colorA);
    fills[1].style.width = `${visB}%`;
    fills[1].style.setProperty("--stat-bar-color", colorB);

    wrap.append(row);
  }

  container.append(wrap);
  return wrap;
}

/**
 * Horizontal OVR leaderboard for multi-tribe compare.
 * @param {HTMLElement} container
 * @param {Array<{ name: string, color: string, metrics: object }>} entries
 * @param {{ maxes: Record<string, number>, mins: Record<string, number> }} scales
 */
export function mountTribeOvrLeaderboard(container, entries, scales) {
  container.innerHTML = "";
  const ranked = entries
    .map((e) => ({
      ...e,
      ovr: overallRating(metricsToRadar(e.metrics, scales)),
    }))
    .sort((a, b) => b.ovr - a.ovr);
  const maxOvr = Math.max(1, ...ranked.map((e) => e.ovr));

  const wrap = document.createElement("div");
  wrap.className = "tribe-ovr-leaderboard";

  ranked.forEach((entry, i) => {
    const pct = Math.round((entry.ovr / maxOvr) * 100);
    const row = document.createElement("div");
    row.className = "tribe-ovr-row" + (i === 0 ? " tribe-ovr-row--lead" : "");
    row.innerHTML = `
      <span class="tribe-ovr-rank">${i + 1}</span>
      <span class="tribe-ovr-dot" style="background:${entry.color}"></span>
      <span class="tribe-ovr-name">${entry.name}</span>
      <div class="tribe-ovr-track"><div class="tribe-ovr-fill"></div></div>
      <span class="tribe-ovr-score">${entry.ovr}</span>
    `;
    row.querySelector(".tribe-ovr-fill").style.width = `${pct}%`;
    row.querySelector(".tribe-ovr-fill").style.background = entry.color;
    wrap.append(row);
  });

  container.append(wrap);
  return wrap;
}

/** Keys shown as raw game numbers in stat graph panels. */
export const DISPLAY_STATS = [
  { label: "Attack", key: "offense" },
  { label: "Def vs inf", key: "defenseInfantry" },
  { label: "Def vs cav", key: "defenseCavalry" },
  { label: "Speed", key: "speed" },
  { label: "Carry", key: "carry" },
  { label: "Upkeep", key: "cropUpkeep" },
  { label: "Train time", key: "trainTimeSeconds", useFormatted: true },
  { label: "Total cost", key: "resourceCost", useCost: true },
];

/**
 * Prominent grid of actual game stat values (not relative %).
 * @param {HTMLElement} container
 * @param {object} metrics
 * @param {{ compact?: boolean }} [opts]
 */
export function mountRawStatsGrid(container, metrics, opts = {}) {
  container.innerHTML = "";
  const grid = document.createElement("dl");
  grid.className = "raw-stats-grid" + (opts.compact ? " raw-stats-grid--compact" : "");

  for (const stat of DISPLAY_STATS) {
    if (metrics[stat.key] == null && !stat.useFormatted && !stat.useCost) continue;
    let value;
    if (stat.useFormatted) {
      value = metrics.trainTimeFormatted || formatTrainingTime(metrics.trainTimeSeconds) || "—";
    } else if (stat.useCost) {
      const n = metrics.resourceCost ?? metrics.totalCost ?? 0;
      value = n > 0 ? n.toLocaleString() : "0";
    } else {
      value = String(metrics[stat.key] ?? 0);
    }
    const item = document.createElement("div");
    item.className = "raw-stats-item";
    item.innerHTML = `<dt>${stat.label}</dt><dd>${value}</dd>`;
    grid.append(item);
  }

  container.append(grid);
  return grid;
}

/**
 * Inline key combat numbers for compact cards.
 * @param {object} metrics
 */
export function formatKeyStatsLine(metrics) {
  const atk = metrics.offense ?? 0;
  const def = metrics.defenseCombined ?? 0;
  const spd = metrics.speed ?? 0;
  const cost = metrics.resourceCost ?? metrics.totalCost ?? 0;
  const train =
    metrics.trainTimeFormatted ||
    formatTrainingTime(metrics.trainTimeSeconds) ||
    "—";
  return { atk, def, spd, cost, train };
}

/**
 * @param {HTMLElement} container
 * @param {object} metrics
 * @param {{ maxes: Record<string, number>, mins: Record<string, number> }} scales
 * @param {{ primary?: string, secondary?: string }} palette
 * @param {{ compact?: boolean, keys?: string[] }} [opts]
 */
export function mountStatBars(container, metrics, scales, palette, opts = {}) {
  const catalog = opts.axes || scales.axes || PROFILE_AXES;
  const keys = opts.keys || catalog.map((a) => a.key);
  const axes = catalog.filter((a) => keys.includes(a.key));
  const axisColors = getStatAxisColors();
  const bar = resolveBarColors(palette, palette ? "tribe" : "chart");
  const fallback = bar.primary;

  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "stat-bars" + (opts.compact ? " stat-bars--compact" : "");

  for (const ax of axes) {
    const raw = metrics[ax.key] ?? 0;
    const pct = statBarPercent(ax.key, raw, scales);
    const visualPct = statBarVisualPercent(ax.key, raw, scales);
    const display = formatStatValue(ax.key, raw, metrics);
    const color = axisColors[ax.key] || fallback;
    const row = document.createElement("div");
    row.className = `stat-bar-row stat-bar-row--${ax.key}`;
    row.innerHTML = `
      <div class="stat-bar-label">
        <span class="stat-bar-name" title="${ax.name}">
          <span class="stat-bar-swatch" aria-hidden="true"></span>
          ${opts.compact ? ax.label : ax.name}
        </span>
        <span class="stat-bar-meta">
          <strong class="stat-bar-value">${display}</strong>
        </span>
      </div>
      <div class="stat-bar-track" role="presentation">
        <div class="stat-bar-fill" style="width:0%"></div>
      </div>
    `;
    const fill = row.querySelector(".stat-bar-fill");
    const swatch = row.querySelector(".stat-bar-swatch");
    fill.style.width = `${visualPct}%`;
    fill.style.setProperty("--stat-bar-color", color);
    swatch.style.background = color;
    fill.title = barHint(ax.key, display, scales);
    wrap.append(row);
  }

  container.append(wrap);
  return wrap;
}

function polar(cx, cy, r, angle) {
  return {
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle),
  };
}

/**
 * @param {number} cx @param {number} cy
 * @param {number} radius pixel radius of the 100 ring
 * @param {number[]} values 0–100 per axis
 */
function polygonPoints(cx, cy, radius, values) {
  const n = values.length;
  const step = (Math.PI * 2) / n;
  const start = -Math.PI / 2;
  return values
    .map((v, i) => {
      const r = (v / 100) * radius;
      const p = polar(cx, cy, r, start + i * step);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Several tribes' shapes on one radar.
 *
 * Deliberately flat. The single-entity radar this replaces gave its one shape
 * gradients, a glow and a lit orb behind it, which reads well alone and turns
 * to mud the moment a fourth polygon lands on top. Here there is nothing but
 * outlines in the tribe colours over a shared grid, so what you see is the
 * difference in shape rather than a pile of translucency, and the fill fades
 * further as tribes are added.
 *
 * @param {SVGSVGElement} svg
 * @param {{
 *   axes: Array<{ key: string, label: string, name: string }>,
 *   series: Array<{ name: string, color: string, values: number[], unitName?: string }>,
 *   size?: number,
 * }} opts
 */
export function drawMultiRadar(svg, opts) {
  const axes = opts.axes || PROFILE_AXES;
  const series = opts.series || [];
  const n = axes.length;
  const size = opts.size ?? 250;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.33;
  const step = (Math.PI * 2) / n;
  const start = -Math.PI / 2;
  const chrome = getRadarChromeColors();
  const fillOpacity = series.length <= 2 ? 0.2 : series.length <= 4 ? 0.12 : 0.07;

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.classList.add("radar-svg", "radar-svg-multi");

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  bg.setAttribute("cx", String(cx));
  bg.setAttribute("cy", String(cy));
  bg.setAttribute("r", String(maxR + 4));
  bg.setAttribute("fill", chrome.radarBg);
  bg.setAttribute("stroke", chrome.grid);
  svg.append(bg);

  for (const ring of [25, 50, 75, 100]) {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", polygonPoints(cx, cy, maxR, Array(n).fill(ring)));
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", chrome.grid);
    poly.setAttribute("stroke-width", ring === 100 ? "1.5" : "1");
    svg.append(poly);
  }

  for (let i = 0; i < n; i++) {
    const end = polar(cx, cy, maxR, start + i * step);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(cx));
    line.setAttribute("y1", String(cy));
    line.setAttribute("x2", String(end.x));
    line.setAttribute("y2", String(end.y));
    line.setAttribute("stroke", chrome.axis);
    svg.append(line);
  }

  for (const s of series) {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", polygonPoints(cx, cy, maxR, s.values));
    poly.setAttribute("fill", s.color);
    poly.setAttribute("fill-opacity", String(fillOpacity));
    poly.setAttribute("stroke", s.color);
    poly.setAttribute("stroke-width", "2.5");
    poly.setAttribute("stroke-linejoin", "round");
    const tip = document.createElementNS("http://www.w3.org/2000/svg", "title");
    tip.textContent = `${s.name}${s.unitName ? ` — ${s.unitName}` : ""}`;
    poly.append(tip);
    svg.append(poly);

    s.values.forEach((v, i) => {
      const p = polar(cx, cy, (v / 100) * maxR, start + i * step);
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", String(p.x));
      dot.setAttribute("cy", String(p.y));
      dot.setAttribute("r", "3");
      dot.setAttribute("fill", s.color);
      svg.append(dot);
    });
  }

  const axisColors = getStatAxisColors();
  axes.forEach((ax, i) => {
    const p = polar(cx, cy, maxR + 20, start + i * step);
    const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lbl.setAttribute("x", String(p.x));
    lbl.setAttribute("y", String(p.y + 4));
    lbl.setAttribute("text-anchor", "middle");
    lbl.setAttribute("fill", axisColors[ax.key] || chrome.label);
    lbl.setAttribute("font-size", "11");
    lbl.setAttribute("font-weight", "700");
    lbl.setAttribute("font-family", "DM Sans, system-ui, sans-serif");
    lbl.setAttribute("stroke", chrome.radarBg);
    lbl.setAttribute("stroke-width", "4");
    lbl.setAttribute("paint-order", "stroke fill");
    lbl.textContent = ax.label;
    const tip = document.createElementNS("http://www.w3.org/2000/svg", "title");
    tip.textContent = ax.name;
    lbl.append(tip);
    svg.append(lbl);
  });
}

/**
 * @param {HTMLElement} container
 * @param {object} entity - troop or hero with metrics, name, slot, role
 * @param {Record<string, number>} maxes
 * @param {object} palette
 * @param {{ compareMetrics?: object, size?: number }} opts
 */
export function mountRadarCard(container, entity, scales, palette, opts = {}) {
  container.innerHTML = "";
  const mode = opts.displayMode || "profile";
  const colors = resolveBarColors(palette, "chart");
  const colorPalette = { primary: colors.primary, secondary: colors.secondary };
  const viewMetrics = buildViewMetrics(entity.metrics, scales.normalizeMode || "raw");

  const card = document.createElement("article");
  card.className = "unit-stat-card" + (opts.active ? " active" : "");
  card.dataset.statDisplay = mode;

  const head = document.createElement("div");
  head.className = "unit-stat-card-head";
  const logoSlot = document.createElement("div");
  logoSlot.className = "unit-stat-logo";
  const portrait = document.createElement("div");
  mountPortrait(portrait, portraitOptsFromUnit(entity, palette, { size: "sm" }));
  logoSlot.append(portrait);
  const title = document.createElement("div");
  title.className = "unit-stat-card-title";
  title.innerHTML = `
    <span class="unit-stat-slot">${entity.slot ?? "★"}</span>
    <h4 class="unit-stat-name">${entity.name}</h4>
    <span class="role-badge">${entity.role || "hero"}</span>
  `;
  head.append(logoSlot, title);
  card.append(head);

  const m = entity.metrics;
  const keyLine = document.createElement("div");
  keyLine.className = "unit-stat-keyline";
  keyLine.innerHTML = `
    <span title="Attack"><b>${m.offense ?? 0}</b> ATK</span>
    <span title="Def vs infantry"><b>${m.defenseInfantry ?? 0}</b> DEF-I</span>
    <span title="Def vs cavalry"><b>${m.defenseCavalry ?? 0}</b> DEF-C</span>
    <span title="Speed"><b>${m.speed ?? 0}</b> SPD</span>
    <span title="Carry"><b>${m.carry ?? 0}</b> CRR</span>
  `;
  card.append(keyLine);

  if (mode === "grid") {
    const grid = document.createElement("div");
    grid.className = "unit-stat-card-grid";
    mountStatGrid(grid, viewMetrics, scales, colorPalette, { compact: true });
    card.append(grid);
  }

  if (mode === "bars") {
    const bars = document.createElement("div");
    bars.className = "unit-stat-card-bars";
    mountStatBars(bars, viewMetrics, scales, colorPalette, {
      compact: true,
      keys: opts.keys || (scales.axes || PROFILE_AXES).map((a) => a.key),
    });
    card.append(bars);
  }

  container.append(card);
  return card;
}
