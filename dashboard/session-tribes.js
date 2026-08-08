/** Browser-session tribes for hosts that cannot persist to disk (e.g. Netlify). */

const SESSION_KEY = "tevel-session-tribes";

/** @type {boolean} when false, session storage is the durable store for added tribes */
let sessionStoreEnabled = true;

/**
 * Call after /api/status — disable session store on the writable local applet
 * so session copies cannot override disk.
 * @param {boolean} enabled
 */
export function setSessionStoreEnabled(enabled) {
  sessionStoreEnabled = Boolean(enabled);
}

export function isSessionStoreEnabled() {
  return sessionStoreEnabled;
}

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
 * Persist a resolved tribe in the browser session (Netlify / non-writable hosts).
 * No-op when session store is disabled (local applet writes to disk instead).
 * @param {object} tribe resolved dashboard tribe
 */
export function upsertSessionTribe(tribe) {
  if (!sessionStoreEnabled) return;
  if (!tribe?.id) return;
  const entry = {
    ...tribe,
    sessionOnly: true,
    persisted: false,
  };
  const next = loadSessionTribes().filter((t) => t.id !== entry.id);
  next.push(entry);
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
 * Drop session tribes that now exist on disk (after a successful local save),
 * or clear everything when switching to a writable host.
 * @param {string[]} [diskIds]
 */
export function pruneSessionTribes(diskIds) {
  if (!Array.isArray(diskIds)) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  const disk = new Set(diskIds);
  const kept = loadSessionTribes().filter((t) => t?.id && !disk.has(t.id));
  localStorage.setItem(SESSION_KEY, JSON.stringify(kept));
}

/**
 * Merge session-only tribes into loaded dashboard payload (session wins on id clash).
 * Skipped when session store is disabled (writable applet).
 * @param {{ tribes?: object[] }} data
 */
export function mergeSessionTribes(data) {
  if (!data?.tribes) return data;
  if (!sessionStoreEnabled) return data;
  const session = loadSessionTribes().filter((t) => t?.id);
  if (!session.length) return data;
  const byId = new Map(data.tribes.map((t) => [t.id, t]));
  for (const t of session) byId.set(t.id, { ...t, sessionOnly: true, persisted: false });
  return { ...data, tribes: [...byId.values()] };
}

/**
 * Insert or replace a tribe in an in-memory dashboard payload (create/edit UX).
 * @param {{ tribes?: object[] } | null} data
 * @param {object} tribe
 */
export function mergeTribeIntoData(data, tribe) {
  if (!data?.tribes || !tribe?.id) return data;
  const next = data.tribes.filter((t) => t.id !== tribe.id);
  next.push(tribe);
  return { ...data, tribes: next };
}
