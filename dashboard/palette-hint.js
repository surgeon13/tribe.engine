/**
 * Live legibility readout for the two color pickers in the add/edit tribe forms.
 *
 * The troop logo paints the primary glyph straight onto a secondary-colored
 * tile, so two colors of similar lightness produce an icon that looks like a
 * solid block. The renderer lifts the glyph off the tile as a last resort, but
 * telling whoever picked the colors is better than silently changing them.
 */

import { contrastRatio, MIN_GRAPHIC_CONTRAST, MIN_TEXT_CONTRAST } from "./color.js";

/**
 * @param {string} primary
 * @param {string} secondary
 * @returns {{ level: "unknown" | "bad" | "warn" | "good", text: string }}
 */
export function describePaletteContrast(primary, secondary) {
  const ratio = contrastRatio(primary, secondary);
  if (Number.isNaN(ratio)) return { level: "unknown", text: "" };
  const label = `${ratio.toFixed(1)}:1`;
  if (ratio < MIN_GRAPHIC_CONTRAST) {
    return {
      level: "bad",
      text: `${label} — too close together; the troop glyph vanishes into its tile. Make one color much brighter or darker.`,
    };
  }
  if (ratio < MIN_TEXT_CONTRAST) {
    return { level: "warn", text: `${label} — visible, but fine detail in the glyph will look soft.` };
  }
  return { level: "good", text: `${label} — glyph reads clearly on its tile.` };
}

/**
 * @param {HTMLInputElement | null} primaryInput
 * @param {HTMLInputElement | null} secondaryInput
 * @param {HTMLElement | null} hintEl
 */
export function mountPaletteContrastHint(primaryInput, secondaryInput, hintEl) {
  if (!primaryInput || !secondaryInput || !hintEl) return () => {};
  const update = () => {
    const { level, text } = describePaletteContrast(primaryInput.value, secondaryInput.value);
    hintEl.dataset.level = level;
    hintEl.textContent = text;
  };
  if (!hintEl.dataset.contrastBound) {
    hintEl.dataset.contrastBound = "1";
    primaryInput.addEventListener("input", update);
    secondaryInput.addEventListener("input", update);
  }
  update();
  return update;
}
