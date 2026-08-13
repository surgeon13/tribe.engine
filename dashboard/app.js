/** @typedef {import('../lib/merge.js').resolveTroops} Troop */

import {
  buildViewMetrics,
  chartMetricLabel,
  chartMetricValue,
  formatNormalizedNumber,
  getNormalizeMode,
  getProfileAxes,
  NORMALIZE_MODES,
  normalizeModeHint,
} from "./metrics-normalize.js";
import {
  computeGlobalScales,
  drawMultiRadar,
  formatStatValue,
  mountRadarCard,
  overallRating,
  statBarPercent,
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
  computeReadableChartWidth,
  drawMultiCostStackChart,
  drawMultiHorizontalCompareChart,
  drawMultiLineCompareChart,
  drawSlotBarChart,
  slotBarChartWidth,
} from "./charts.js";
import { mountPaletteContrastHint } from "./palette-hint.js";
import { SMITHY_MAX_LEVEL, smithyGainRange, upgradeTribe } from "./smithy.js";
import {
  mountTroopLogoCell,
  mountPortrait,
  portraitOptsFromUnit,
} from "./graphics.js";
import {
  getCompareSeriesColors,
  initUiTheme,
  inkOn,
  mountGraphPalettePicker,
  mountThemePicker,
  resolveBarColors,
  tribeGraphicColor,
  tribeInkColor,
} from "./themes.js";
import { initAddTribeUi, setAddTribeEnabled, refreshRemovableTribes, isRemovableTribe, requestDeleteTribe } from "./tribe-create.js";
import {
  appendSessionHistory,
  listSessionHistory,
  mergeSessionTribes,
  mergeTribeIntoData,
  removeSessionTribe,
  setSessionStoreEnabled,
  upsertSessionTribe,
} from "./session-tribes.js";
import {
  applyEditsToTribe,
  BUILDING_OPTIONS,
  canEditTribe,
  cellInputHtml,
  cellSelectHtml,
  formatTrainingTimeClient,
  readEditsFromTable,
  ROLE_OPTIONS,
  saveTribeEdits,
  snapshotTribeForHistory,
  tribeToUpdatePayload,
} from "./tribe-edit.js";

let data = null;
let globalScales = null;
let activeTribeId = null;
/** @type {boolean} */
let editMode = false;
/** @type {object | null} snapshot before edit */
let editSnapshot = null;
let sortKey = "slot";
let sortDir = 1;
let compareMode = false;
let activeView = "table";
let compareViewMode = "table";
let compareChartMetric = "offense";
let compareChartLayout = "bars";
let compareChartLayoutUserPicked = false;
let statDisplayMode = "bars";
let statNormalizeMode = "crop";
/** Smithy upgrade level applied to compared tribes, 0–20. */
let smithyLevel = 0;
let compareTribeIds = [];
let selectedTroopIndex = 0;
let compareChartMetricBound = false;
let compareChartLayoutBound = false;
let serverHasApi = false;
/** @type {boolean} local applet can write data/; Netlify cannot */
let apiWritable = false;
let compareCompactMq = null;

const COMPARE_COMPACT_MQ = "(max-width: 720px)";

function isCompareCompact() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.(COMPARE_COMPACT_MQ).matches) return true;
  // Fallback when device emulation changes layout viewport without firing matchMedia.
  return Number(window.innerWidth) > 0 && Number(window.innerWidth) <= 720;
}

function syncCompareCompactAttr() {
  const compact = isCompareCompact();
  document.documentElement.dataset.compareCompact = compact ? "1" : "0";
  return compact;
}

function applyCompactChartLayoutDefault() {
  if (compareChartLayoutUserPicked) return compareChartLayout;
  compareChartLayout = isCompareCompact() ? "horizontal" : "bars";
  return compareChartLayout;
}

function effectiveCompareChartLayout() {
  if (compareChartLayoutUserPicked) return compareChartLayout;
  if (isCompareCompact()) return "horizontal";
  return compareChartLayout;
}

function recomputeGlobalScales() {
  if (!data?.tribes) return;
  globalScales = computeGlobalScales(data.tribes, statNormalizeMode);
}

const COMPARE_MIN_TRIBES = 2;
const COMPARE_STORAGE_KEY = "tevel-compare-tribes";

const $ = (sel) => document.querySelector(sel);

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

/** Turn legacy absolute `/assets/...` URLs into relative ones for PWA / Pages. */
function relativizeUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("/assets/")) return url.slice(1);
  return url;
}

function relativizeTribeAssets(tribe) {
  if (tribe.graphicsUrls) {
    for (const k of Object.keys(tribe.graphicsUrls)) {
      tribe.graphicsUrls[k] = relativizeUrl(tribe.graphicsUrls[k]);
    }
  }
  for (const troop of tribe.troops || []) {
    if (!troop.graphicsUrls) continue;
    for (const k of Object.keys(troop.graphicsUrls)) {
      troop.graphicsUrls[k] = relativizeUrl(troop.graphicsUrls[k]);
    }
  }
  if (tribe.hero?.graphicsUrls) {
    for (const k of Object.keys(tribe.hero.graphicsUrls)) {
      tribe.hero.graphicsUrls[k] = relativizeUrl(tribe.hero.graphicsUrls[k]);
    }
  }
}

function preparePayload(payload) {
  if (!payload) return payload;
  if (payload.assetBase === "/assets") payload.assetBase = "assets";
  for (const tribe of payload.tribes || []) relativizeTribeAssets(tribe);
  return payload;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  navigator.serviceWorker.register("./sw.js").catch((err) => {
    console.warn("[Tevel] Service worker registration failed:", err);
  });
}

function showInstallHint(hasApi) {
  const el = $("#install-hint");
  if (!el || hasApi || isStandaloneDisplay()) return;

  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSecure =
    location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";

  if (!isSecure) return;

  el.hidden = false;
  el.classList.remove("hidden");
  el.textContent = isIos
    ? "Install: Safari Share → Add to Home Screen"
    : "Install: use your browser’s Install app / Add to Home Screen";
}

async function loadData() {
  const errors = [];

  try {
    const res = await fetch(`data.json?ts=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      data = preparePayload(await res.json());
    } else {
      errors.push(`fetch data.json → HTTP ${res.status}`);
    }
  } catch (e) {
    errors.push(`fetch data.json → ${e.message}`);
  }

  if (!data?.tribes?.length) {
    try {
      const mod = await import("./generated-data.js");
      data = preparePayload(mod.default);
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

  data = mergeSessionTribes(data);
  if (window.__tevelPendingTribe) {
    data = mergeTribeIntoData(data, window.__tevelPendingTribe);
    window.__tevelPendingTribe = null;
  }
}

function setAccent(hex) {
  const accent = hex || "#c9a227";
  const style = document.documentElement.style;
  style.setProperty("--accent", accent);
  // Themes ship a fixed dark --accent-text, which disappears once a tribe's
  // primary is dark too (buttons, badges, the brand mark all sit on --accent).
  style.setProperty("--accent-text", inkOn(accent));
  // Filled surfaces can use the tribe's real color because the ink on top
  // adapts, but thin marks drawn straight onto the page cannot: the Israelite
  // white and the Teuton black each disappear into one of the themes.
  style.setProperty("--accent-mark", tribeGraphicColor(accent));
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
    const row = document.createElement("div");
    row.className = "tribe-nav-row";

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
    row.append(btn);

    if (serverHasApi && isRemovableTribe(tribe.id)) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "tribe-delete-btn";
      del.title = `Delete ${tribe.name}`;
      del.setAttribute("aria-label", `Delete ${tribe.name}`);
      del.textContent = "×";
      del.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          if (editMode) exitEditMode(false);
          await requestDeleteTribe(tribe.id, tribe.name);
        } catch (err) {
          toast(err.message || String(err));
        }
      });
      row.append(del);
    }

    nav.append(row);
  }
  scheduleTribeNavOverflow();
}

/** The top-bar layout, where the tribe list is capped and can hide tribes. */
const TRIBE_NAV_STACKED_MQ = "(max-width: 900px)";

/**
 * Says out loud how much of the tribe list is out of sight.
 *
 * In the top bar the list is a wrapped grid with a ceiling on it, so on a phone
 * it can show six tribes of eighteen and cut the next row in half. A sliced row
 * is not an affordance — it reads as the end of the list as easily as it reads
 * as more to come — so the tribes that do not fit are counted on a button that
 * opens the list up. Nested scrolling inside a page that also scrolls is the
 * thing worth avoiding here; tapping once to see everything is not.
 */
function updateTribeNavOverflow() {
  const wrap = $("#tribe-nav-wrap");
  const nav = $("#tribe-nav");
  const more = $("#tribe-nav-more");
  if (!wrap || !nav || !more) return;

  // The sidebar gets the full window height and scrolls as one piece; only the
  // top bar caps the list, so only the top bar can hide anything.
  if (!window.matchMedia?.(TRIBE_NAV_STACKED_MQ).matches) {
    wrap.dataset.overflow = "0";
    more.hidden = true;
    return;
  }

  const bottom = nav.getBoundingClientRect().bottom;
  let hidden = 0;
  for (const row of nav.children) {
    if (row.getBoundingClientRect().bottom > bottom + 1) hidden += 1;
  }

  wrap.dataset.overflow = hidden ? "1" : "0";
  const expanded = wrap.dataset.expanded === "1";
  more.hidden = !hidden && !expanded;
  more.textContent = hidden
    ? `Show ${hidden} more ${hidden === 1 ? "tribe" : "tribes"}`
    : "Show fewer";
}

/**
 * Counting has to wait for the layout the count describes. Chips are laid out
 * by text width, so the roster rewraps when the web font swaps in, and a number
 * measured before that is simply wrong about a different layout. Coalesced to
 * one frame because scroll, resize and the observer all ask for the same thing.
 */
let tribeNavOverflowFrame = 0;
function scheduleTribeNavOverflow() {
  if (tribeNavOverflowFrame) return;
  tribeNavOverflowFrame = requestAnimationFrame(() => {
    tribeNavOverflowFrame = 0;
    updateTribeNavOverflow();
  });
}

function bindTribeNav() {
  const wrap = $("#tribe-nav-wrap");
  const nav = $("#tribe-nav");
  const more = $("#tribe-nav-more");
  if (!wrap || !nav || !more) return;

  // The font swap rewraps the chips; the observer catches the breakpoint
  // flipping the cap between sidebar height and top-bar height.
  document.fonts?.ready.then(scheduleTribeNavOverflow);
  if (window.ResizeObserver) new ResizeObserver(scheduleTribeNavOverflow).observe(nav);

  more.addEventListener("click", () => {
    const expanded = wrap.dataset.expanded === "1";
    wrap.dataset.expanded = expanded ? "0" : "1";
    more.setAttribute("aria-expanded", String(!expanded));
    if (expanded) nav.scrollTop = 0;
    scheduleTribeNavOverflow();
  });

  nav.addEventListener("scroll", scheduleTribeNavOverflow, { passive: true });
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
  const maxAtk = tribe.summary?.maxAttack || 1;
  const rows = getTroopRows(tribe);
  const tbody = $("#troop-tbody");
  const editing = editMode && canEditTribe(tribe.id);
  tbody.innerHTML = rows
    .map((t) => {
      const m = t.metrics;
      const idx = tribe.troops.indexOf(t);
      if (editing) {
        const trainSecs = t.training?.timeSeconds ?? 0;
        return `<tr data-troop-index="${idx}" data-troop-ref="${t.ref}" class="troop-row editing">
        <td class="troop-logo-col" data-logo-slot="${idx}"></td>
        <td>${t.slot}</td>
        <td>${cellInputHtml("name", t.name, { name: true })}</td>
        <td>${cellSelectHtml("role", t.role, ROLE_OPTIONS)}</td>
        <td class="num">${cellInputHtml("attack", t.stats?.attack)}</td>
        <td class="num">${cellInputHtml("defenseInfantry", t.stats?.defenseInfantry)}</td>
        <td class="num">${cellInputHtml("defenseCavalry", t.stats?.defenseCavalry)}</td>
        <td class="num" data-derived="defenseCombined">${m.defenseCombined}</td>
        <td class="num">${cellInputHtml("speed", t.stats?.speed)}</td>
        <td class="num">${cellInputHtml("carry", t.stats?.carry)}</td>
        <td class="num">${cellInputHtml("cropUpkeep", t.cropUpkeep)}</td>
        <td class="num">${cellInputHtml("wood", t.cost?.wood)}</td>
        <td class="num">${cellInputHtml("clay", t.cost?.clay)}</td>
        <td class="num">${cellInputHtml("iron", t.cost?.iron)}</td>
        <td class="num">${cellInputHtml("crop", t.cost?.crop)}</td>
        <td class="num" data-derived="totalCost">${t.totalCost.toLocaleString()}</td>
        <td class="num" title="${formatTrainingTimeClient(trainSecs)}">${cellInputHtml("timeSeconds", trainSecs, { title: `Train time in seconds (${formatTrainingTimeClient(trainSecs)})` })}</td>
        <td>${cellSelectHtml("building", t.training?.building || "barracks", BUILDING_OPTIONS)}</td>
      </tr>`;
      }
      return `<tr data-troop-index="${idx}" data-troop-ref="${t.ref}" class="troop-row">
        <td class="troop-logo-col" data-logo-slot="${idx}"></td>
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

  rows.forEach((t) => {
    const idx = tribe.troops.indexOf(t);
    const cell = tbody.querySelector(`[data-logo-slot="${idx}"]`);
    if (cell) mountTroopLogoCell(cell, t, tribe.palette);
  });

  tbody.querySelectorAll(".troop-row").forEach((row) => {
    row.classList.toggle(
      "selected",
      activeView === "radar" && Number(row.dataset.troopIndex) === selectedTroopIndex,
    );
  });

  if (editing) {
    tbody.querySelectorAll("input.cell-edit, select.cell-edit").forEach((el) => {
      el.addEventListener("click", (e) => e.stopPropagation());
      el.addEventListener("change", () => livePreviewEdits());
      el.addEventListener("input", () => {
        if (el instanceof HTMLInputElement && el.type === "number") livePreviewEdits();
      });
    });
  }

  tbody.querySelectorAll(".troop-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (
        editing &&
        e.target instanceof HTMLElement &&
        e.target.closest("input, select")
      ) {
        return;
      }
      selectedTroopIndex = Number(row.dataset.troopIndex);
      if (activeView === "radar") renderRadarView(tribeById(activeTribeId) || tribe);
      else if (!editing) setView("radar");
      else renderTroops(tribe);
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

  const title = document.createElement("div");
  title.className = "stat-profile-title";

  const titleRow = document.createElement("div");
  titleRow.className = "stat-profile-title-row";

  const logoSlot = document.createElement("div");
  logoSlot.className = "stat-profile-logo";
  const portrait = document.createElement("div");
  mountPortrait(portrait, portraitOptsFromUnit(entity, palette, { size: "sm" }));
  logoSlot.append(portrait);

  const nameEl = document.createElement("h4");
  nameEl.textContent = entity.name;
  titleRow.append(logoSlot, nameEl);
  title.append(titleRow);

  if (opts.subtitle) {
    const sub = document.createElement("p");
    sub.className = "stat-profile-subtitle";
    sub.textContent = opts.subtitle;
    title.append(sub);
  }
  if (norm.id !== "raw") {
    const normNote = document.createElement("p");
    normNote.className = "stat-profile-subtitle muted";
    normNote.textContent = `${norm.label}: ${norm.description}`;
    title.append(normNote);
  }

  head.append(title);
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
      const tableTribe = tribeById(activeTribeId);
      if (tableTribe) renderTroops(tableTribe);
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
  if (view === "table" && tribe) renderTroops(tribe);
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

function syncEditChrome(tribe) {
  const editable = serverHasApi && tribe && canEditTribe(tribe.id);
  const editing = Boolean(editMode && editable);
  const btnEditMenu = /** @type {HTMLButtonElement | null} */ ($("#btn-edit-tribe-menu"));
  const sidebarActions = $("#sidebar-edit-actions");
  const tableActions = $("#table-edit-actions");
  const editPanel = $("#tribe-edit-panel");
  const banner = $("#tribe-edit-banner");
  const badge = $("#roster-edit-badge");
  const nameView = $("#tribe-name");
  const themeView = $("#tribe-theme");

  document.body.classList.toggle("tribe-editing", editing);
  btnEditMenu?.classList.toggle("is-active", editing);
  btnEditMenu?.classList.toggle("hidden", editing);
  if (btnEditMenu) {
    btnEditMenu.disabled = !serverHasApi || !tribe;
    btnEditMenu.title = !serverHasApi
      ? "Needs the applet or Netlify API"
      : !tribe
        ? "Select a tribe first"
        : !editable
          ? "Core Travian tribes are read-only — pick a created tribe"
          : "Edit the selected tribe's roster and colors";
  }
  sidebarActions?.classList.toggle("hidden", !editing);
  tableActions?.classList.toggle("hidden", !editing);
  editPanel?.classList.toggle("hidden", !editing);
  banner?.classList.toggle("hidden", !editing);
  badge?.classList.toggle("hidden", !editing);

  if (editing && tribe) {
    const authorInput = /** @type {HTMLInputElement | null} */ ($("#edit-author"));
    const nameInput = /** @type {HTMLInputElement | null} */ ($("#edit-tribe-name"));
    const themeInput = /** @type {HTMLInputElement | null} */ ($("#edit-tribe-theme"));
    const heroInput = /** @type {HTMLInputElement | null} */ ($("#edit-hero-name"));
    const primaryInput = /** @type {HTMLInputElement | null} */ ($("#edit-tribe-primary"));
    const secondaryInput = /** @type {HTMLInputElement | null} */ ($("#edit-tribe-secondary"));
    if (authorInput && document.activeElement !== authorInput) {
      authorInput.value = localStorage.getItem("tevel-edit-author") || "";
    }
    if (nameInput && document.activeElement !== nameInput) nameInput.value = tribe.name || "";
    if (themeInput && document.activeElement !== themeInput) themeInput.value = tribe.theme || "";
    if (heroInput && document.activeElement !== heroInput) heroInput.value = tribe.hero?.name || "Hero";
    if (primaryInput && document.activeElement !== primaryInput) {
      primaryInput.value = tribe.palette?.primary || "#3D5A80";
    }
    if (secondaryInput && document.activeElement !== secondaryInput) {
      secondaryInput.value = tribe.palette?.secondary || "#E09F3E";
    }
    mountPaletteContrastHint(primaryInput, secondaryInput, $("#edit-palette-hint"));
  }
  if (nameView) nameView.textContent = tribe?.name || "—";
  if (themeView) themeView.textContent = tribe?.theme || "";
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function renderEditHistory(tribeId) {
  const host = $("#edit-history-list");
  if (!host) return;
  if (!tribeId) {
    host.innerHTML = `<p class="muted">Select a tribe to see update history.</p>`;
    return;
  }

  /** @type {object[]} */
  let entries = [];
  try {
    const res = await fetch(`/api/tribes/${encodeURIComponent(tribeId)}/history?limit=20`);
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.ok) entries = body.entries || [];
  } catch {
    /* offline */
  }
  const sessionEntries = listSessionHistory(tribeId, 20);
  const byId = new Map();
  for (const e of [...entries, ...sessionEntries]) {
    if (e?.id && !byId.has(e.id)) byId.set(e.id, e);
  }
  const merged = [...byId.values()].sort((a, b) => String(b.at).localeCompare(String(a.at)));

  if (!merged.length) {
    host.innerHTML = `<p class="muted">No updates recorded for this tribe yet. Save an edit to start the history used for stat normalization.</p>`;
    return;
  }

  host.innerHTML = merged
    .slice(0, 20)
    .map((e) => {
      const when = e.at ? new Date(e.at).toLocaleString() : "—";
      const who = e.author || "anonymous";
      const src = e.source === "session" ? "session" : "backend";
      const note = e.note ? ` · ${escapeHtml(e.note)}` : "";
      return `<article class="edit-history-item">
        <strong>${escapeHtml(who)} · ${escapeHtml(e.summary || "Update")}</strong>
        <p class="muted">${escapeHtml(when)} · ${src}${note}</p>
      </article>`;
    })
    .join("");
}

function enterEditMode() {
  const tribe = tribeById(activeTribeId);
  if (!tribe || !canEditTribe(tribe.id)) {
    toast("This tribe cannot be edited (core roster is read-only)");
    return;
  }
  if (compareMode) {
    toast("Leave compare mode to edit a tribe");
    return;
  }
  editMode = true;
  editSnapshot = structuredClone(tribe);
  setView("table");
  syncEditChrome(tribe);
  renderTroops(tribe);
  renderHero(tribe);
  renderEditHistory(tribe.id);
  $("#tribe-edit-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  toast(`Editing ${tribe.name} — use the table cells, then Save changes`);
}

function exitEditMode(restore) {
  if (!editMode) return;
  const id = activeTribeId;
  if (restore && editSnapshot && data?.tribes) {
    const idx = data.tribes.findIndex((t) => t.id === id);
    if (idx >= 0) data.tribes[idx] = editSnapshot;
  }
  editMode = false;
  editSnapshot = null;
  const tribe = tribeById(id);
  syncEditChrome(tribe);
  if (tribe) {
    renderSummary(tribe);
    renderTroops(tribe);
    renderHero(tribe);
    renderEditHistory(tribe.id);
    if (activeView === "radar") renderRadarView(tribe);
  }
  renderNav();
}

function livePreviewEdits() {
  if (!editMode) return;
  const tribe = tribeById(activeTribeId);
  if (!tribe) return;
  const edits = readEditsFromTable($("#troop-tbody"), tribe);
  const next = applyEditsToTribe(tribe, edits);
  const idx = data.tribes.findIndex((t) => t.id === tribe.id);
  if (idx >= 0) data.tribes[idx] = next;
  // Preserve focus while refreshing derived columns
  const active = document.activeElement;
  const activeKey =
    active instanceof HTMLInputElement && active.dataset.edit
      ? `${active.closest("tr")?.dataset.troopRef}|${active.dataset.edit}|${active.selectionStart}`
      : null;
  renderSummary(next);
  const paletteChanged =
    next.palette?.primary !== tribe.palette?.primary ||
    next.palette?.secondary !== tribe.palette?.secondary;
  const metaChanged =
    next.name !== tribe.name ||
    next.theme !== tribe.theme ||
    next.hero?.name !== tribe.hero?.name ||
    paletteChanged;
  if (paletteChanged) {
    setAccent(next.palette?.primary);
    renderPalette(next.palette);
  }
  if (metaChanged) {
    renderHero(next);
    // Keep sidebar name/dot in sync when tribe identity colors change.
    const nameView = $("#tribe-name");
    if (nameView && !document.body.classList.contains("tribe-editing")) {
      nameView.textContent = next.name;
    }
    const btn = document.querySelector(`#tribe-nav .tribe-btn[data-id="${next.id}"]`);
    if (btn) {
      const dot = btn.querySelector(".tribe-dot");
      if (dot && next.palette) {
        /** @type {HTMLElement} */ (dot).style.background = `linear-gradient(135deg, ${next.palette.primary}, ${next.palette.secondary})`;
      }
      // Update label text node after the dot
      const label = [...btn.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
      if (label && next.name) label.textContent = next.name;
    }
  }
  // Update derived cells in-place to avoid focus loss on every keystroke
  for (const t of next.troops) {
    const row = $("#troop-tbody")?.querySelector(`tr[data-troop-ref="${t.ref}"]`);
    if (!row) continue;
    const defAvg = row.querySelector('[data-derived="defenseCombined"]');
    const total = row.querySelector('[data-derived="totalCost"]');
    if (defAvg) defAvg.textContent = String(t.metrics.defenseCombined);
    if (total) total.textContent = t.totalCost.toLocaleString();
    const trainInput = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-edit="timeSeconds"]'));
    if (trainInput) {
      const formatted = formatTrainingTimeClient(t.training?.timeSeconds);
      trainInput.title = `Train time in seconds (${formatted})`;
    }
  }
  if (activeKey) {
    const [ref, key] = activeKey.split("|");
    const el = /** @type {HTMLInputElement | null} */ (
      $("#troop-tbody")?.querySelector(`tr[data-troop-ref="${ref}"] [data-edit="${key}"]`)
    );
    el?.focus();
  }
  void active;
}

async function commitEditMode() {
  const tribe = tribeById(activeTribeId);
  if (!tribe || !editMode) return;
  const edits = readEditsFromTable($("#troop-tbody"), tribe);
  if (!edits.name) {
    toast("Tribe name is required");
    return;
  }
  const next = applyEditsToTribe(tribe, edits);
  const payload = tribeToUpdatePayload(next);
  payload.beforeSnapshot = snapshotTribeForHistory(editSnapshot || tribe);
  const buttons = [
    /** @type {HTMLButtonElement | null} */ ($("#btn-save-tribe")),
    /** @type {HTMLButtonElement | null} */ ($("#btn-save-tribe-menu")),
  ].filter(Boolean);
  for (const btn of buttons) {
    btn.disabled = true;
    btn.textContent = "Saving…";
  }
  try {
    const author = payload.author || "anonymous";
    if (author && author !== "anonymous") localStorage.setItem("tevel-edit-author", author);
    const body = await saveTribeEdits(tribe.id, payload);
    const saved = body.dashboardTribe || next;
    // Session upsert no-ops on writable applet; required on Netlify.
    upsertSessionTribe(saved);
    if (body.historyEntry) appendSessionHistory(body.historyEntry);
    window.__tevelPendingTribe = saved;
    data = mergeTribeIntoData(data || { tribes: [] }, saved);
    editMode = false;
    editSnapshot = null;
    try {
      await loadData();
    } catch {
      data = mergeTribeIntoData(data || { tribes: [] }, saved);
    }
    recomputeGlobalScales();
    selectTribe(saved.id);
    toast(body.message || `Saved ${saved.name}`);
  } catch (e) {
    // Keep draft visible; session store only when enabled (Netlify).
    upsertSessionTribe(next);
    data = mergeTribeIntoData(data || { tribes: [] }, next);
    toast(e.message || String(e));
    syncEditChrome(next);
    renderSummary(next);
  } finally {
    for (const btn of buttons) {
      btn.disabled = false;
      btn.textContent = "Save changes";
    }
  }
}

function selectTribe(id) {
  if (editMode && id !== activeTribeId) {
    if (!confirm("Discard unsaved tribe edits?")) return;
    exitEditMode(true);
  }

  activeTribeId = id;
  selectedTroopIndex = 0;
  hideAuxViews();

  const tribe = tribeById(id);
  if (!tribe) return;

  setAccent(tribe.palette?.primary);
  syncEditChrome(tribe);
  renderPalette(tribe.palette);
  renderSummary(tribe);
  renderTroops(tribe);
  renderHero(tribe);
  renderEditHistory(tribe.id);
  if (activeView === "radar") renderRadarView(tribe);
  renderNav();
}

function shortUnitName(name, max = 16) {
  const s = String(name || "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Every tribe with the current smithy level applied.
 *
 * Upgrading is pure and cheap, but it rebuilds every troop object, so the
 * result is memoised: the per-slot radar yardsticks are drawn from the whole
 * roster and would otherwise re-derive 198 units on each repaint.
 */
let smithyTribeCache = { level: null, tribes: null };

function smithyTribes() {
  if (smithyTribeCache.level === smithyLevel) return smithyTribeCache.tribes;
  const tribes = smithyLevel ? data.tribes.map((t) => upgradeTribe(t, smithyLevel)) : data.tribes;
  smithyTribeCache = { level: smithyLevel, tribes };
  return tribes;
}

function getCompareTribes() {
  const upgraded = smithyTribes();
  return compareTribeIds.map((id) => upgraded.find((t) => t.id === id)).filter(Boolean);
}

function setCompareColumnCount(n) {
  const cols = Math.max(n, 2);
  document.documentElement.style.setProperty("--compare-cols", String(cols));
  const compact = isCompareCompact();
  const minCol = compact
    ? 0
    : cols <= 3
      ? 220
      : cols <= 5
        ? 180
        : cols <= 6
          ? 160
          : 148;
  document.documentElement.style.setProperty("--compare-col-min", compact ? "0px" : `${minCol}px`);
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

/**
 * Row labels for the comparison charts.
 *
 * A row spans every selected tribe, so it is named after the slot rather than
 * after any one tribe's unit. Labelling the rows from the first tribe made the
 * whole chart look like it was about the Romans, and reordering the tribe
 * picker silently renamed every row.
 */
function compareSlotChartLabels() {
  return data.roster.map((slot, i) => ({
    main: slotCategoryLabel(i),
  }));
}

/**
 * The generic name of what a slot holds — "Infantry I", "Cavalry III".
 * @param {number} slotIndex
 */
function slotCategoryLabel(slotIndex) {
  const slot = data.roster[slotIndex];
  if (!slot) return "—";
  return slot.label || slot.baseUnitId || `Slot ${slot.slot}`;
}

/**
 * What each tribe calls the unit in this slot, in the same order as the series.
 * @param {Array<object>} tribes
 * @param {number} slotIndex
 */
function slotUnitNames(tribes, slotIndex) {
  return tribes.map((t) => t.troops[slotIndex]?.name || slotCategoryLabel(slotIndex));
}

function buildCompareChartSeries(tribes, metric, colors, normalizeMode) {
  return tribes.map((tribe, i) => ({
    name: tribe.name,
    color: colors[i],
    values: tribe.troops.map((t) => chartMetricValue(t, metric.key, normalizeMode)),
    // Every tribe's own name for each slot, so a bar can say what it actually is
    // rather than borrowing the label of whichever tribe happens to be first.
    unitNames: data.roster.map((_, si) => tribe.troops[si]?.name || slotCategoryLabel(si)),
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
      <span class="compare-tribe-dot" style="background:${tribeGraphicColor(tribe.palette?.primary)}"></span>
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
        `<span class="compare-legend-chip" style="--chip-color:${colors[i]}">
          <span class="compare-legend-dot"></span>${t.name}
        </span>`
    )
    .join("");
}

/**
 * Compare views label columns with the tribe color and also fill small badges
 * with it, so each element needs the theme-adapted color plus an ink that reads
 * on top of it.
 * @param {object} tribe
 */
function tribeColorVarStyle(tribe) {
  const col = tribeInkColor(tribe?.palette);
  return `--tribe-col:${col};--tribe-ink:${inkOn(col)}`;
}

/**
 * @param {HTMLElement} el
 * @param {object} tribe
 */
function setTribeColorVars(el, tribe) {
  const col = tribeInkColor(tribe?.palette);
  el.style.setProperty("--tribe-col", col);
  el.style.setProperty("--tribe-ink", inkOn(col));
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
      const color = tribeInkColor(tribe.palette);
      const bestAtkPerCrop = Math.max(
        0,
        ...tribe.troops
          .filter((t) => !["settler", "chief"].includes(t.role))
          .map((t) => (t.metrics.cropUpkeep > 0 ? t.metrics.offense / t.metrics.cropUpkeep : 0))
      );
      return `<article class="compare-summary-card" style="--tribe-col:${color};--tribe-ink:${inkOn(color)}">
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

function renderCompareGraphs() {
  const tribes = getCompareTribes();
  if (tribes.length < COMPARE_MIN_TRIBES) return;
  renderCompareGraphSlots(tribes);
}

/**
 * The radar always plots the raw seven-axis profile.
 *
 * The per-crop and per-cost views exist to divide a stat by what it costs to
 * field, but this chart already rescales every axis against the slot, and
 * normalising twice leaves a shape nobody can reason about. It also drops the
 * profile to the five combat stats, when upkeep and price are exactly what you
 * want to see next to them: a unit that wins on every combat axis and has a
 * stump where COST should be has told you its whole story. The Charts tab keeps
 * the per-crop lens for people who want it.
 */
const RADAR_PROFILE_MODE = "raw";

/**
 * Per-slot yardsticks: for each stat, the best any tribe manages in that slot.
 *
 * Scaling every unit against the whole roster's maximum would be honest and
 * useless — a tier-one spearman measured against heavy cavalry is a dot at the
 * centre of the radar, and so is the next one, and you learn nothing. Measured
 * against its own slot, a full axis means best-in-class and the shapes actually
 * separate. The yardstick comes from every tribe rather than the selected ones
 * so a shape does not change under you when you add a tribe to the comparison.
 */
let slotScaleCache = null;

function slotProfileScales() {
  if (slotScaleCache) return slotScaleCache;
  const axes = getProfileAxes(RADAR_PROFILE_MODE);
  slotScaleCache = data.roster.map((_, slotIndex) => {
    const maxes = {};
    const mins = {};
    for (const ax of axes) {
      maxes[ax.key] = 1;
      mins[ax.key] = ax.higherBetter === false ? Infinity : 0;
    }
    for (const tribe of smithyTribes()) {
      const troop = tribe.troops?.[slotIndex];
      if (!troop) continue;
      const view = buildViewMetrics(troop.metrics, RADAR_PROFILE_MODE);
      for (const ax of axes) {
        const val = view[ax.key] ?? 0;
        if (val > maxes[ax.key]) maxes[ax.key] = val;
        if (ax.higherBetter === false && val > 0 && val < mins[ax.key]) mins[ax.key] = val;
      }
    }
    for (const ax of axes) {
      if (!Number.isFinite(mins[ax.key])) mins[ax.key] = 1;
    }
    return { maxes, mins, axes, normalizeMode: RADAR_PROFILE_MODE };
  });
  return slotScaleCache;
}

/**
 * One radar per troop slot with every selected tribe's shape laid over it.
 *
 * This used to be a grid of one small radar per tribe per slot, which at four
 * tribes is forty-four charts and a very long scroll, and put the two shapes
 * you wanted to compare a screen apart. Overlaying them answers the question
 * the view is for — how do these units differ in kind, not just in total — in
 * one glance per slot, and the ranked list underneath says who comes out ahead.
 */
function renderCompareGraphSlots(tribes) {
  const grid = $("#compare-graphs-slots");
  if (!grid) return;
  grid.innerHTML = "";
  const compact = syncCompareCompactAttr();

  const axes = getProfileAxes(RADAR_PROFILE_MODE);
  const scales = slotProfileScales();
  const colors = getCompareSeriesColors(tribes.length, tribes);

  const hint = $("#compare-graphs-hint");
  if (hint) {
    hint.textContent =
      "Every axis is scaled against the best any tribe reaches in that slot, so a full corner means best in class and a short one means worst — training time and cost are inverted, where faster and cheaper reach further out. One unit at a time shows its real numbers at the corners: point at a row, or tap it, to read another. Rating is that unit's average across all seven axes, out of 100.";
  }

  data.roster.forEach((_, slotIndex) => {
    const entries = [];
    tribes.forEach((tribe, ti) => {
      const troop = tribe.troops[slotIndex];
      if (!troop) return;
      const view = buildViewMetrics(troop.metrics, RADAR_PROFILE_MODE);
      const values = axes.map((ax) => statBarPercent(ax.key, view[ax.key] ?? 0, scales[slotIndex]));
      entries.push({
        name: tribe.name,
        unitName: troop.name,
        color: colors[ti],
        values,
        raw: axes.map((ax) => view[ax.key] ?? 0),
        metrics: troop.metrics,
        rating: overallRating(values),
      });
    });
    if (!entries.length) return;

    // Best first, so the shape reading its numbers by default is the one worth
    // looking at, and the list doubles as the answer to "who wins this slot".
    entries.sort((a, b) => b.rating - a.rating);

    const card = document.createElement("article");
    card.className = "compare-radar-card";

    const title = document.createElement("h4");
    title.className = "compare-radar-title";
    title.textContent = slotCategoryLabel(slotIndex);
    card.append(title);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    card.append(svg);

    const list = document.createElement("ol");
    list.className = "compare-radar-rank";
    list.innerHTML = entries
      .map(
        (entry, i) => `
        <li data-series="${i}" style="--rank-col:${entry.color};--rank-fill:${entry.rating}%">
          <span class="compare-radar-swatch"></span>
          <span class="compare-radar-unit">${entry.unitName}<small>${entry.name}</small></span>
          <b class="compare-radar-rating">${entry.rating}</b>
        </li>`
      )
      .join("");
    card.append(list);

    const rows = [...list.children];
    let focus = 0;
    const paint = () => {
      const shown = entries[focus];
      drawMultiRadar(svg, {
        axes,
        series: entries,
        focus,
        size: compact ? 240 : 260,
        formatValue: (key, raw) =>
          formatStatValue(key, raw, shown.metrics, { normalizeMode: RADAR_PROFILE_MODE }),
      });
      rows.forEach((row, i) => row.classList.toggle("focused", i === focus));
      for (const poly of svg.querySelectorAll("polygon[data-series]")) {
        const index = Number(poly.dataset.series);
        poly.addEventListener("pointerenter", () => setFocus(index));
        poly.addEventListener("click", () => setFocus(index));
      }
    };
    const setFocus = (index) => {
      if (index === focus || !entries[index]) return;
      focus = index;
      paint();
    };

    rows.forEach((row, i) => {
      row.addEventListener("pointerenter", () => setFocus(i));
      row.addEventListener("click", () => setFocus(i));
    });
    // Back to the leader once the pointer leaves, so a card at rest always
    // reads the same way rather than keeping whatever was last brushed past.
    card.addEventListener("pointerleave", () => setFocus(0));

    paint();
    grid.append(card);
  });
}

function renderCompareCharts() {
  const tribes = getCompareTribes();
  if (tribes.length < COMPARE_MIN_TRIBES) return;

  const compact = syncCompareCompactAttr();
  const layoutId = effectiveCompareChartLayout();
  const layoutSel = $("#compare-chart-layout");
  if (layoutSel && layoutSel.value !== layoutId) {
    layoutSel.value = layoutId;
  }

  const metric =
    CHART_METRICS.find((m) => m.key === compareChartMetric) || CHART_METRICS[0];
  const metricLabel = chartMetricLabel(metric, statNormalizeMode);
  const slotLabels = compareSlotChartLabels(tribes);
  const troopLabels = slotLabels.map((l) => l.main);
  const wrapEl = $("#compare-charts-wrap");
  const containerW = Math.max(
    280,
    (wrapEl?.clientWidth || window.innerWidth || 360) - (compact ? 8 : 24)
  );
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
  const layoutNote = {
    bars: " One chart per unit, each scaled to its own slot — compare tribes within a chart, not across them.",
    lines: " One chart per troop family, each scaled to its own family — hover a point for its unit and value.",
    horizontal: compact
      ? " Phone layout: horizontal bars (readable without pinch-zoom)."
      : " Every unit in one chart, grouped by unit.",
  }[layoutId];
  cap.textContent = `${metricLabel} by unit — ${names}. ${normalizeModeHint(statNormalizeMode)}${layoutNote || ""}`;
  main.append(cap);

  const split = { tribes, series, metric, formatVal, compact };
  if (layoutId === "bars") {
    renderSlotBarCharts(main, split);
  } else if (layoutId === "lines") {
    renderFamilyLineCharts(main, split);
  } else {
    const svgMain = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    drawMultiHorizontalCompareChart(svgMain, {
      labels: troopLabels,
      series,
      title: metricLabel,
      yAxisLabel: metricLabel,
      formatValue: formatVal,
      showBarValues: true,
      width: computeReadableChartWidth(containerW, layoutId, troopLabels),
    });
    main.append(svgMain);
  }

  const costWrap = $("#compare-chart-cost");
  costWrap.innerHTML = "";
  if (compact) {
    renderMobileCostCompare(costWrap, tribes, colors);
  } else {
    const capCost = document.createElement("p");
    capCost.className = "chart-caption muted";
    capCost.textContent =
      "Training resources (wood / clay / iron / crop) — hover a stack for the exact split";
    costWrap.append(capCost);

    // A chief costs about 140,000 and a legionnaire about 400. On one scale the
    // whole army flattens into a line along the axis, so the settlers and
    // chiefs get their own panel and the army gets a scale it can use.
    const EXPANSION_ROLES = new Set(["chief", "settler"]);
    const groups = [
      {
        title: "Army units — training resources (W / C / I / Cr)",
        indices: data.roster.map((_, i) => i).filter((i) => !EXPANSION_ROLES.has(data.roster[i].role)),
      },
      {
        title: "Expansion — training resources (W / C / I / Cr)",
        indices: data.roster.map((_, i) => i).filter((i) => EXPANSION_ROLES.has(data.roster[i].role)),
      },
    ].filter((g) => g.indices.length);

    for (const group of groups) {
      const svgCost = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      drawMultiCostStackChart(svgCost, {
        width: computeChartWidth(
          group.indices.map((i) => troopLabels[i]),
          containerW
        ),
        height: Math.min(480, 340 + tribes.length * 16),
        title: group.title,
        series: tribes.map((t, i) => ({ name: t.name, color: colors[i] })),
        slots: group.indices.map((i) => ({
          label: slotCategoryLabel(i),
          unitNames: slotUnitNames(tribes, i),
          costs: tribes.map((t) => t.troops[i].cost),
          totals: tribes.map((t) => t.troops[i].totalCost),
        })),
      });
      costWrap.append(svgCost);
    }
  }
}

/**
 * The grid every small-multiple layout sits in.
 *
 * The column count is decided here and handed to CSS rather than the other way
 * round: if auto-fit picked its own number the SVGs, which are drawn at a fixed
 * width, would be scaled to fit it and their text would shrink with them —
 * which is the opposite of why these layouts exist. Measure the panel we are
 * about to fill, not the wrapper around it, or every chart comes out wider than
 * the column it lands in.
 */
function smallMultiplesGrid(host, { compact, minChartW, maxPerRow }) {
  const gap = 12;
  const cardChrome = 10; // 1px border + 4px padding a side; see .compare-slot-card
  const style = getComputedStyle(host);
  const avail = Math.max(
    240,
    (host.clientWidth || window.innerWidth || 360) -
      (parseFloat(style.paddingLeft) || 0) -
      (parseFloat(style.paddingRight) || 0)
  );
  const perRow = compact ? 1 : Math.max(1, Math.min(maxPerRow, Math.floor(avail / minChartW)));
  const grid = document.createElement("div");
  grid.className = "compare-slot-grid";
  grid.style.gridTemplateColumns = `repeat(${perRow}, minmax(0, 1fr))`;
  return {
    grid,
    chartW: Math.max(240, Math.floor((avail - gap * (perRow - 1)) / perRow) - cardChrome),
  };
}

function appendChartCard(grid, svg) {
  const card = document.createElement("div");
  card.className = "compare-slot-card";
  card.append(svg);
  grid.append(card);
}

function finishSmallMultiples(host, grid, metric) {
  if (!grid.children.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = `No unit has a ${metric.label.toLowerCase()} value to chart.`;
    host.append(empty);
    return;
  }
  host.append(grid);
}

/**
 * One chart per troop slot, tribes along each x-axis.
 *
 * Slots where nobody has a number are dropped rather than drawn empty — every
 * scout has zero attack, and eleven charts of which two are blank is worse than
 * nine that all say something.
 */
function renderSlotBarCharts(host, { tribes, series, metric, formatVal, compact }) {
  // Each bar has to stay wide enough to hold a name, so the column count
  // follows how many tribes are on the axis rather than the window alone.
  // Past the point where even one chart per row cannot hold them all, the
  // chart keeps its width and the card scrolls sideways.
  const { grid, chartW } = smallMultiplesGrid(host, {
    compact,
    minChartW: slotBarChartWidth(tribes.length),
    maxPerRow: 3,
  });
  const chartH = Math.max(210, Math.min(300, 190 + tribes.length * 12));

  data.roster.forEach((_, slotIndex) => {
    const bars = series.map((s, si) => ({
      name: tribes[si].name,
      unitName: s.unitNames?.[slotIndex],
      value: s.values[slotIndex] ?? 0,
      color: s.color,
    }));
    if (!bars.some((b) => b.value > 0)) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    drawSlotBarChart(svg, {
      title: slotCategoryLabel(slotIndex),
      bars,
      formatValue: (v, i) => formatVal(v, slotIndex, i),
      width: chartW,
      height: chartH,
    });
    appendChartCard(grid, svg);
  });

  finishSmallMultiples(host, grid, metric);
}

/**
 * The families the line layout splits along.
 *
 * A line is a claim that the x-axis is ordered, so the split has to fall where
 * that claim holds. Infantry I to III and Cavalry I to III are real tiers and a
 * line across them says something true about how a tribe's roster escalates.
 * Drawing one line across all eleven slots does not: it runs a stroke from the
 * catapult to the chieftain, which is a sequence only in the sense that they
 * sit next to each other in the table. Scouts ride with the cavalry because
 * that is where they sit in the roster and, in most tribes, what they are.
 */
const TROOP_FAMILIES = [
  { title: "Infantry", roles: ["infantry"] },
  { title: "Scouts & cavalry", roles: ["scout", "cavalry"] },
  { title: "Siege", roles: ["siege"] },
  { title: "Expansion", roles: ["chief", "settler"] },
];

function troopFamilyGroups() {
  const claimed = new Set();
  const groups = [];
  for (const family of TROOP_FAMILIES) {
    const indices = data.roster
      .map((slot, i) => (family.roles.includes(slot.role) ? i : -1))
      .filter((i) => i >= 0);
    if (!indices.length) continue;
    for (const i of indices) claimed.add(i);
    groups.push({ title: family.title, indices });
  }
  const rest = data.roster.map((_, i) => i).filter((i) => !claimed.has(i));
  if (rest.length) groups.push({ title: "Other units", indices: rest });
  return groups;
}

/** One line chart per troop family, a line per tribe across that family's tiers. */
function renderFamilyLineCharts(host, { tribes, series, metric, formatVal, compact }) {
  const { grid, chartW } = smallMultiplesGrid(host, {
    compact,
    minChartW: 360,
    maxPerRow: 2,
  });

  for (const group of troopFamilyGroups()) {
    const groupSeries = series.map((s) => ({
      name: s.name,
      color: s.color,
      values: group.indices.map((i) => s.values[i] ?? 0),
      unitNames: group.indices.map((i) => s.unitNames?.[i]),
    }));
    if (!groupSeries.some((s) => s.values.some((v) => v > 0))) continue;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    drawMultiLineCompareChart(svg, {
      labels: group.indices.map((i) => slotCategoryLabel(i)),
      series: groupSeries,
      title: group.title,
      formatValue: (v, i, si) => formatVal(v, group.indices[i], si),
      width: chartW,
      minGroupWidth: compact ? 52 : undefined,
      height: Math.max(160, 140 + tribes.length * 8),
    });
    appendChartCard(grid, svg);
  }

  finishSmallMultiples(host, grid, metric);
}

/** Slot-by-slot cost bars — readable on narrow screens without shrinking SVG text. */
function renderMobileCostCompare(container, tribes, colors) {
  const capCost = document.createElement("p");
  capCost.className = "chart-caption muted";
  capCost.textContent = "Training cost by unit (total resources) — tap scroll to compare slots";
  container.append(capCost);

  const list = document.createElement("div");
  list.className = "compare-cost-mobile";

  data.roster.forEach((slot, i) => {
    const totals = tribes.map((t) => Number(t.troops[i]?.totalCost) || 0);
    const maxCost = Math.max(1, ...totals);
    const card = document.createElement("article");
    card.className = "compare-cost-mobile-card";
    const unitNames = slotUnitNames(tribes, i);
    card.innerHTML = `
      <header class="compare-cost-mobile-head">
        <strong>${slotCategoryLabel(i)}</strong>
        <span class="role-badge">${slot.role}</span>
        <span class="muted">Slot ${slot.slot}</span>
      </header>
      <div class="compare-cost-mobile-rows">
        ${tribes
          .map((t, ti) => {
            const total = totals[ti];
            const pct = Math.round((total / maxCost) * 100);
            return `<div class="compare-cost-mobile-row">
              <span class="compare-cost-mobile-name" style="color:${colors[ti]}">
                <span class="compare-cost-mobile-unit">${unitNames[ti]}</span>
                <span class="compare-cost-mobile-tribe">${t.name}</span>
              </span>
              <div class="compare-cost-mobile-track" role="presentation">
                <div class="compare-cost-mobile-fill" style="width:${pct}%;background:${colors[ti]}"></div>
              </div>
              <strong class="compare-cost-mobile-val">${total.toLocaleString()}</strong>
            </div>`;
          })
          .join("")}
      </div>
    `;
    list.append(card);
  });

  container.append(list);
}

function renderCompareTable(tribes) {
  const thead = $("#compare-thead");
  if (!thead) return;

  const tribeHeaders = tribes
    .map(
      (t, i) =>
        `<th class="compare-tribe-col" style="${tribeColorVarStyle(t)}">${t.name}</th>`
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
          return `<td class="compare-tribe-cell ${atkBest || defBest ? "compare-cell-best" : ""}" style="${tribeColorVarStyle(t)}">
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
  const effective = effectiveCompareChartLayout();
  sel.innerHTML = CHART_LAYOUTS.map(
    (l) =>
      `<option value="${l.id}"${l.id === effective ? " selected" : ""}>${l.name}</option>`
  ).join("");
  if (!compareChartLayoutBound) {
    sel.addEventListener("change", () => {
      compareChartLayout = sel.value;
      compareChartLayoutUserPicked = true;
      if (compareMode && compareViewMode === "charts") renderCompareCharts();
    });
    compareChartLayoutBound = true;
  }
}

const SMITHY_STORAGE_KEY = "tevel-smithy-level";

function clampSmithyLevel(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(SMITHY_MAX_LEVEL, Math.max(0, n));
}

function setSmithyLevel(level) {
  const next = clampSmithyLevel(level);
  if (next === smithyLevel) return;
  smithyLevel = next;
  // Both caches are keyed on the level, but the radar yardsticks are also
  // rebuilt from the upgraded roster, so they have to go with it.
  slotScaleCache = null;
  try {
    localStorage.setItem(SMITHY_STORAGE_KEY, String(smithyLevel));
  } catch {
    /* ignore */
  }
  if (compareMode) renderCompare();
}

function renderSmithyControl() {
  const host = $("#compare-smithy");
  if (!host) return;
  host.classList.remove("hidden");

  const range = $("#smithy-level");
  if (range && Number(range.value) !== smithyLevel) range.value = String(smithyLevel);
  const out = $("#smithy-level-out");
  if (out) out.textContent = `Level ${smithyLevel}`;
  host.classList.toggle("active", smithyLevel > 0);
  for (const btn of host.querySelectorAll("[data-smithy-level]")) {
    btn.classList.toggle("active", Number(btn.dataset.smithyLevel) === smithyLevel);
  }

  const note = $("#smithy-note");
  if (note) {
    // Measured against base stats, not the upgraded ones already on screen.
    const base = compareTribeIds.map((id) => tribeById(id)).filter(Boolean);
    const gain = smithyGainRange(base, smithyLevel);
    note.textContent = gain
      ? `Attack and both defence values rise by ${pct(gain.min)}–${pct(gain.max)}. The gain scales with a unit's crop upkeep measured against the stat itself, so a catapult's small cavalry defence gains far more than a heavy horseman's attack. Speed, carry, cost and training time are unchanged.`
      : "Base values, no upgrades. Raising the level improves attack and both defence values; the gain scales with each unit's crop upkeep, so a small stat on a hungry unit improves most.";
  }
}

function pct(fraction) {
  return `${Math.round(fraction * 100)}%`;
}

function bindSmithyControl() {
  const range = $("#smithy-level");
  range?.addEventListener("input", () => setSmithyLevel(range.value));
  for (const btn of document.querySelectorAll("[data-smithy-level]")) {
    btn.addEventListener("click", () => setSmithyLevel(btn.dataset.smithyLevel));
  }
  try {
    const stored = localStorage.getItem(SMITHY_STORAGE_KEY);
    if (stored != null) smithyLevel = clampSmithyLevel(stored);
  } catch {
    /* ignore */
  }
}

function renderCompare() {
  const tribes = getCompareTribes();
  const hint = $("#compare-picker-hint");

  if (tribes.length < COMPARE_MIN_TRIBES) {
    hint?.classList.remove("hidden");
    $("#compare-table-wrap")?.classList.add("hidden");
    $("#compare-graphs-wrap")?.classList.add("hidden");
    $("#compare-charts-wrap")?.classList.add("hidden");
    $("#compare-smithy")?.classList.add("hidden");
    renderCompareLegend([]);
    renderCompareSummary([]);
    return;
  }
  hint?.classList.add("hidden");
  setCompareColumnCount(tribes.length);

  renderCompareLegend(tribes);
  renderSmithyControl();
  renderCompareSummary(tribes);

  $("#compare-table-wrap")?.classList.toggle("hidden", compareViewMode !== "table");
  $("#compare-graphs-wrap")?.classList.toggle("hidden", compareViewMode !== "graphs");
  $("#compare-charts-wrap")?.classList.toggle("hidden", compareViewMode !== "charts");

  if (compareViewMode === "graphs") renderCompareGraphs();
  if (compareViewMode === "charts") renderCompareCharts();
  if (compareViewMode === "table") renderCompareTable(tribes);

  const names = formatCompareTribeList(tribes);
  $("#tribe-name").textContent = "Tribe comparison";
  $("#tribe-theme").textContent = `${tribes.length} tribes — ${names}`;
}

function showCompare() {
  compareMode = true;
  syncCompareCompactAttr();
  if (!compareChartLayoutUserPicked) applyCompactChartLayoutDefault();
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

function hideAuxViews() {
  compareMode = false;
  $("#view-single").classList.remove("hidden");
  $("#view-compare").classList.add("hidden");
  $("#btn-compare").textContent = "Compare tribes";
  $("#topbar .view-tabs")?.classList.remove("hidden");
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
      if (editMode) livePreviewEdits();
      const tribe = tribeById(activeTribeId);
      if (tribe) renderTroops(tribe);
    });
  });
}

function bindUi() {
  bindSmithyControl();
  document.querySelectorAll(".view-tab[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (editMode && btn.dataset.view !== "table") {
        toast("Finish or cancel edit before switching views");
        return;
      }
      setView(btn.dataset.view);
    });
  });

  document.querySelectorAll("[data-compare-mode]").forEach((btn) => {
    btn.addEventListener("click", () => setCompareMode(btn.dataset.compareMode));
  });

  document.querySelectorAll("[data-stat-display]").forEach((btn) => {
    btn.addEventListener("click", () => setStatDisplayMode(btn.dataset.statDisplay));
  });

  bindStatNormalize();

  $("#unit-filter")?.addEventListener("input", () => {
    if (editMode) livePreviewEdits();
    const tribe = tribeById(activeTribeId);
    if (tribe) renderTroops(tribe);
  });

  $("#btn-compare")?.addEventListener("click", () => {
    if (!data?.tribes?.length) return;
    if (editMode) {
      if (!confirm("Discard unsaved tribe edits and open compare?")) return;
      exitEditMode(true);
    }
    if (compareMode) selectTribe(activeTribeId || data.tribes[0].id);
    else showCompare();
  });

  $("#btn-refresh")?.addEventListener("click", () => rebuildData($("#btn-refresh")));

  const startEdit = () => enterEditMode();
  const cancelEdit = () => exitEditMode(true);
  const saveEdit = () => commitEditMode();

  $("#btn-edit-tribe-menu")?.addEventListener("click", startEdit);
  $("#btn-save-tribe-menu")?.addEventListener("click", saveEdit);
  $("#btn-cancel-edit-menu")?.addEventListener("click", cancelEdit);
  $("#btn-cancel-edit")?.addEventListener("click", cancelEdit);
  $("#btn-save-tribe")?.addEventListener("click", saveEdit);
  $("#edit-author")?.addEventListener("change", () => {
    const el = /** @type {HTMLInputElement | null} */ ($("#edit-author"));
    if (el?.value?.trim()) localStorage.setItem("tevel-edit-author", el.value.trim());
  });
  $("#edit-tribe-name")?.addEventListener("change", () => livePreviewEdits());
  $("#edit-tribe-name")?.addEventListener("input", () => livePreviewEdits());
  $("#edit-tribe-theme")?.addEventListener("change", () => livePreviewEdits());
  $("#edit-hero-name")?.addEventListener("change", () => livePreviewEdits());
  $("#edit-hero-name")?.addEventListener("input", () => livePreviewEdits());
  $("#edit-tribe-primary")?.addEventListener("input", () => livePreviewEdits());
  $("#edit-tribe-secondary")?.addEventListener("input", () => livePreviewEdits());

  bindTribeNav();
  bindCompareCompactViewport();
}

function bindCompareCompactViewport() {
  syncCompareCompactAttr();
  applyCompactChartLayoutDefault();
  if (!window.matchMedia) return;
  compareCompactMq = window.matchMedia(COMPARE_COMPACT_MQ);
  const onChange = () => {
    const was = document.documentElement.dataset.compareCompact;
    const now = syncCompareCompactAttr() ? "1" : "0";
    if (!compareChartLayoutUserPicked) applyCompactChartLayoutDefault();
    bindCompareChartLayout();
    if (was === now && !compareMode) return;
    if (compareMode) renderCompare();
  };
  if (compareCompactMq.addEventListener) compareCompactMq.addEventListener("change", onChange);
  else compareCompactMq.addListener?.(onChange);

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      scheduleTribeNavOverflow();
      const was = document.documentElement.dataset.compareCompact;
      const now = syncCompareCompactAttr() ? "1" : "0";
      if (was !== now && !compareChartLayoutUserPicked) {
        applyCompactChartLayoutDefault();
        bindCompareChartLayout();
        if (compareMode) renderCompare();
        return;
      }
      if (compareMode && compareViewMode === "charts") renderCompareCharts();
    }, 120);
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
  for (const path of ["/api/status", "api/status"]) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) continue;
      const body = await res.json().catch(() => ({}));
      if (body.mode === "netlify" || body.writable === false) {
        el.textContent = "Netlify — Add tribe is session-only";
        el.className = "server-status ok";
        return { ok: true, mode: "netlify", writable: false };
      }
      if (body?.game === "Tevel") {
        el.textContent = "Applet connected";
        el.className = "server-status ok";
        return { ok: true, mode: "applet", writable: true };
      }
    } catch {
      /* try next path */
    }
  }
  el.textContent = isStandaloneDisplay()
    ? "Installed app — offline OK"
    : "PWA / static mode — viewing cached data";
  el.className = "server-status";
  return { ok: false, mode: "static", writable: false };
}

/**
 * Writable applet → disk. Netlify → browser session localStorage.
 * @param {{ ok?: boolean, writable?: boolean, mode?: string }} apiStatus
 */
function configureTribeStorage(apiStatus) {
  apiWritable = Boolean(apiStatus?.ok && apiStatus.writable);
  setSessionStoreEnabled(Boolean(apiStatus?.ok) && !apiWritable);
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
  // --accent-mark is derived from the theme's surface, so it has to be redone
  // whenever the surface changes.
  if (tribe?.palette?.primary) setAccent(tribe.palette.primary);
  if (activeView === "radar" && tribe) renderRadarView(tribe);
  if (!compareMode) return;
  // Tribe colors are adapted to the theme background at render time, so the
  // whole compare view (picker dots, labels, tables) has to be redrawn.
  renderCompareTribePicker();
  renderCompare();
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
  registerServiceWorker();
  bindUi();
  initUiTheme();

  const apiStatus = await setServerStatus();
  serverHasApi = Boolean(apiStatus.ok);
  configureTribeStorage(apiStatus);
  showInstallHint(serverHasApi);
  setAddTribeEnabled(serverHasApi);
  initAddTribeUi(
    toast,
    async (tribeId, dashboardTribe) => {
      if (dashboardTribe) {
        window.__tevelPendingTribe = dashboardTribe;
        data = mergeTribeIntoData(data || { tribes: [] }, dashboardTribe);
      }
      try {
        await loadData();
      } catch (e) {
        // Keep the just-created tribe visible even if data.json rebuild lagged.
        if (dashboardTribe) {
          data = mergeTribeIntoData(data || { tribes: [] }, dashboardTribe);
        } else {
          throw e;
        }
      }
      recomputeGlobalScales();
      selectTribe(tribeId);
      await refreshRemovableTribes();
    },
    async (removedId) => {
      if (removedId) removeSessionTribe(removedId);
      await loadData();
      recomputeGlobalScales();
      const fallback = data?.tribes?.[0]?.id;
      if (fallback) selectTribe(fallback);
      else renderNav();
    }
  );
  if (serverHasApi) await refreshRemovableTribes();

  if (!serverHasApi) {
    const refresh = $("#btn-refresh");
    if (refresh) {
      refresh.disabled = true;
      refresh.title = "Needs the local applet (npm start) to rebuild JSON";
      refresh.textContent = "Rebuild (applet only)";
    }
  }

  try {
    await loadData();
    recomputeGlobalScales();
    bindStatNormalize();
    bindSort();
    mountThemePicker($("#theme-picker"), onUiThemeChange);
    mountGraphPalettePicker($("#graph-palette-picker"), onGraphPaletteChange);
    selectTribe(data.tribes[0].id);
    if (!serverHasApi) {
      $("#btn-refresh").textContent = "Rebuild (needs applet)";
    } else if (apiStatus.mode === "netlify") {
      $("#btn-refresh").textContent = "Rebuild (via GitHub deploy)";
    }
    if (location.protocol === "file:") {
      toast("Loaded from disk — use npm start or the installed PWA for full features.");
    } else if (apiStatus.mode === "netlify") {
      toast("Netlify mode — Add/Edit tribe saves in this browser session only.");
    }
  } catch (e) {
    showLoadError(e, serverHasApi);
  }
}

init().catch((e) => showLoadError(e, false));
