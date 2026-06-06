/** @typedef {import('../lib/merge.js').resolveTroops} Troop */

import {
  buildViewMetrics,
  chartMetricLabel,
  chartMetricValue,
  formatNormalizedNumber,
  getNormalizeMode,
  NORMALIZE_MODES,
  normalizeModeHint,
} from "./metrics-normalize.js";
import {
  computeGlobalScales,
  mountRadarCard,
  mountRawStatsGrid,
  mountStatAxisLegend,
  mountStatBars,
  mountStatGrid,
  formatTrainingTime,
} from "./radar.js";
import {
  CHART_LAYOUTS,
  CHART_METRICS,
  computeChartWidth,
  drawCompareMetricChart,
  drawMultiCostStackChart,
} from "./charts.js";
import { renderTribeBanner, renderUnitCard } from "./graphics.js";
import {
  getCompareSeriesColors,
  initUiTheme,
  mountGraphPalettePicker,
  mountThemePicker,
  resolveBarColors,
} from "./themes.js";

let data = null;
let globalScales = null;
let activeTribeId = null;
let sortKey = "slot";
let sortDir = 1;
let compareMode = false;
let activeView = "table";
let compareViewMode = "table";
let compareChartMetric = "offense";
let compareChartLayout = "bars";
let statDisplayMode = "bars";
let statNormalizeMode = "crop";
let compareTribeIds = [];
let selectedTroopIndex = 0;
let compareChartMetricBound = false;
let compareChartLayoutBound = false;

function recomputeGlobalScales() {
  if (!data?.tribes) return;
  globalScales = computeGlobalScales(data.tribes, statNormalizeMode);
}

const COMPARE_MIN_TRIBES = 2;
const COMPARE_STORAGE_KEY = "tevel-compare-tribes";

const $ = (sel) => document.querySelector(sel);

async function loadData() {
  const errors = [];

  try {
    const res = await fetch(`data.json?ts=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      data = await res.json();
    } else {
      errors.push(`fetch data.json → HTTP ${res.status}`);
    }
  } catch (e) {
    errors.push(`fetch data.json → ${e.message}`);
  }

  if (!data?.tribes?.length) {
    try {
      const mod = await import("./generated-data.js");
      data = mod.default;
    } catch (e) {
      errors.push(`import generated-data.js → ${e.message}`);
    }
  }

  if (!data?.tribes?.length) {
    throw new Error(
      errors.length
        ? `Could not load tribe data (${errors.join("; ")}). Run: npm run build:data`
        : "No tribes in dashboard data. Run: npm run build:data"
    );
  }
}

function setAccent(hex) {
  document.documentElement.style.setProperty("--accent", hex || "#c9a227");
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

function tribeById(id) {
  if (!data?.tribes || !id) return undefined;
  return data.tribes.find((t) => t.id === id);
}

function renderNav() {
  const nav = $("#tribe-nav");
  if (!nav || !data?.tribes) return;
  nav.innerHTML = "";
  for (const tribe of data.tribes) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tribe-btn" + (tribe.id === activeTribeId ? " active" : "");
    btn.dataset.id = tribe.id;
    const dot = document.createElement("span");
    dot.className = "tribe-dot";
    dot.style.background = `linear-gradient(135deg, ${tribe.palette?.primary || "#666"}, ${tribe.palette?.secondary || "#999"})`;
    btn.append(dot, document.createTextNode(tribe.name));
    if (tribe.type === "npc") {
      const tag = document.createElement("small");
      tag.textContent = "npc";
      btn.append(tag);
    }
    btn.addEventListener("click", () => selectTribe(tribe.id));
    nav.append(btn);
  }
}

function renderPalette(palette) {
  const wrap = $("#palette-swatch");
  wrap.innerHTML = "";
  if (!palette) return;
  for (const [key, hex] of Object.entries(palette)) {
    if (key === "notes" || !hex.startsWith?.("#")) continue;
    const s = document.createElement("div");
    s.className = "swatch";
    s.style.background = hex;
    s.title = `${key}: ${hex}`;
    const label = document.createElement("span");
    label.textContent = hex;
    s.append(label);
    wrap.append(s);
  }
}

function bar(value, max) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return `<div class="bar-cell"><div class="bar" style="width:80px"><div class="bar-fill" style="width:${pct}%"></div></div><span>${value}</span></div>`;
}

function renderSummary(tribe) {
  const s = tribe.summary;
  const cards = [
    ["Max attack", s.maxAttack],
    ["Max def vs inf", s.maxDefenseInfantry],
    ["Max def vs cav", s.maxDefenseCavalry],
    ["Avg attack", s.avgAttack],
    ["Avg def (avg)", s.avgDefenseCombined],
    ["Max speed", s.maxSpeed],
    ["Max carry", s.maxCarry],
    ["Total upkeep", s.totalCropUpkeep],
  ];
  $("#summary-grid").innerHTML = cards
    .map(
      ([label, val]) =>
        `<article class="stat-card"><label>${label}</label><strong>${val}</strong></article>`
    )
    .join("");
}

function getTroopRows(tribe) {
  const filter = ($("#unit-filter")?.value || "").toLowerCase();
  let rows = [...tribe.troops];
  if (filter) {
    rows = rows.filter(
      (t) =>
        t.name.toLowerCase().includes(filter) ||
        t.role.toLowerCase().includes(filter)
    );
  }
  rows.sort((a, b) => {
    let av, bv;
    if (sortKey === "name") {
      av = a.name;
      bv = b.name;
    } else if (sortKey === "role") {
      av = a.role;
      bv = b.role;
    } else if (sortKey === "totalCost") {
      av = a.totalCost;
      bv = b.totalCost;
    } else if (sortKey.startsWith("cost.")) {
      const k = sortKey.slice(5);
      av = a.cost?.[k] ?? 0;
      bv = b.cost?.[k] ?? 0;
    } else if (sortKey === "timeSeconds") {
      av = a.training?.timeSeconds ?? 0;
      bv = b.training?.timeSeconds ?? 0;
    } else if (sortKey === "building") {
      av = a.training?.buildingLabel ?? "";
      bv = b.training?.buildingLabel ?? "";
    } else if (sortKey in (a.metrics || {})) {
      av = a.metrics[sortKey];
      bv = b.metrics[sortKey];
    } else {
      av = a[sortKey];
      bv = b[sortKey];
    }
    if (av < bv) return -sortDir;
    if (av > bv) return sortDir;
    return 0;
  });
  return rows;
}

function renderTroops(tribe) {
  const maxAtk = tribe.summary.maxAttack || 1;
  const rows = getTroopRows(tribe);
  const tbody = $("#troop-tbody");
  tbody.innerHTML = rows
    .map((t) => {
      const m = t.metrics;
      const idx = tribe.troops.indexOf(t);
      return `<tr data-troop-index="${idx}" class="troop-row">
        <td>${t.slot}</td>
        <td><strong>${t.name}</strong></td>
        <td><span class="role-badge">${t.role}</span></td>
        <td class="num">${bar(m.offense, maxAtk)}</td>
        <td class="num">${m.defenseInfantry}</td>
        <td class="num">${m.defenseCavalry}</td>
        <td class="num">${m.defenseCombined}</td>
        <td class="num">${m.speed}</td>
        <td class="num">${m.carry}</td>
        <td class="num">${m.cropUpkeep}</td>
        <td class="num">${t.cost.wood ?? 0}</td>
        <td class="num">${t.cost.clay ?? 0}</td>
        <td class="num">${t.cost.iron ?? 0}</td>
        <td class="num">${t.cost.crop ?? 0}</td>
        <td class="num">${t.totalCost.toLocaleString()}</td>
        <td class="num">${t.training?.timeFormatted ?? "—"}</td>
        <td>${t.training?.buildingLabel ?? "—"}</td>
      </tr>`;
    })
    .join("");

  tbody.querySelectorAll(".troop-row").forEach((row) => {
    row.addEventListener("click", () => {
      selectedTroopIndex = Number(row.dataset.troopIndex);
      if (activeView === "radar") renderRadarView(tribe);
      else setView("radar");
    });
  });
}

function normalizeStatDisplayMode(mode) {
  if (mode === "profile" || mode === "shape") return mode === "shape" ? "grid" : "bars";
  return mode === "grid" ? "grid" : "bars";
}

function renderFeatureRadar(container, entity, palette, opts = {}) {
  container.innerHTML = "";
  const mode = normalizeStatDisplayMode(opts.displayMode ?? statDisplayMode);
  const colors = resolveBarColors(palette, "chart");
  const colorPalette = { primary: colors.primary, secondary: colors.secondary };
  const viewMetrics = buildViewMetrics(entity.metrics, globalScales?.normalizeMode || statNormalizeMode);
  const norm = getNormalizeMode(globalScales?.normalizeMode || statNormalizeMode);

  const wrap = document.createElement("div");
  wrap.className = "stat-profile" + (opts.featured ? " stat-profile--featured" : "");
  wrap.dataset.statDisplay = mode;

  const head = document.createElement("header");
  head.className = "stat-profile-head";
  head.innerHTML = `
    <div class="stat-profile-title">
      <h4>${entity.name}</h4>
      ${opts.subtitle ? `<p class="stat-profile-subtitle">${opts.subtitle}</p>` : ""}
      ${norm.id !== "raw" ? `<p class="stat-profile-subtitle muted">${norm.label}: ${norm.description}</p>` : ""}
    </div>
  `;
  wrap.append(head);

  const keynums = document.createElement("div");
  keynums.className = "stat-profile-keynums";
  const m = entity.metrics;
  keynums.innerHTML = `
    <span><b>${m.offense ?? 0}</b> ATK</span>
    <span><b>${m.defenseInfantry ?? 0}</b> DEF-I</span>
    <span><b>${m.defenseCavalry ?? 0}</b> DEF-C</span>
    <span><b>${m.speed ?? 0}</b> SPD</span>
    <span><b>${m.carry ?? 0}</b> CRR</span>
    <span><b>${m.cropUpkeep ?? 0}</b> crop/h</span>
    <span><b>${m.trainTimeFormatted || formatTrainingTime(m.trainTimeSeconds) || "—"}</b> train</span>
    <span><b>${(m.resourceCost ?? m.totalCost ?? 0).toLocaleString()}</b> cost</span>
  `;
  wrap.append(keynums);

  if (!opts.hideRawGrid && norm.id === "raw") {
    const rawGrid = document.createElement("div");
    rawGrid.className = "stat-profile-raw";
    mountRawStatsGrid(rawGrid, entity.metrics, { compact: !opts.featured });
    wrap.append(rawGrid);
  }

  const body = document.createElement("div");
  body.className = "stat-profile-body stat-profile-body--" + mode;

  if (mode === "grid") {
    const grid = document.createElement("div");
    grid.className = "stat-profile-grid";
    mountStatGrid(grid, viewMetrics, globalScales, colorPalette);
    body.append(grid);
  } else {
    const bars = document.createElement("div");
    bars.className = "stat-profile-bars";
    mountStatBars(bars, viewMetrics, globalScales, colorPalette);
    body.append(bars);
  }

  wrap.append(body);

  if (!opts.hideLegend) {
    const axisLegend = document.createElement("div");
    axisLegend.className = "stat-profile-axis-legend";
    mountStatAxisLegend(axisLegend, globalScales);
    wrap.append(axisLegend);
  }

  container.append(wrap);
}

function renderRadarView(tribe) {
  if (!tribe || !globalScales) return;
  const troops = tribe.troops;
  if (selectedTroopIndex >= troops.length) selectedTroopIndex = 0;

  const unit = troops[selectedTroopIndex];
  renderFeatureRadar($("#radar-feature"), unit, tribe.palette, {
    size: 360,
    featured: true,
    subtitle: `${unit.role} · slot ${unit.slot}`,
  });

  const heroWrap = $("#radar-hero-wrap");
  if (tribe.hero) {
    heroWrap.classList.remove("hidden");
    renderFeatureRadar($("#radar-hero"), tribe.hero, tribe.palette, { size: 200 });
  } else {
    heroWrap.classList.add("hidden");
  }

  const grid = $("#radar-grid");
  grid.innerHTML = "";
  troops.forEach((t, i) => {
    const slot = document.createElement("div");
    mountRadarCard(slot, t, globalScales, tribe.palette, {
      mini: true,
      size: 120,
      active: i === selectedTroopIndex,
      displayMode: statDisplayMode,
    });
    slot.querySelector(".unit-stat-card")?.addEventListener("click", () => {
      selectedTroopIndex = i;
      renderRadarView(tribe);
    });
    grid.append(slot);
  });
}

function setView(view) {
  activeView = view;
  document.querySelectorAll(".view-tab[data-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  $("#panel-table").classList.toggle("hidden", view !== "table");
  $("#panel-radar").classList.toggle("hidden", view !== "radar");
  const tribe = tribeById(activeTribeId);
  if (view === "radar" && tribe) renderRadarView(tribe);
}

function renderHero(tribe) {
  const h = tribe.hero;
  const panel = $("#hero-panel");
  if (!h) {
    panel.classList.add("hidden");
    return;
  }
  panel.classList.remove("hidden");
  const m = h.metrics;
  const mod = data.heroSystem.tribeModifiers[tribe.id] || {};
  $("#hero-content").innerHTML = `
    <article class="stat-card"><label>Name</label><strong>${h.name}</strong></article>
    <article class="stat-card"><label>Attack</label><strong>${m.offense}</strong></article>
    <article class="stat-card"><label>Def vs Inf</label><strong>${m.defenseInfantry}</strong></article>
    <article class="stat-card"><label>Def vs Cav</label><strong>${m.defenseCavalry}</strong></article>
    <article class="stat-card"><label>Speed</label><strong>${m.speed}</strong></article>
    <article class="stat-card"><label>Fighting str. / pt</label><strong>${mod.fightingStrengthPerPoint ?? "—"}</strong></article>
    <article class="stat-card"><label>Progression</label><strong>Lv ${data.heroSystem.maxLevel}</strong></article>
    <article class="stat-card"><label>Train cost</label><strong>W${h.cost?.wood ?? 0} C${h.cost?.clay ?? 0} I${h.cost?.iron ?? 0} Cr${h.cost?.crop ?? 0}</strong></article>
    <article class="stat-card"><label>Training</label><strong>${h.training?.timeFormatted ?? "—"} · ${h.training?.buildingLabel ?? "—"}</strong></article>
  `;
}

function selectTribe(id) {
  activeTribeId = id;
  selectedTroopIndex = 0;
  compareMode = false;
  $("#view-single").classList.remove("hidden");
  $("#view-compare").classList.add("hidden");
  $("#btn-compare").textContent = "Compare tribes";
  $("#topbar .view-tabs")?.classList.remove("hidden");

  const tribe = tribeById(id);
  if (!tribe) return;

  setAccent(tribe.palette?.primary);
  $("#tribe-name").textContent = tribe.name;
  $("#tribe-theme").textContent = tribe.theme || "";
  renderPalette(tribe.palette);
  renderSummary(tribe);
  renderTroops(tribe);
  renderHero(tribe);
  if (activeView === "radar") renderRadarView(tribe);
  renderNav();
}

function shortUnitName(name, max = 16) {
  const s = String(name || "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function getCompareTribes() {
  return compareTribeIds.map((id) => tribeById(id)).filter(Boolean);
}

function setCompareColumnCount(n) {
  const cols = Math.max(n, 2);
  document.documentElement.style.setProperty("--compare-cols", String(cols));
  const minCol = cols <= 3 ? 220 : cols <= 5 ? 180 : cols <= 6 ? 160 : 148;
  document.documentElement.style.setProperty("--compare-col-min", `${minCol}px`);
}

function formatSlotUnitNames(tribes, slotIndex) {
  const names = tribes.map((t) => t.troops[slotIndex]?.name).filter(Boolean);
  if (tribes.length <= 3) return names.join(" · ");
  const unique = [...new Set(names)];
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return unique.join(" · ");
  return `${unique.length} unit names across tribes`;
}

function formatCompareTribeList(tribes) {
  if (tribes.length <= 4) return tribes.map((t) => t.name).join(" · ");
  return `${tribes.length} tribes`;
}

function persistCompareSelection() {
  try {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareTribeIds));
  } catch {
    /* ignore */
  }
}

function loadPersistedCompareSelection() {
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return null;
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return null;
    const valid = ids.filter((id) => data.tribes.some((t) => t.id === id));
    return valid.length >= COMPARE_MIN_TRIBES ? valid : null;
  } catch {
    return null;
  }
}

function defaultCompareSelection() {
  const first = activeTribeId || data.tribes[0]?.id;
  const rest = data.tribes.map((t) => t.id).filter((id) => id !== first);
  return [first, rest[0]].filter(Boolean);
}

function compareSlotChartLabels(tribes) {
  const ref = tribes[0];
  return data.roster.map((slot, i) => ({
    main: ref.troops[i]?.name || slot.role,
  }));
}

function chartTroopName(tribes, slotIndex) {
  return tribes[0]?.troops[slotIndex]?.name || data.roster[slotIndex]?.role || "—";
}

function buildCompareChartSeries(tribes, metric, colors, normalizeMode) {
  return tribes.map((tribe, i) => ({
    name: tribe.name,
    color: colors[i],
    values: tribe.troops.map((t) => chartMetricValue(t, metric.key, normalizeMode)),
  }));
}

function renderCompareTribePicker() {
  const host = $("#compare-tribe-picker");
  if (!host) return;

  host.innerHTML = "";
  const actions = document.createElement("div");
  actions.className = "compare-picker-actions";
  actions.innerHTML = `
    <button type="button" class="btn ghost btn-sm" id="compare-select-all">All tribes</button>
    <button type="button" class="btn ghost btn-sm" id="compare-select-none" type="button">Clear</button>
  `;

  const list = document.createElement("div");
  list.className = "compare-tribe-checkboxes";
  list.setAttribute("role", "group");
  list.setAttribute("aria-label", "Select tribes to compare");

  for (const tribe of data.tribes) {
    const label = document.createElement("label");
    label.className = "compare-tribe-option";
    const checked = compareTribeIds.includes(tribe.id);
    label.innerHTML = `
      <input type="checkbox" value="${tribe.id}" ${checked ? "checked" : ""} />
      <span class="compare-tribe-dot" style="background:${tribe.palette?.primary || "#888"}"></span>
      <span class="compare-tribe-name">${tribe.name}</span>
    `;
    list.append(label);
  }

  host.append(actions, list);

  const onChange = (ev) => {
    const checked = [...list.querySelectorAll('input[type="checkbox"]:checked')].map(
      (el) => el.value
    );
    if (checked.length < COMPARE_MIN_TRIBES) {
      toast(`Select at least ${COMPARE_MIN_TRIBES} tribes`);
      if (ev?.target) ev.target.checked = true;
      return;
    }
    compareTribeIds = checked;
    persistCompareSelection();
    renderCompare();
  };

  list.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", onChange);
  });

  $("#compare-select-all")?.addEventListener("click", () => {
    compareTribeIds = data.tribes.map((t) => t.id);
    persistCompareSelection();
    renderCompareTribePicker();
    renderCompare();
  });

  $("#compare-select-none")?.addEventListener("click", () => {
    compareTribeIds = defaultCompareSelection();
    persistCompareSelection();
    renderCompareTribePicker();
    renderCompare();
  });
}

function renderCompareLegend(tribes) {
  const host = $("#compare-legend");
  if (!host) return;
  if (tribes.length < COMPARE_MIN_TRIBES) {
    host.classList.add("hidden");
    host.innerHTML = "";
    return;
  }
  host.classList.remove("hidden");
  const colors = getCompareSeriesColors(tribes.length, tribes);
  host.innerHTML = tribes
    .map(
      (t, i) =>
        `<span class="compare-legend-chip" style="--chip-color:${t.palette?.primary || colors[i]}">
          <span class="compare-legend-dot"></span>${t.name}
        </span>`
    )
    .join("");
}

function renderCompareSummary(tribes) {
  const host = $("#compare-summary");
  if (!host) return;
  if (tribes.length < COMPARE_MIN_TRIBES) {
    host.classList.add("hidden");
    host.innerHTML = "";
    return;
  }
  host.classList.remove("hidden");
  host.innerHTML = tribes
    .map((tribe) => {
      const s = tribe.summary;
      const color = tribe.palette?.primary || "var(--accent)";
      const bestAtkPerCrop = Math.max(
        0,
        ...tribe.troops
          .filter((t) => !["settler", "chief"].includes(t.role))
          .map((t) => (t.metrics.cropUpkeep > 0 ? t.metrics.offense / t.metrics.cropUpkeep : 0))
      );
      return `<article class="compare-summary-card" style="--tribe-col:${color}">
        <header class="compare-summary-head">
          <span class="compare-summary-dot"></span>
          <h4>${tribe.name}</h4>
        </header>
        <dl class="compare-summary-stats">
          <div><dt>Max ATK</dt><dd>${s.maxAttack}</dd></div>
          <div><dt>Best ATK/crop</dt><dd>${bestAtkPerCrop.toFixed(1)}</dd></div>
          <div><dt>Max carry</dt><dd>${s.maxCarry}</dd></div>
          <div><dt>Max SPD</dt><dd>${s.maxSpeed}</dd></div>
        </dl>
      </article>`;
    })
    .join("");
}

function renderCompareRadar() {
  const tribes = getCompareTribes();
  if (tribes.length < COMPARE_MIN_TRIBES || !globalScales) return;
  renderCompareRadarSlots(tribes);
}

function renderCompareRadarSlots(tribes) {
  const grid = $("#compare-radar-slots");
  if (!grid || !globalScales) return;
  grid.innerHTML = "";
  setCompareColumnCount(tribes.length);

  const hint = $("#compare-radar-hint");
  if (hint) {
    hint.textContent = normalizeModeHint(statNormalizeMode);
  }

  const header = document.createElement("article");
  header.className = "compare-radar-row compare-grid-header";
  const headerCells = tribes
    .map(
      (t) =>
        `<h4 class="compare-col-title" style="color:${t.palette?.primary || "inherit"}">${t.name}</h4>`
    )
    .join("");
  header.innerHTML = `<div class="compare-slot-label"><strong>Unit</strong></div>${headerCells}`;
  grid.append(header);

  data.roster.forEach((slot, i) => {
    const row = document.createElement("article");
    row.className = "compare-radar-row";

    const unitNames = formatSlotUnitNames(tribes, i);
    const label = document.createElement("div");
    label.className = "compare-slot-label";
    label.innerHTML = `
      <strong>Slot ${slot.slot}</strong>
      <span class="role-badge">${slot.role}</span>
      <p class="compare-slot-units muted">${unitNames}</p>
    `;
    row.append(label);

    tribes.forEach((tribe, ti) => {
      const col = document.createElement("div");
      const troop = tribe.troops[i];
      if (!troop) {
        col.className = "compare-radar-empty";
        col.textContent = "—";
        row.append(col);
        return;
      }
      const compareMetrics =
        tribes.length === 2 ? tribes[1 - ti].troops[i]?.metrics : undefined;
      mountRadarCard(col, troop, globalScales, tribe.palette, {
        mini: true,
        size: tribes.length <= 2 ? 140 : 120,
        displayMode: statDisplayMode,
        compareMetrics,
      });
      row.append(col);
    });

    grid.append(row);
  });
}

function renderCompareGraphics() {
  const tribes = getCompareTribes();
  if (tribes.length < COMPARE_MIN_TRIBES) return;

  const banners = $("#compare-banners");
  if (banners) {
    banners.innerHTML = "";
    setCompareColumnCount(tribes.length);
    tribes.forEach((tribe) => {
      const slot = document.createElement("div");
      renderTribeBanner(slot, tribe);
      banners.append(slot);
    });
  }

  const grid = $("#compare-graphics-grid");
  grid.innerHTML = "";

  const header = document.createElement("article");
  header.className = "compare-graphics-row compare-grid-header";
  const headerCells = tribes
    .map(
      (t) =>
        `<h4 class="compare-col-title" style="color:${t.palette?.primary || "inherit"}">${t.name}</h4>`
    )
    .join("");
  header.innerHTML = `<div class="compare-slot-label"><strong>Unit</strong></div>${headerCells}`;
  grid.append(header);

  data.roster.forEach((slot, i) => {
    const row = document.createElement("article");
    row.className = "compare-graphics-row";

    const unitNames = formatSlotUnitNames(tribes, i);
    const label = document.createElement("div");
    label.className = "compare-slot-label";
    label.innerHTML = `
      <strong>Slot ${slot.slot}</strong>
      <span class="role-badge">${slot.role}</span>
      <p class="compare-slot-units muted">${unitNames}</p>
    `;

    row.append(label);
    tribes.forEach((tribe) => {
      const col = document.createElement("div");
      renderUnitCard(col, tribe.troops[i], tribe.palette, globalScales);
      row.append(col);
    });
    grid.append(row);
  });
}

function renderCompareCharts() {
  const tribes = getCompareTribes();
  if (tribes.length < COMPARE_MIN_TRIBES) return;

  const metric =
    CHART_METRICS.find((m) => m.key === compareChartMetric) || CHART_METRICS[0];
  const metricLabel = chartMetricLabel(metric, statNormalizeMode);
  const slotLabels = compareSlotChartLabels(tribes);
  const troopLabels = slotLabels.map((l) => l.main);
  const containerW = $("#compare-charts-wrap")?.clientWidth || 720;
  const chartW = computeChartWidth(troopLabels, containerW);
  const colors = getCompareSeriesColors(tribes.length, tribes);
  const series = buildCompareChartSeries(tribes, metric, colors, statNormalizeMode);
  const names = formatCompareTribeList(tribes);

  const formatVal = (v, i, seriesIndex) => {
    const troop = tribes[seriesIndex]?.troops[i];
    if (metric.format && statNormalizeMode === "raw") return metric.format(v, troop);
    if (metric.key === "trainTimeSeconds" && statNormalizeMode === "time") {
      return formatNormalizedNumber(v, "time");
    }
    if (metric.combat && statNormalizeMode !== "raw") {
      return formatNormalizedNumber(v, statNormalizeMode);
    }
    if (metric.format) return metric.format(v, troop);
    return String(Math.round(v));
  };

  const main = $("#compare-chart-main");
  main.innerHTML = "";
  const cap = document.createElement("p");
  cap.className = "chart-caption muted";
  cap.textContent = `${metricLabel} by unit — ${names}. ${normalizeModeHint(statNormalizeMode)}`;
  main.append(cap);

  const chartH = Math.min(560, 380 + Math.max(0, tribes.length - 2) * 20);

  const svgMain = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  drawCompareMetricChart(svgMain, compareChartLayout, {
    labels: troopLabels,
    series,
    title: metricLabel,
    yAxisLabel: metricLabel,
    formatValue: formatVal,
    showBarValues: true,
    width: chartW,
    height: chartH,
  });
  main.append(svgMain);

  const costWrap = $("#compare-chart-cost");
  costWrap.innerHTML = "";
  const capCost = document.createElement("p");
  capCost.className = "chart-caption muted";
  capCost.textContent =
    "Training resources (wood / clay / iron / crop) — totals above each stack";
  costWrap.append(capCost);

  const svgCost = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  drawMultiCostStackChart(svgCost, {
    width: chartW,
    height: Math.min(480, 340 + tribes.length * 16),
    title: "Training resources (W / C / I / Cr)",
    series: tribes.map((t, i) => ({ name: t.name, color: colors[i] })),
    slots: data.roster.map((slot, i) => ({
      label: chartTroopName(tribes, i),
      costs: tribes.map((t) => t.troops[i].cost),
      totals: tribes.map((t) => t.troops[i].totalCost),
    })),
  });
  costWrap.append(svgCost);
}

function renderCompareTable(tribes) {
  const thead = $("#compare-thead");
  if (!thead) return;

  const tribeHeaders = tribes
    .map(
      (t, i) =>
        `<th class="compare-tribe-col" style="--tribe-col:${t.palette?.primary || "inherit"}">${t.name}</th>`
    )
    .join("");
  thead.innerHTML = `
    <tr>
      <th>Slot</th>
      <th>Role</th>
      ${tribeHeaders}
      <th class="num">Best ATK</th>
      <th class="num">Best DEF</th>
    </tr>
  `;

  const tbody = $("#compare-tbody");
  tbody.innerHTML = data.roster
    .map((slot, i) => {
      const cells = tribes
        .map((t) => {
          const u = t.troops[i];
          if (!u) return `<td class="muted">—</td>`;
          const atks = tribes.map((tr) => tr.troops[i]?.metrics.offense ?? 0);
          const defs = tribes.map((tr) => tr.troops[i]?.metrics.defenseCombined ?? 0);
          const bestAtk = Math.max(...atks);
          const bestDef = Math.max(...defs);
          const atkBest = u.metrics.offense === bestAtk && bestAtk > 0;
          const defBest = u.metrics.defenseCombined === bestDef && bestDef > 0;
          return `<td class="compare-tribe-cell ${atkBest || defBest ? "compare-cell-best" : ""}" style="--tribe-col:${t.palette?.primary || "inherit"}">
            <strong>${u.name}</strong>
            <span class="compare-stat-pair">
              <span class="compare-stat ${atkBest ? "best" : ""}" title="Attack">⚔ ${u.metrics.offense}</span>
              <span class="compare-stat ${defBest ? "best" : ""}" title="Defense avg">🛡 ${u.metrics.defenseCombined}</span>
            </span>
          </td>`;
        })
        .join("");
      const atks = tribes.map((t) => t.troops[i]?.metrics.offense ?? 0);
      const defs = tribes.map((t) => t.troops[i]?.metrics.defenseCombined ?? 0);
      const bestAtk = Math.max(...atks);
      const bestDef = Math.max(...defs);
      const atkNames = tribes
        .filter((t) => t.troops[i]?.metrics.offense === bestAtk)
        .map((t) => t.name)
        .join(", ");
      const defNames = tribes
        .filter((t) => t.troops[i]?.metrics.defenseCombined === bestDef)
        .map((t) => t.name)
        .join(", ");
      return `<tr>
        <td>${slot.slot}</td>
        <td><span class="role-badge">${slot.role}</span></td>
        ${cells}
        <td class="num compare-best-cell">${bestAtk} <span class="muted">(${atkNames})</span></td>
        <td class="num compare-best-cell">${bestDef} <span class="muted">(${defNames})</span></td>
      </tr>`;
    })
    .join("");
}

function setCompareMode(mode) {
  compareViewMode = mode;
  document.querySelectorAll("[data-compare-mode]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.compareMode === mode);
  });
  renderCompare();
}

function setStatNormalizeMode(mode) {
  statNormalizeMode = NORMALIZE_MODES.some((m) => m.id === mode) ? mode : "raw";
  document.querySelectorAll("[data-stat-normalize]").forEach((el) => {
    if (el.tagName === "SELECT") el.value = statNormalizeMode;
    else el.classList.toggle("active", el.dataset.statNormalize === statNormalizeMode);
  });
  recomputeGlobalScales();
  refreshGraphViews();
}

function bindStatNormalize() {
  document.querySelectorAll("[data-stat-normalize]").forEach((el) => {
    if (el.tagName !== "SELECT") return;
    el.innerHTML = NORMALIZE_MODES.map(
      (m) =>
        `<option value="${m.id}"${m.id === statNormalizeMode ? " selected" : ""}>${m.label}</option>`
    ).join("");
    if (!el.dataset.normalizeBound) {
      el.addEventListener("change", () => setStatNormalizeMode(el.value));
      el.dataset.normalizeBound = "1";
    }
    el.value = statNormalizeMode;
  });
}

function setStatDisplayMode(mode) {
  statDisplayMode = normalizeStatDisplayMode(mode);
  document.querySelectorAll("[data-stat-display]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.statDisplay === statDisplayMode);
  });
  refreshGraphViews();
}

function bindCompareChartMetric() {
  const sel = $("#compare-chart-metric");
  if (!sel) return;
  sel.innerHTML = CHART_METRICS.map(
    (m) =>
      `<option value="${m.key}"${m.key === compareChartMetric ? " selected" : ""}>${m.label}</option>`
  ).join("");
  if (!compareChartMetricBound) {
    sel.addEventListener("change", () => {
      compareChartMetric = sel.value;
      if (compareMode && compareViewMode === "charts") renderCompareCharts();
    });
    compareChartMetricBound = true;
  }
}

function bindCompareChartLayout() {
  const sel = $("#compare-chart-layout");
  if (!sel) return;
  sel.innerHTML = CHART_LAYOUTS.map(
    (l) =>
      `<option value="${l.id}"${l.id === compareChartLayout ? " selected" : ""}>${l.name}</option>`
  ).join("");
  if (!compareChartLayoutBound) {
    sel.addEventListener("change", () => {
      compareChartLayout = sel.value;
      if (compareMode && compareViewMode === "charts") renderCompareCharts();
    });
    compareChartLayoutBound = true;
  }
}

function renderCompare() {
  const tribes = getCompareTribes();
  const hint = $("#compare-picker-hint");

  if (tribes.length < COMPARE_MIN_TRIBES) {
    hint?.classList.remove("hidden");
    $("#compare-table-wrap")?.classList.add("hidden");
    $("#compare-graphics-wrap")?.classList.add("hidden");
    $("#compare-charts-wrap")?.classList.add("hidden");
    $("#compare-radar-wrap")?.classList.add("hidden");
    renderCompareLegend([]);
    renderCompareSummary([]);
    return;
  }
  hint?.classList.add("hidden");
  setCompareColumnCount(tribes.length);

  renderCompareLegend(tribes);
  renderCompareSummary(tribes);

  $("#compare-table-wrap")?.classList.toggle("hidden", compareViewMode !== "table");
  $("#compare-graphics-wrap")?.classList.toggle("hidden", compareViewMode !== "graphics");
  $("#compare-charts-wrap")?.classList.toggle("hidden", compareViewMode !== "charts");
  $("#compare-radar-wrap")?.classList.toggle("hidden", compareViewMode !== "radar");

  if (compareViewMode === "radar") renderCompareRadar();
  if (compareViewMode === "graphics") renderCompareGraphics();
  if (compareViewMode === "charts") renderCompareCharts();
  if (compareViewMode === "table") renderCompareTable(tribes);

  const names = formatCompareTribeList(tribes);
  $("#tribe-name").textContent = "Tribe comparison";
  $("#tribe-theme").textContent = `${tribes.length} tribes — ${names}`;
}

function showCompare() {
  compareMode = true;
  $("#view-single").classList.add("hidden");
  $("#view-compare").classList.remove("hidden");
  $("#btn-compare").textContent = "Back to tribe";
  $("#topbar .view-tabs")?.classList.add("hidden");

  compareTribeIds = loadPersistedCompareSelection() || defaultCompareSelection();
  renderCompareTribePicker();
  bindCompareChartMetric();
  bindCompareChartLayout();
  bindStatNormalize();
  setCompareMode(compareViewMode);
  renderCompare();
  renderNav();
}

function bindSort() {
  document.querySelectorAll("#troop-table th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortKey === key) sortDir *= -1;
      else {
        sortKey = key;
        sortDir = 1;
      }
      const tribe = tribeById(activeTribeId);
      if (tribe) renderTroops(tribe);
    });
  });
}

function bindUi() {
  document.querySelectorAll(".view-tab[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });

  document.querySelectorAll("[data-compare-mode]").forEach((btn) => {
    btn.addEventListener("click", () => setCompareMode(btn.dataset.compareMode));
  });

  document.querySelectorAll("[data-stat-display]").forEach((btn) => {
    btn.addEventListener("click", () => setStatDisplayMode(btn.dataset.statDisplay));
  });

  bindStatNormalize();

  $("#unit-filter")?.addEventListener("input", () => {
    const tribe = tribeById(activeTribeId);
    if (tribe) renderTroops(tribe);
  });

  $("#btn-compare")?.addEventListener("click", () => {
    if (!data?.tribes?.length) return;
    if (compareMode) selectTribe(activeTribeId || data.tribes[0].id);
    else showCompare();
  });

  $("#btn-refresh")?.addEventListener("click", () => rebuildData($("#btn-refresh")));

  $("#btn-hero-xp")?.addEventListener("click", async () => {
    const btn = $("#btn-hero-xp");
    btn.disabled = true;
    try {
      await apiPost("/api/hero-xp");
      toast("Hero XP table regenerated");
    } catch (e) {
      toast(e.message);
    } finally {
      btn.disabled = false;
    }
  });
}

async function apiPost(path) {
  const res = await fetch(path, { method: "POST" });
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error(body.error || res.statusText);
  return body;
}

async function setServerStatus() {
  const el = $("#server-status");
  try {
    const res = await fetch("/api/status");
    if (res.ok) {
      el.textContent = "Applet connected";
      el.className = "server-status ok";
      return true;
    }
  } catch {
    /* static file mode */
  }
  el.textContent = "Static mode — use npm start for rebuild";
  el.className = "server-status";
  return false;
}

async function rebuildData(btn) {
  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = "Rebuilding…";
  try {
    await apiPost("/api/rebuild");
    await loadData();
    recomputeGlobalScales();
    if (activeTribeId) selectTribe(activeTribeId);
    else if (data?.tribes?.[0]) selectTribe(data.tribes[0].id);
    toast("Data rebuilt");
  } catch (e) {
    toast(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = prev;
  }
}

function refreshGraphViews() {
  if (!data?.tribes) return;
  const tribe = tribeById(activeTribeId);
  if (activeView === "radar" && tribe) renderRadarView(tribe);
  if (!compareMode) return;
  if (compareViewMode === "radar") renderCompareRadar();
  if (compareViewMode === "charts") renderCompareCharts();
  if (compareViewMode === "graphics") renderCompareGraphics();
}

function onUiThemeChange() {
  refreshGraphViews();
}

function onGraphPaletteChange() {
  refreshGraphViews();
}

function showLoadError(e, hasApi) {
  const msg = e?.message || String(e);
  console.error("[Tevel]", e);
  toast(msg);
  $("#tribe-name").textContent = "No data";
  $("#tribe-theme").textContent = hasApi
    ? "Click Rebuild data in the sidebar, or run: npm run build:data"
    : "Run start-tevel.bat or: npm start — then open http://127.0.0.1:3456";
}

async function init() {
  bindUi();
  initUiTheme();

  const hasApi = await setServerStatus();
  try {
    await loadData();
    recomputeGlobalScales();
    bindStatNormalize();
    bindSort();
    mountThemePicker($("#theme-picker"), onUiThemeChange);
    mountGraphPalettePicker($("#graph-palette-picker"), onGraphPaletteChange);
    selectTribe(data.tribes[0].id);
    if (!hasApi) {
      $("#btn-refresh").textContent = "Rebuild (needs applet)";
    }
    if (location.protocol === "file:") {
      toast("Loaded from disk — use npm start for full applet features.");
    }
  } catch (e) {
    showLoadError(e, hasApi);
  }
}

init().catch((e) => showLoadError(e, false));
