import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { getLeaderMonitor } from "../lib/leader-monitor/poll.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dashboardDir = path.join(root, "dashboard");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const HOST = process.env.HOST || "127.0.0.1";

const monitor = getLeaderMonitor({
  onTerminal: (line) => console.log(`[Monitor] ${line}`),
});

async function readJsonBody(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err.trim() || out.trim() || `Exit code ${code}`));
    });
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function serveStatic(urlPath, res) {
  let rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
  rel = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(dashboardDir, rel);
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const body = await fs.readFile(filePath);
  const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
  if (ext === ".json" || filePath.endsWith("generated-data.js")) {
    headers["Cache-Control"] = "no-store";
  }
  res.writeHead(200, headers);
  res.end(body);
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

/**
 * @param {number} [port]
 * @returns {Promise<import('http').Server>}
 */
export function startServer(port = 3456) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${port}`);
    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        });
        res.end();
        return;
      }

      if (url.pathname === "/api/status" && req.method === "GET") {
        json(res, 200, { ok: true, game: "Tevel", version: 1 });
        return;
      }

      if (url.pathname === "/api/rebuild" && req.method === "POST") {
        const out = await runScript(path.join(root, "scripts", "build-dashboard-data.js"));
        json(res, 200, { ok: true, message: out || "Dashboard data rebuilt" });
        return;
      }

      if (url.pathname === "/api/hero-xp" && req.method === "POST") {
        const out = await runScript(path.join(root, "scripts", "generate-hero-xp.js"));
        json(res, 200, { ok: true, message: out || "Hero XP table regenerated" });
        return;
      }

      if (url.pathname === "/api/monitor/config") {
        if (req.method === "GET") {
          const config = await monitor.getConfig();
          json(res, 200, { ok: true, config, running: monitor.isRunning });
          return;
        }
        if (req.method === "POST") {
          const patch = await readJsonBody(req);
          const config = await monitor.updateConfig(patch);
          json(res, 200, { ok: true, config, running: monitor.isRunning });
          return;
        }
      }

      if (url.pathname === "/api/monitor/status" && req.method === "GET") {
        const config = await monitor.getConfig();
        const analytics = await monitor.getAnalytics();
        json(res, 200, {
          ok: true,
          running: monitor.isRunning,
          config,
          analytics,
        });
        return;
      }

      if (url.pathname === "/api/monitor/poll" && req.method === "POST") {
        const snapshot = await monitor.pollOnce();
        const analytics = await monitor.getAnalytics();
        json(res, 200, { ok: true, snapshot, analytics });
        return;
      }

      if (url.pathname === "/api/monitor/snapshots" && req.method === "GET") {
        const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 200));
        const snapshots = await monitor.getSnapshots();
        json(res, 200, {
          ok: true,
          count: snapshots.length,
          snapshots: snapshots.slice(-limit),
        });
        return;
      }

      if (url.pathname === "/api/monitor/analytics" && req.method === "GET") {
        const analytics = await monitor.getAnalytics();
        json(res, 200, { ok: true, analytics });
        return;
      }

      if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
        const rel = decodeURIComponent(url.pathname.slice("/assets/".length));
        const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
        const filePath = path.join(root, "assets", safe);
        try {
          const data = await fs.readFile(filePath);
          const ext = path.extname(filePath).toLowerCase();
          res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
          res.end(data);
        } catch {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Asset not found");
        }
        return;
      }

      if (req.method === "GET" || req.method === "HEAD") {
        if (req.method === "HEAD") {
          let rel = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");
          rel = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
          let filePath = path.join(dashboardDir, rel);
          try {
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
            const ext = path.extname(filePath).toLowerCase();
            const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
            if (ext === ".json" || filePath.endsWith("generated-data.js")) {
              headers["Cache-Control"] = "no-store";
            }
            res.writeHead(200, headers);
            res.end();
          } catch {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end();
          }
          return;
        }
        await serveStatic(url.pathname, res);
        return;
      }

      json(res, 405, { ok: false, error: "Method not allowed" });
    } catch (e) {
      json(res, 500, { ok: false, error: e.message || String(e) });
    }
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, HOST, async () => {
      try {
        const config = await monitor.getConfig();
        if (config.enabled) await monitor.start();
      } catch (e) {
        console.error("[Monitor] Failed to start:", e.message);
      }
      resolve(server);
    });
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const port = Number(process.env.PORT) || 3456;
  startServer(port)
    .then(() => {
      console.log(`[Tevel] Server listening on http://${HOST}:${port}`);
    })
    .catch((e) => {
      console.error("[Tevel] Server error:", e.message);
      process.exit(1);
    });
}
