/** Roster slot → default tribe sprite filenames (see data/tribes/_template.json). */
export const REF_GRAPHIC_FILE = {
  inf_t1: "01_infantry",
  inf_t2: "02_infantry",
  inf_t3: "03_infantry",
  scout: "04_scout",
  cav_t1: "05_cavalry",
  cav_t2: "06_cavalry",
  cav_t3: "07_cavalry",
  ram: "08_ram",
  catapult: "09_catapult",
  chief: "10_chief",
  settler: "11_settler",
};

/**
 * @param {string} tribeId
 * @param {string} ref
 * @param {object} [overrides]
 * @param {object} [baseGraphics]
 */
export function resolveUnitGraphics(tribeId, ref, overrides = {}, baseGraphics = {}) {
  const stem = REF_GRAPHIC_FILE[ref] || ref;
  const sprite =
    overrides.sprite ||
    `tribes/${tribeId}/units/${stem}.png`;
  const icon =
    overrides.icon ||
    `tribes/${tribeId}/units/${stem}_icon.png`;

  return {
    sprite,
    icon,
    portrait: overrides.portrait,
    baseSprite: baseGraphics.sprite,
    baseIcon: baseGraphics.icon,
  };
}

/**
 * @param {string} assetBase e.g. "/assets"
 * @param {string} relPath
 */
export function assetUrl(assetBase, relPath) {
  if (!relPath) return null;
  const clean = relPath.replace(/^\/+/, "");
  return `${assetBase}/${clean}`;
}
