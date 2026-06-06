/** Unit portraits and tribe banners for compare / roster views. */

import { buildViewMetrics } from "./metrics-normalize.js";
import { mountStatBars } from "./radar.js";

/**
 * @param {string} name
 */
export function unitInitials(name) {
  const parts = String(name || "?").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) || "?").toUpperCase();
}

/**
 * @param {HTMLElement} el
 * @param {string | null} url
 * @param {{ primary?: string, secondary?: string, label?: string, alt?: string }} opts
 */
export function mountPortrait(el, url, opts = {}) {
  el.innerHTML = "";
  el.className = "unit-portrait";
  el.style.setProperty("--portrait-a", opts.primary || "#666");
  el.style.setProperty("--portrait-b", opts.secondary || "#999");

  const img = document.createElement("img");
  img.alt = opts.alt || opts.label || "Unit";
  img.loading = "lazy";
  img.decoding = "async";

  const fallback = document.createElement("span");
  fallback.className = "unit-portrait-fallback";
  fallback.textContent = unitInitials(opts.label);

  if (url) {
    img.src = url;
    img.onerror = () => {
      el.classList.add("no-img");
    };
    el.append(img, fallback);
  } else {
    el.classList.add("no-img");
    el.append(fallback);
  }
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
  mountPortrait(portrait, unit.graphicsUrls?.icon || unit.graphicsUrls?.sprite, {
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
