/** Browser-session tribes for Netlify (cannot persist to GitHub from the CDN). */

const SESSION_KEY = "tevel-session-tribes";

export function loadSessionTribes() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * @param {object} tribe resolved dashboard tribe
 */
export function upsertSessionTribe(tribe) {
  if (!tribe?.id) return;
  const next = loadSessionTribes().filter((t) => t.id !== tribe.id);
  next.push(tribe);
  localStorage.setItem(SESSION_KEY, JSON.stringify(next));
}

/**
 * @param {string} id
 */
export function removeSessionTribe(id) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(loadSessionTribes().filter((t) => t.id !== id))
  );
}

/**
 * Merge session tribes into loaded dashboard payload (session wins on id clash).
 * @param {{ tribes?: object[] }} data
 */
export function mergeSessionTribes(data) {
  if (!data?.tribes) return data;
  const session = loadSessionTribes();
  if (!session.length) return data;
  const byId = new Map(data.tribes.map((t) => [t.id, t]));
  for (const t of session) byId.set(t.id, t);
  return { ...data, tribes: [...byId.values()] };
}
