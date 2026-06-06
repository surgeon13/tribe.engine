import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dashboardDir = path.join(root, "dashboard");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

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

      if (req.method === "GET") {
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
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
