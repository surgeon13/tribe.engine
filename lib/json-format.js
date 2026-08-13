/**
 * JSON writer that keeps stat blocks on one line.
 *
 * Troop tables are read as tables: `{ "attack": 40, "defenseInfantry": 35, ... }`
 * on a single row is scannable and diffs as one line when a unit is retuned,
 * while the same object spread over seven lines hides the shape of the data and
 * turns every balance change into a wall of noise.
 */

const INLINE_LIMIT = 108;

/**
 * @param {unknown} value
 * @returns {boolean} true when the value holds only primitives
 */
function isLeaf(value) {
  if (Array.isArray(value)) return value.every((v) => v === null || typeof v !== "object");
  if (value && typeof value === "object") {
    return Object.values(value).every((v) => v === null || typeof v !== "object");
  }
  return true;
}

/**
 * @param {unknown} value
 * @param {number} indentLevel
 * @returns {string}
 */
function render(value, indentLevel) {
  const pad = "  ".repeat(indentLevel);
  const padInner = "  ".repeat(indentLevel + 1);

  if (value === null || typeof value !== "object") return JSON.stringify(value);

  if (isLeaf(value)) {
    const inline = Array.isArray(value)
      ? `[${value.map((v) => JSON.stringify(v)).join(", ")}]`
      : `{ ${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")} }`;
    const empty = Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0;
    if (empty) return Array.isArray(value) ? "[]" : "{}";
    if (pad.length + inline.length <= INLINE_LIMIT) return inline;
  }

  if (Array.isArray(value)) {
    const items = value.map((v) => `${padInner}${render(v, indentLevel + 1)}`);
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  const items = Object.entries(value).map(
    ([k, v]) => `${padInner}${JSON.stringify(k)}: ${render(v, indentLevel + 1)}`
  );
  return `{\n${items.join(",\n")}\n${pad}}`;
}

/**
 * @param {unknown} value
 * @returns {string} JSON text with a trailing newline
 */
export function formatJson(value) {
  return `${render(value, 0)}\n`;
}
