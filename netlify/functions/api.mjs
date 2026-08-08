import {
  listProfileSummaries,
  listArchetypes,
  defaultSlotLabels,
  deriveFromUserInput,
  listTribes,
  matchProfile,
  CORE_TRIBE_IDS,
} from "../../lib/tribe-generator/index.js";

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const json = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  };

  if (path === "/api/status" && req.method === "GET") {
    return json({ ok: true, game: "Tevel", version: 1 });
  }

  if (path === "/api/rebuild" && req.method === "POST") {
    return json({ ok: true, message: "Dashboard data ready" });
  }

  if (path === "/api/tribes/profiles" && req.method === "GET") {
    return json({
      ok: true,
      profiles: listProfileSummaries(),
      archetypes: listArchetypes(),
      slotLabels: defaultSlotLabels(),
    });
  }

  if (path === "/api/tribes/defaults" && req.method === "GET") {
    const name = url.searchParams.get("name") || "Custom";
    const theme = url.searchParams.get("theme") || "";
    const historicalContext =
      url.searchParams.get("context") || url.searchParams.get("historicalContext") || "";
    const derived = deriveFromUserInput({ name, theme, historicalContext });
    return json({
      ok: true,
      ...derived,
      troopNames: derived.troopNames,
      slotLabels: defaultSlotLabels(),
      archetypes: listArchetypes(),
    });
  }

  if (path === "/api/tribes" && req.method === "GET") {
    const tribes = await listTribes();
    return json({ ok: true, tribes, coreTribeIds: CORE_TRIBE_IDS });
  }

  if (path === "/api/tribes/match" && req.method === "GET") {
    const q = url.searchParams.get("q") || "";
    const matched = matchProfile(q);
    return json({
      ok: true,
      query: q,
      match: matched
        ? {
            id: matched.id,
            name: matched.name,
            era: matched.era,
            region: matched.region,
            theme: matched.theme,
            historicalContext: matched.historicalContext,
            archetype: matched.archetype,
            palette: matched.palette,
          }
        : null,
    });
  }

  return json({ ok: false, error: "Endpoint not found" }, 404);
};

export const config = {
  path: "/api/*",
};
