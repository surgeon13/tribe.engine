/** Unit portraits, SVG troop logos, and tribe banners for compare / roster views. */

import { buildViewMetrics } from "./metrics-normalize.js";
import { mountStatBars } from "./radar.js";

const svgCache = new Map();

/**
 * @param {string} name
 */
export function unitInitials(name) {
  const parts = String(name || "?").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) || "?").toUpperCase();
}

/**
 * Prepare Game-Icons SVG markup for tribe palette tinting.
 * Black tile → secondary, white glyph → primary.
 * @param {string} svgText
 */
export function prepareSvgForTint(svgText) {
  return svgText
    .replace(
      /(<path[^>]*d="M0 0h512v512H0z"[^>]*)\s*fill="[^"]*"/i,
      '$1 class="troop-logo-bg"'
    )
    .replace(/fill="#fff"/gi, 'class="troop-logo-fg"')
    .replace(/<svg\b/, '<svg class="troop-logo-svg"');
}

/**
 * @param {string} url
 */
async function fetchSvg(url) {
  if (svgCache.has(url)) return svgCache.get(url);
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`SVG ${res.status}`);
  const text = await res.text();
  svgCache.set(url, text);
  return text;
}

/**
 * @param {HTMLElement} el
 * @param {string} url
 * @param {{ primary?: string, secondary?: string, label?: string, alt?: string }} opts
 */
export async function mountSvgLogo(el, url, opts = {}) {
  const text = await fetchSvg(url);
  const wrap = document.createElement("div");
  wrap.className = "troop-logo-wrap";
  wrap.innerHTML = prepareSvgForTint(text);
  wrap.style.setProperty("--logo-bg", opts.secondary || "#333");
  wrap.style.setProperty("--logo-fg", opts.primary || "#fff");
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", opts.alt || opts.label || "Troop logo");
  el.append(wrap);
}

/**
 * Mount troop portrait: prefers tinted SVG logo, then PNG icon/sprite, then initials.
 * @param {HTMLElement} el
 * @param {{ logoUrl?: string | null, iconUrl?: string | null, primary?: string, secondary?: string, label?: string, alt?: string, size?: "sm" | "md" }} opts
 */
export function mountPortrait(el, opts = {}) {
  const {
    logoUrl = null,
    iconUrl = null,
    primary,
    secondary,
    label,
    alt,
    size = "md",
  } = typeof opts === "string" || opts === null
    ? { iconUrl: opts }
    : opts;

  el.innerHTML = "";
  el.className = `unit-portrait unit-portrait--${size}`;
  el.style.setProperty("--portrait-a", primary || "#666");
  el.style.setProperty("--portrait-b", secondary || "#999");

  const fallback = document.createElement("span");
  fallback.className = "unit-portrait-fallback";
  fallback.textContent = unitInitials(label);
  el.append(fallback);

  if (logoUrl) {
    mountSvgLogo(el, logoUrl, { primary, secondary, label, alt })
      .then(() => {
        el.classList.remove("no-img");
      })
      .catch(() => {
        el.classList.add("no-img");
        if (iconUrl) mountRasterPortrait(el, iconUrl, alt || label, fallback);
      });
    return;
  }

  if (iconUrl) {
    mountRasterPortrait(el, iconUrl, alt || label, fallback);
    return;
  }

  el.classList.add("no-img");
}

/**
 * @param {HTMLElement} el
 * @param {string} url
 * @param {string} alt
 * @param {HTMLElement} fallback
 */
function mountRasterPortrait(el, url, alt, fallback) {
  const img = document.createElement("img");
  img.alt = alt || "Unit";
  img.loading = "lazy";
  img.decoding = "async";
  img.src = url;
  img.onerror = () => el.classList.add("no-img");
  img.onload = () => el.classList.remove("no-img");
  el.prepend(img);
  el.append(fallback);
}

/**
 * @param {HTMLElement} container
 * @param {object} tribe
 */
export function renderTribeBanner(container, tribe) {
  container.innerHTML = "";
  const banner = document.createElement("article");
  banner.className = "tribe-banner";
  banner.style.setProperty("--banner-a", tribe.palette?.primary || "#666");
  banner.style.setProperty("--banner-b", tribe.palette?.secondary || "#999");

  const art = document.createElement("div");
  art.className = "tribe-banner-art";
  const img = document.createElement("img");
  img.alt = `${tribe.name} banner`;
  img.loading = "lazy";
  const url = tribe.graphicsUrls?.banner;
  if (url) {
    img.src = url;
    img.onerror = () => art.classList.add("no-img");
    art.append(img);
  } else {
    art.classList.add("no-img");
  }

  const body = document.createElement("div");
  body.className = "tribe-banner-body";
  body.innerHTML = `<h4>${tribe.name}</h4><p class="muted">${tribe.theme || ""}</p>`;

  const swatches = document.createElement("div");
  swatches.className = "tribe-banner-swatches";
  for (const hex of [tribe.palette?.primary, tribe.palette?.secondary].filter(Boolean)) {
    const s = document.createElement("span");
    s.style.background = hex;
    s.title = hex;
    swatches.append(s);
  }

  banner.append(art, body, swatches);
  container.append(banner);
}

/**
 * @param {HTMLElement} container
 * @param {object} unit
 * @param {object} palette
 * @param {Record<string, number>} [maxes]
 * @param {{ showOvr?: boolean }} [opts]
 */
export function renderUnitCard(container, unit, palette, scales, opts = {}) {
  container.innerHTML = "";
  const card = document.createElement("article");
  card.className = "compare-unit-card compare-unit-card--large";

  const top = document.createElement("div");
  top.className = "compare-unit-top";

  const portrait = document.createElement("div");
  mountPortrait(portrait, {
    logoUrl: unit.graphicsUrls?.logo,
    iconUrl: unit.graphicsUrls?.icon || unit.graphicsUrls?.sprite,
    primary: palette?.primary,
    secondary: palette?.secondary,
    label: unit.name,
    alt: unit.name,
  });

  const meta = document.createElement("div");
  meta.className = "compare-unit-meta";
  const m = unit.metrics;
  meta.innerHTML = `
    <span class="role-badge">${unit.role}</span>
    <h4>${unit.name}</h4>
    <p class="compare-unit-keyline">
      <span><b>${m.offense ?? 0}</b> ATK</span>
      <span><b>${m.defenseInfantry ?? 0}</b> DEF-I</span>
      <span><b>${m.defenseCavalry ?? 0}</b> DEF-C</span>
      <span><b>${m.speed ?? 0}</b> SPD</span>
      <span><b>${m.carry ?? 0}</b> CRR</span>
    </p>
  `;

  top.append(portrait, meta);

  const bars = document.createElement("div");
  bars.className = "compare-unit-bars";
  if (scales) {
    const viewMetrics = buildViewMetrics(unit.metrics, scales.normalizeMode || "raw");
    mountStatBars(bars, viewMetrics, scales, palette, { compact: false });
  }

  card.append(top, bars);
  container.append(card);
  return card;
}

/**
 * Compact logo cell for troop tables.
 * @param {HTMLElement} cell
 * @param {object} unit
 * @param {object} palette
 */
export function mountTroopLogoCell(cell, unit, palette) {
  cell.innerHTML = "";
  cell.className = "troop-logo-cell";
  const portrait = document.createElement("div");
  mountPortrait(portrait, {
    logoUrl: unit.graphicsUrls?.logo,
    iconUrl: unit.graphicsUrls?.icon || unit.graphicsUrls?.sprite,
    primary: palette?.primary,
    secondary: palette?.secondary,
    label: unit.name,
    alt: unit.name,
    size: "sm",
  });
  cell.append(portrait);
}
