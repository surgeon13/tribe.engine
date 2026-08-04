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
 * Resolve SVG troop logo path (tribe override → tribe catalog → base default → global default).
 * @param {string} tribeId
 * @param {string} ref
 * @param {object} [overrides]
 * @param {object} [baseGraphics]
 * @param {{ defaults?: Record<string, string>, tribes?: Record<string, Record<string, string>> }} [logoData]
 */
export function resolveUnitLogo(tribeId, ref, overrides = {}, baseGraphics = {}, logoData = {}) {
  if (overrides.logo) return overrides.logo;
  if (baseGraphics.logo) return baseGraphics.logo;
  const tribeMap = logoData.tribes?.[tribeId];
  if (tribeMap?.[ref]) return tribeMap[ref];
  return logoData.defaults?.[ref] || null;
}

/**
 * @param {string} tribeId
 * @param {string} ref
 * @param {object} [overrides]
 * @param {object} [baseGraphics]
 * @param {{ defaults?: Record<string, string>, tribes?: Record<string, Record<string, string>> }} [logoData]
 */
export function resolveUnitGraphics(tribeId, ref, overrides = {}, baseGraphics = {}, logoData = {}) {
  const stem = REF_GRAPHIC_FILE[ref] || ref;
  const sprite =
    overrides.sprite ||
    `tribes/${tribeId}/units/${stem}.png`;
  const icon =
    overrides.icon ||
    `tribes/${tribeId}/units/${stem}_icon.png`;
  const logo = resolveUnitLogo(tribeId, ref, overrides, baseGraphics, logoData);

  return {
    sprite,
    icon,
    logo,
    portrait: overrides.portrait,
    baseSprite: baseGraphics.sprite,
    baseIcon: baseGraphics.icon,
    baseLogo: baseGraphics.logo,
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
