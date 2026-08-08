import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { handleApiRequest } from "../lib/api/router.js";

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

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
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

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(status === 204 ? "" : JSON.stringify(body));
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
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        const body =
          req.method === "GET" || req.method === "HEAD" || req.method === "DELETE"
            ? undefined
            : await readJsonBody(req);
        const result = await handleApiRequest({
          method: req.method || "GET",
          pathname: url.pathname,
          query: Object.fromEntries(url.searchParams.entries()),
          body,
          persist: true,
        });
        if (result.status === 204) {
          res.writeHead(204, {
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            ...(result.headers || {}),
          });
          res.end();
          return;
        }
        json(res, result.status, result.body, result.headers || {});
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
    server.listen(port, HOST, () => resolve(server));
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
