/** @typedef {import('./types.js').LeaderEntry} LeaderEntry */

/**
 * Fetches top players from a Travian-compatible statistics endpoint.
 * Expects JSON: { players: [{ rank, id, name, points, wood, clay, iron, crop }] }
 * or an array of player objects.
 *
 * @param {string} serverUrl
 * @param {number} topCount
 */
export async function fetchTravianLeaders(serverUrl, topCount = 10) {
  if (!serverUrl) {
    throw new Error("serverUrl is required for travian adapter");
  }

  const url = new URL(serverUrl);
  if (!url.searchParams.has("limit")) {
    url.searchParams.set("limit", String(topCount));
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Travian leaderboard fetch failed: HTTP ${res.status}`);
  }

  const body = await res.json();
  const rows = Array.isArray(body) ? body : body.players || body.leaders || body.data;
  if (!Array.isArray(rows)) {
    throw new Error("Unexpected Travian leaderboard response shape");
  }

  /** @type {LeaderEntry[]} */
  const leaders = rows.slice(0, topCount).map((row, i) => {
    const resources = row.resources || {};
    return {
      rank: Number(row.rank ?? i + 1),
      id: String(row.id ?? row.playerId ?? `player-${i + 1}`),
      name: String(row.name ?? row.playerName ?? `Player ${i + 1}`),
      points: Number(row.points ?? row.score ?? 0),
      resources: {
        wood: Number(resources.wood ?? row.wood ?? 0),
        clay: Number(resources.clay ?? row.clay ?? 0),
        iron: Number(resources.iron ?? row.iron ?? 0),
        crop: Number(resources.crop ?? row.crop ?? 0),
      },
      population: row.population != null ? Number(row.population) : undefined,
      villages: row.villages != null ? Number(row.villages) : undefined,
    };
  });

  return leaders;
}
