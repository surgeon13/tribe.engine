/** Unit portraits, SVG troop logos, and tribe banners for compare / roster views. */

import { adaptToBackground, MIN_GRAPHIC_CONTRAST } from "./color.js";
import { buildViewMetrics } from "./metrics-normalize.js";
import { mountStatBars } from "./radar.js";

const svgCache = new Map();

/** Tribe unit PNG paths are templates — not shipped in assets; avoid broken <img> fallbacks. */
const PLACEHOLDER_RASTER_RE = /\/tribes\/[^/]+\/units\//;

/**
 * Resolve relative asset URLs against the page (PWA / subdirectory safe).
 * @param {string} url
 */
export function resolveAssetUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  try {
    return new URL(url, document.baseURI || window.location.href).href;
  } catch {
    return url;
  }
}

/**
 * @param {string | null | undefined} url
 */
export function isPlaceholderTroopRaster(url) {
  return !url || PLACEHOLDER_RASTER_RE.test(url);
}

/**
 * @param {object} unit
 * @param {object} [palette]
 * @param {{ size?: "sm" | "md" }} [extra]
 */
export function portraitOptsFromUnit(unit, palette, extra = {}) {
  const gfx = unit.graphicsUrls || {};
  const logoUrl = gfx.logo || null;
  const baseLogoUrl =
    gfx.baseLogo && gfx.baseLogo !== logoUrl ? gfx.baseLogo : null;
  const iconCandidate = gfx.icon || gfx.sprite || gfx.portrait || null;
  let iconUrl = null;
  if (!logoUrl && !baseLogoUrl) {
    iconUrl = iconCandidate;
  } else if (iconCandidate && !isPlaceholderTroopRaster(iconCandidate)) {
    iconUrl = iconCandidate;
  }
  return {
    logoUrl,
    baseLogoUrl,
    iconUrl,
    primary: palette?.primary,
    secondary: palette?.secondary,
    label: unit.name,
    alt: unit.name,
    ...extra,
  };
}

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
 * Handles tiles with or without an explicit fill (newer game-icons exports omit fill="#000").
 * @param {string} svgText
 */
export function prepareSvgForTint(svgText) {
  const tinted = svgText
    .replace(/<path\b([^>]*\bd="M0 0h512v512H0z"[^>/]*)(\/)?>/gi, (_, attrs, selfClose) => {
      const cleaned = attrs
        .replace(/\sfill="[^"]*"/gi, "")
        .replace(/\sfill-opacity="[^"]*"/gi, "")
        .replace(/\sclass="[^"]*"/gi, "");
      return selfClose
        ? `<path${cleaned} class="troop-logo-bg"></path>`
        : `<path${cleaned} class="troop-logo-bg">`;
    })
    .replace(
      /(<path\b[^>]*?)\sfill="#fff(?:fff)?"(?:\s+fill-opacity="[^"]*")?/gi,
      "$1 class=\"troop-logo-fg\"",
    )
    .replace(
      /(<path\b[^>]*?)\sfill="white"(?:\s+fill-opacity="[^"]*")?/gi,
      "$1 class=\"troop-logo-fg\"",
    )
    .replace(/<svg\b/, '<svg class="troop-logo-svg"');

  // Self-closing <path /> breaks when SVG is injected via innerHTML on a div (HTML parser).
  return tinted.replace(/<path\b([^>]*)\/>/gi, "<path$1></path>");
}

const SHAPE_SELECTOR = "path, rect, circle, ellipse, polygon, polyline";

/**
 * Game-Icons ship two export styles (with/without an explicit background fill and
 * inline pixel size). Normalize geometry so every icon scales to its container
 * identically instead of inheriting the source file's own width/height.
 * @param {SVGSVGElement} svg
 */
function normalizeLogoSvg(svg) {
  if (!svg.getAttribute("viewBox")) {
    const w = parseFloat(svg.getAttribute("width") || "512") || 512;
    const h = parseFloat(svg.getAttribute("height") || "512") || 512;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.removeAttribute("style");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("troop-logo-svg");
  return svg;
}

/**
 * Full-canvas background tile, written either as a path rect or a <rect>.
 * @param {Element} node
 */
function isCanvasTile(node) {
  if (node.tagName.toLowerCase() === "rect") {
    const w = parseFloat(node.getAttribute("width") || "0");
    const h = parseFloat(node.getAttribute("height") || "0");
    return w >= 512 && h >= 512;
  }
  const d = (node.getAttribute("d") || "").replace(/[\s,]+/g, "").toLowerCase();
  return d.startsWith("m00h512v512h0z") || d.startsWith("m00l5120l5125120512z");
}

/**
 * Tribes created in the UI can pick any two colors, so lift the glyph off its
 * tile when they are too close instead of drawing a near-solid block.
 * @param {{ primary?: string, secondary?: string }} opts
 */
function logoColors(opts = {}) {
  const bg = opts.secondary || "#333";
  return { bg, fg: adaptToBackground(opts.primary || "#fff", bg, MIN_GRAPHIC_CONTRAST) };
}

/**
 * @param {SVGElement | HTMLElement} root
 * @param {{ primary?: string, secondary?: string }} opts
 */
function applyLogoPalette(root, opts = {}) {
  const { bg, fg } = logoColors(opts);
  const paint = (node, color) => {
    node.setAttribute("fill", color);
    node.style?.setProperty("fill", color, "important");
    node.removeAttribute("fill-opacity");
    node.removeAttribute("opacity");
  };

  // Paint by tile geometry — CSS custom properties often fail to inherit into imported SVG (mobile Safari).
  const shapes = root.querySelectorAll(SHAPE_SELECTOR);
  shapes.forEach((node) => paint(node, isCanvasTile(node) ? bg : fg));
  return shapes.length;
}

/**
 * Parse tinted SVG with the XML parser (innerHTML on a div breaks long path data).
 * @param {string} svgText
 * @returns {SVGSVGElement}
 */
function parseTintedSvg(svgText) {
  const doc = new DOMParser().parseFromString(prepareSvgForTint(svgText), "image/svg+xml");
  const err = doc.querySelector("parsererror");
  if (err) {
    throw new Error(err.textContent?.trim() || "SVG parse error");
  }
  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== "svg") throw new Error("not an SVG document");
  return normalizeLogoSvg(/** @type {SVGSVGElement} */ (svg));
}

/**
 * @param {string} url
 */
async function fetchSvg(url) {
  const resolved = resolveAssetUrl(url);
  if (svgCache.has(resolved)) return svgCache.get(resolved);
  const res = await fetch(resolved, { cache: "default" });
  if (!res.ok) throw new Error(`SVG ${res.status} ${resolved}`);
  const text = await res.text();
  svgCache.set(resolved, text);
  return text;
}

/**
 * @param {HTMLElement} el
 * @param {string} url
 * @param {{ primary?: string, secondary?: string, label?: string, alt?: string }} opts
 */
export async function mountSvgLogo(el, url, opts = {}) {
  el.querySelector(".troop-logo-wrap")?.remove();
  const text = await fetchSvg(url);
  const wrap = document.createElement("div");
  wrap.className = "troop-logo-wrap";
  const { bg, fg } = logoColors(opts);
  wrap.style.setProperty("--logo-bg", bg);
  wrap.style.setProperty("--logo-fg", fg);

  const svg = parseTintedSvg(text);
  if (!applyLogoPalette(svg, opts)) throw new Error(`SVG has no drawable shapes: ${url}`);
  wrap.append(document.importNode(svg, true));

  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", opts.alt || opts.label || "Troop logo");
  el.append(wrap);
}

/**
 * Mount troop portrait: prefers tinted SVG logo, then PNG icon/sprite, then initials.
 * @param {HTMLElement} el
 * @param {{ logoUrl?: string | null, iconUrl?: string | null, primary?: string, secondary?: string, label?: string, alt?: string, size?: "sm" | "md" }} opts
 */
/**
 * @param {HTMLElement} el
 * @param {string[]} urls
 * @param {{ primary?: string, secondary?: string, label?: string, alt?: string }} paint
 */
async function mountFirstSvgLogo(el, urls, paint) {
  for (const url of urls) {
    if (!url) continue;
    try {
      await mountSvgLogo(el, url, paint);
      return true;
    } catch {
      /* try next candidate */
    }
  }
  return false;
}

export function mountPortrait(el, opts = {}) {
  const {
    logoUrl = null,
    baseLogoUrl = null,
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

  const paint = { primary, secondary, label, alt };
  const logoCandidates = [logoUrl, baseLogoUrl].filter(Boolean);

  if (logoCandidates.length) {
    mountFirstSvgLogo(el, logoCandidates, paint).then((ok) => {
      if (ok) {
        el.classList.remove("no-img");
        return;
      }
      el.classList.add("no-img");
      if (iconUrl && !isPlaceholderTroopRaster(iconUrl)) {
        mountRasterPortrait(el, iconUrl, alt || label, fallback);
      }
    });
    return;
  }

  if (iconUrl && !isPlaceholderTroopRaster(iconUrl)) {
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
  img.onload = () => {
    el.classList.remove("no-img");
    el.prepend(img);
  };
  img.onerror = () => el.classList.add("no-img");
  img.src = resolveAssetUrl(url);
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
  mountPortrait(portrait, portraitOptsFromUnit(unit, palette));

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
  mountPortrait(portrait, portraitOptsFromUnit(unit, palette, { size: "sm" }));
  cell.append(portrait);
}
