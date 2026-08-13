/**
 * WCAG color math for tribe palettes.
 *
 * Palette colors are picked by hand (and by whoever creates a tribe in the UI),
 * so every consumer needs a way to ask "will this actually be visible?" —
 * the troop logo paints palette.primary onto a palette.secondary tile, and the
 * UI paints text onto palette.primary as the accent.
 *
 * Plain ESM with no DOM access so the build scripts can import it too.
 */

/** Large shapes (logo glyphs, chart strokes) — WCAG 1.4.11 non-text contrast. */
export const MIN_GRAPHIC_CONTRAST = 3;
/** Body text — WCAG 1.4.3 AA. */
export const MIN_TEXT_CONTRAST = 4.5;

/**
 * @param {string} hex `#rgb` or `#rrggbb`
 * @returns {{ r: number, g: number, b: number } | null}
 */
export function parseHex(hex) {
  if (typeof hex !== "string") return null;
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? [...m].map((c) => c + c).join("") : m;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/**
 * @param {number} channel 0–255
 * @returns {number}
 */
function linearize(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * @param {string} hex
 * @returns {number} 0 (black) – 1 (white), or NaN for unparseable input
 */
export function relativeLuminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return NaN;
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number} 1 (identical) – 21 (black on white), or NaN for bad input
 */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (Number.isNaN(la) || Number.isNaN(lb)) return NaN;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Pick whichever of two ink colors reads better on `background`.
 * @param {string} background
 * @param {string} [dark]
 * @param {string} [light]
 * @returns {string}
 */
export function readableInkOn(background, dark = "#14161a", light = "#f7f9fc") {
  const onDark = contrastRatio(background, dark);
  const onLight = contrastRatio(background, light);
  if (Number.isNaN(onDark) || Number.isNaN(onLight)) return dark;
  return onDark >= onLight ? dark : light;
}

/**
 * CIELAB, for asking "do these two tribes look like the same color?" — RGB
 * distance says yes to pairs the eye separates easily and no to pairs it cannot.
 * @param {string} hex
 * @returns {{ L: number, a: number, b: number } | null}
 */
export function hexToLab(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(linearize);
  // sRGB D65 → XYZ, then normalized against the D65 white point.
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/**
 * CIE76 color difference. Roughly: under ~2.3 is invisible, ~10 is a subtle
 * shade change, over ~30 reads as a different color.
 * @param {string} a
 * @param {string} b
 * @returns {number} NaN for unparseable input
 */
export function deltaE(a, b) {
  const la = hexToLab(a);
  const lb = hexToLab(b);
  if (!la || !lb) return NaN;
  return Math.hypot(la.L - lb.L, la.a - lb.a, la.b - lb.b);
}

/**
 * Hue angle in degrees, plus how colorful the color is. Near-neutral colors
 * (chroma under ~10) have no meaningful hue, so they compare as "neutral".
 * @param {string} hex
 * @returns {{ hue: number, chroma: number, lightness: number } | null}
 */
export function hueOf(hex) {
  const lab = hexToLab(hex);
  if (!lab) return null;
  return {
    hue: (Math.atan2(lab.b, lab.a) * (180 / Math.PI) + 360) % 360,
    chroma: Math.hypot(lab.a, lab.b),
    lightness: lab.L,
  };
}

/**
 * @param {string} hex
 * @returns {{ h: number, s: number, l: number } | null} h 0–360, s/l 0–100
 */
export function hexToHsl(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: s * 100, l: l * 100 };
}

/**
 * @param {number} h 0–360
 * @param {number} s 0–100
 * @param {number} l 0–100
 * @returns {string} `#rrggbb`
 */
export function hslToHex(h, s, l) {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const light = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = light - c / 2;
  const hex = (v) =>
    Math.round(Math.min(1, Math.max(0, v + m)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r1)}${hex(g1)}${hex(b1)}`;
}

/**
 * Shift a color's lightness — keeping its hue, so a tribe still looks like
 * itself — until it is visible against `background`.
 *
 * Tribe palettes are authored for the troop logo, where the primary sits on the
 * secondary tile. The dashboard also paints that same primary as label text and
 * chart strokes over a theme background that ranges from near-black to
 * near-white, which no single hand-picked hex can survive.
 *
 * @param {string} color
 * @param {string} background
 * @param {number} [minRatio]
 * @returns {string} adapted hex, or `color` when it already passes or cannot be parsed
 */
export function adaptToBackground(color, background, minRatio = MIN_GRAPHIC_CONTRAST) {
  const hsl = hexToHsl(color);
  const bgLuminance = relativeLuminance(background);
  if (!hsl || Number.isNaN(bgLuminance)) return color;

  let best = color;
  let bestRatio = contrastRatio(color, background);
  if (bestRatio >= minRatio) return color;

  const towardLight = bgLuminance < 0.5;
  for (let step = 1; step <= 100; step++) {
    const l = towardLight ? hsl.l + step : hsl.l - step;
    const candidate = hslToHex(hsl.h, hsl.s, l);
    const ratio = contrastRatio(candidate, background);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
    if (ratio >= minRatio) return candidate;
    if (l <= 0 || l >= 100) break;
  }
  return best;
}
