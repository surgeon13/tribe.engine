/** Dashboard UI themes + graph color palettes. */

export const UI_THEMES = {
  dark: { name: "Dark", description: "Default dark workspace" },
  light: { name: "Light", description: "Bright, high-contrast light" },
  sand: { name: "Sand", description: "Warm parchment (recommended)" },
  slate: { name: "Slate", description: "Cool blue-grey dark" },
  dusk: { name: "Dusk", description: "Soft purple twilight dark" },
};

export const GRAPH_PALETTES = {
  classic: { name: "Classic", description: "Gold & teal — strong on any background" },
  sand: { name: "Sand", description: "Amber & wine — pairs with Sand UI" },
  ocean: { name: "Ocean", description: "Blue & coral — vivid on dark UI" },
  grove: { name: "Grove", description: "Green & honey — natural contrast" },
  vivid: { name: "Vivid", description: "Purple & pink — maximum pop" },
};

const THEME_KEY = "tevel-ui-theme";
const GRAPH_KEY = "tevel-graph-palette";
const DEFAULT_THEME = "dark";
const DEFAULT_GRAPH = "classic";

/**
 * @returns {keyof typeof UI_THEMES}
 */
export function getStoredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved && saved in UI_THEMES) return saved;
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return DEFAULT_THEME;
}

/**
 * @returns {keyof typeof GRAPH_PALETTES}
 */
export function getStoredGraphPalette() {
  const saved = localStorage.getItem(GRAPH_KEY);
  if (saved && saved in GRAPH_PALETTES) return saved;
  return DEFAULT_GRAPH;
}

/**
 * @param {string} themeId
 */
export function applyUiTheme(themeId) {
  const id = themeId in UI_THEMES ? themeId : DEFAULT_THEME;
  document.documentElement.dataset.uiTheme = id;
  localStorage.setItem(THEME_KEY, id);
  return id;
}

/**
 * @param {string} paletteId
 */
export function applyGraphPalette(paletteId) {
  const id = paletteId in GRAPH_PALETTES ? paletteId : DEFAULT_GRAPH;
  document.documentElement.dataset.graphPalette = id;
  localStorage.setItem(GRAPH_KEY, id);
  return id;
}

const COMPARE_SERIES_EXTRA = [
  "#e05a5a",
  "#66c888",
  "#c77dff",
  "#ff7a58",
  "#8b6914",
  "#6b9b37",
  "#7a6b99",
  "#2d7a52",
  "#4da3ff",
  "#ff6bcb",
];

/** Distinct colors for N tribes in compare charts (palette + tribe primaries). */
export function getCompareSeriesColors(count, tribes = []) {
  const chart = getChartColors();
  const pool = [chart.a, chart.b, chart.aDim, chart.bDim, ...COMPARE_SERIES_EXTRA];
  const used = new Set();
  const out = [];
  for (let i = 0; i < count; i++) {
    let color = tribes[i]?.palette?.primary;
    if (!color || used.has(color.toLowerCase?.() ? color.toLowerCase() : color)) {
      color = pool[i % pool.length];
    }
    used.add(color);
    out.push(color);
  }
  return out;
}

/** Tribe A / B colors for charts and stat bars (readable, not raw tribe hex). */
export function getChartColors() {
  const s = getComputedStyle(document.documentElement);
  const v = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
  return {
    a: v("--chart-color-a", "#e8b84a"),
    b: v("--chart-color-b", "#3eb8c8"),
    aDim: v("--chart-color-a-dim", "#c9942e"),
    bDim: v("--chart-color-b-dim", "#2a8f9c"),
  };
}

/** Pick bar gradient colors: tribe tint when viewing one faction, chart palette in compare. */
export function resolveBarColors(tribePalette, mode = "chart") {
  const chart = getChartColors();
  if (mode === "tribe" && tribePalette?.primary) {
    return {
      primary: tribePalette.primary,
      secondary: tribePalette.secondary || chart.b,
    };
  }
  return { primary: chart.a, secondary: chart.b };
}

/** Read theme-aware colors for SVG radar (from CSS variables). */
export function getRadarChromeColors() {
  const s = getComputedStyle(document.documentElement);
  const v = (name) => s.getPropertyValue(name).trim();
  return {
    radarBg: v("--radar-bg") || "#0a0c10",
    grid: v("--radar-grid") || "rgba(255,255,255,0.08)",
    axis: v("--radar-axis") || "rgba(255,255,255,0.12)",
    label: v("--radar-label") || "rgba(255,255,255,0.65)",
    ovrBg: v("--radar-ovr-bg") || "rgba(0,0,0,0.65)",
    ovrText: v("--radar-ovr-text") || "#fff",
    title: v("--radar-title") || "rgba(255,255,255,0.85)",
  };
}

function mountSelectPicker(container, config) {
  if (!container) return null;
  container.innerHTML = "";
  const label = document.createElement("label");
  label.className = config.labelClass;
  label.htmlFor = config.selectId;

  const span = document.createElement("span");
  span.className = "theme-picker-label";
  span.textContent = config.labelText;

  const select = document.createElement("select");
  select.id = config.selectId;
  select.className = "theme-select";

  for (const [id, meta] of Object.entries(config.options)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = meta.name;
    opt.title = meta.description;
    select.append(opt);
  }

  select.value = config.getValue();
  select.addEventListener("change", () => {
    const id = config.apply(select.value);
    config.onChange?.(id);
  });

  label.append(span, select);
  container.append(label);
  return select;
}

/**
 * @param {HTMLElement} container
 * @param {(id: string) => void} onChange
 */
export function mountThemePicker(container, onChange) {
  return mountSelectPicker(container, {
    labelClass: "theme-picker",
    labelText: "Appearance",
    selectId: "ui-theme-select",
    options: UI_THEMES,
    getValue: getStoredTheme,
    apply: applyUiTheme,
    onChange,
  });
}

/**
 * @param {HTMLElement} container
 * @param {(id: string) => void} onChange
 */
export function mountGraphPalettePicker(container, onChange) {
  return mountSelectPicker(container, {
    labelClass: "theme-picker graph-palette-picker",
    labelText: "Graph colors",
    selectId: "graph-palette-select",
    options: GRAPH_PALETTES,
    getValue: getStoredGraphPalette,
    apply: applyGraphPalette,
    onChange,
  });
}

export function initUiTheme(onChange) {
  applyGraphPalette(getStoredGraphPalette());
  const id = applyUiTheme(getStoredTheme());
  onChange?.(id);
  return id;
}
