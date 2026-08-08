/**
 * Shared HTTP API for the local applet and Netlify Functions.
 *
 * On Netlify (persist=false): naming / profiles / list work; Add tribe returns a
 * resolved preview tribe for browser-session use (cannot write GitHub from the CDN).
 */

import fs from "fs/promises";
import path from "path";
import {
  createTribe,
  deleteTribe,
  listTribes,
  listProfileSummaries,
  listArchetypes,
  defaultSlotLabels,
  deriveFromUserInput,
  matchProfile,
  CORE_TRIBE_IDS,
} from "../tribe-generator/index.js";
import { resolveRepoRoot } from "../repo-root.js";

const root = resolveRepoRoot();

/**
 * @param {string} pathname
 */
function normalizeApiPath(pathname) {
  let p = String(pathname || "/");
  p = p.replace(/^\/\.netlify\/functions\/api/, "");
  p = p.replace(/^\/api/, "");
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

/**
 * @param {{
 *   method: string,
 *   pathname: string,
 *   query?: Record<string, string | undefined>,
 *   body?: unknown,
 *   persist?: boolean,
 * }} req
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function handleApiRequest(req) {
  const method = (req.method || "GET").toUpperCase();
  const pathname = normalizeApiPath(req.pathname);
  const query = req.query || {};
  const persist = req.persist !== false;

  if (method === "OPTIONS") {
    return {
      status: 204,
      body: {},
      headers: {
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  if (pathname === "/status" && method === "GET") {
    return {
      status: 200,
      body: {
        ok: true,
        game: "Tevel",
        version: 1,
        mode: persist ? "applet" : "netlify",
        writable: persist,
      },
    };
  }

  if (pathname === "/rebuild" && method === "POST") {
    if (!persist) {
      return {
        status: 501,
        body: {
          ok: false,
          error:
            "Rebuild runs on GitHub/Netlify deploy (npm run build:netlify), not from the live site.",
        },
      };
    }
    const { spawn } = await import("child_process");
    const out = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(root, "scripts", "build-dashboard-data.js")], {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
      child.on("close", (code) => {
        if (code === 0) resolve(stdout.trim());
        else reject(new Error(stderr.trim() || stdout.trim() || `Exit code ${code}`));
      });
    });
    return { status: 200, body: { ok: true, message: out || "Dashboard data rebuilt" } };
  }

  if (pathname === "/tribes/profiles" && method === "GET") {
    return {
      status: 200,
      body: {
        ok: true,
        profiles: listProfileSummaries(),
        archetypes: listArchetypes(),
        slotLabels: defaultSlotLabels(),
      },
    };
  }

  if (pathname === "/tribes/defaults" && method === "GET") {
    const name = query.name || "Custom";
    const theme = query.theme || "";
    const historicalContext = query.context || query.historicalContext || "";
    const derived = deriveFromUserInput({ name, theme, historicalContext });
    return {
      status: 200,
      body: {
        ok: true,
        ...derived,
        troopNames: derived.troopNames,
        slotLabels: defaultSlotLabels(),
        archetypes: listArchetypes(),
      },
    };
  }

  if (pathname === "/tribes" && method === "GET") {
    try {
      const tribes = await listTribes();
      return { status: 200, body: { ok: true, tribes, coreTribeIds: CORE_TRIBE_IDS, writable: persist } };
    } catch (e) {
      // Netlify fallback: list from bundled dashboard data
      try {
        const raw = await fs.readFile(path.join(root, "dashboard/data.json"), "utf8");
        const data = JSON.parse(raw);
        const tribes = (data.tribes || []).map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          removable: !CORE_TRIBE_IDS.includes(t.id),
        }));
        return { status: 200, body: { ok: true, tribes, coreTribeIds: CORE_TRIBE_IDS, writable: false } };
      } catch {
        throw e;
      }
    }
  }

  if (pathname === "/tribes/match" && method === "GET") {
    const q = query.q || "";
    const matched = matchProfile(q);
    return {
      status: 200,
      body: {
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
      },
    };
  }

  if (pathname === "/tribes" && method === "POST") {
    const body = /** @type {Record<string, unknown>} */ (req.body || {});
    const result = await createTribe({
      custom: body.custom === true || body.mode === "custom" || body.cultureId === "custom",
      cultureId: body.cultureId,
      historicalContext: body.historicalContext || body.context,
      name: body.name,
      id: body.id,
      type: body.type === "npc" ? "npc" : "playable",
      palette: body.palette,
      theme: body.theme,
      era: body.era,
      region: body.region,
      archetype: body.archetype,
      troopNames: body.troopNames,
      troopOverrides: body.troopOverrides,
      hero: body.hero,
      heroName: body.heroName,
      accountName: body.accountName || body.playerName,
      playerName: body.playerName,
      logos: body.logos,
      training: body.training,
      rebuild: persist ? body.rebuild !== false : false,
      persist,
    });
    return {
      status: 201,
      body: {
        ok: true,
        tribe: result,
        dashboardTribe: result.dashboardTribe || null,
        message: result.persisted === false
          ? `Preview ${result.name} (browser session — Netlify cannot write to GitHub)`
          : `Created ${result.name}`,
      },
    };
  }

  const delMatch = pathname.match(/^\/tribes\/([^/]+)$/);
  if (delMatch && method === "DELETE") {
    const id = decodeURIComponent(delMatch[1]);
    if (!persist) {
      return {
        status: 200,
        body: {
          ok: true,
          tribe: { id, name: id },
          sessionOnly: true,
          message: `Remove "${id}" from this browser session`,
        },
      };
    }
    const result = await deleteTribe(id);
    return { status: 200, body: { ok: true, tribe: result, message: `Deleted ${result.name}` } };
  }

  return { status: 404, body: { ok: false, error: `Unknown API route ${method} ${pathname}` } };
}
