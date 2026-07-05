import { exec } from "child_process";
import { promisify } from "util";
import { startServer } from "./server.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const BASE_PORT = Number(process.env.PORT) || 3456;

function log(msg) {
  console.log(`[Tevel] ${msg}`);
}

async function isTevelServer(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/status`);
    if (!res.ok) return false;
    const body = await res.json();
    return body?.game === "Tevel";
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<{ port: number, url: string, reused: boolean }>}
 */
async function ensureServer() {
  for (let port = BASE_PORT; port < BASE_PORT + 10; port++) {
    if (await isTevelServer(port)) {
      return { port, url: `http://127.0.0.1:${port}`, reused: true };
    }
    try {
      await startServer(port);
      return { port, url: `http://127.0.0.1:${port}`, reused: false };
    } catch (e) {
      if (e?.code !== "EADDRINUSE") throw e;
    }
  }
  throw new Error(`Ports ${BASE_PORT}–${BASE_PORT + 9} are in use by other apps`);
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(root, "scripts", "build-dashboard-data.js")],
      { cwd: root, stdio: "inherit" }
    );
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error("Build failed"))));
  });
}

function isTermux() {
  return Boolean(process.env.TERMUX_VERSION) || (process.env.PREFIX || "").includes("com.termux");
}

function shouldOpenBrowser() {
  if (process.env.TEVEL_OPEN_BROWSER === "0") return false;
  if (process.env.TEVEL_OPEN_BROWSER === "1") return true;
  if (process.env.CURSOR_AGENT === "1" || process.env.CI === "true") return false;
  if (isTermux()) return true;
  if (process.platform === "linux" && !process.env.DISPLAY) return false;
  return true;
}

async function openApp(url) {
  if (!shouldOpenBrowser()) return;
  if (isTermux()) {
    try {
      await execAsync(`termux-open-url "${url}"`);
      return;
    } catch {
      log(`Open in your phone browser: ${url}`);
      return;
    }
  }
  const platform = process.platform;
  if (platform === "win32") {
    try {
      await execAsync(`start msedge --app=${url}`);
      return;
    } catch {
      /* fall through */
    }
    await execAsync(`start "" "${url}"`);
  } else if (platform === "darwin") {
    await execAsync(`open "${url}"`);
  } else {
    await execAsync(`xdg-open "${url}"`);
  }
}

async function main() {
  console.log(`
  ╔══════════════════════════════════╗
  ║   Tevel Tribe Engine Applet      ║
  ╚══════════════════════════════════╝
`);
  log("Building tribe data…");
  await runBuild();
  const { url, port, reused } = await ensureServer();
  if (reused) {
    log(`Tevel already running on ${url}`);
  } else {
    log(`Started server on ${url}`);
  }

  log(`Dashboard URL: ${url}`);
  if (process.env.CURSOR_AGENT === "1") {
    log("In Cursor Cloud Agent: open the Ports panel and click port " + port + " → Open in Browser.");
  } else if (isTermux()) {
    log("On Android: keep this terminal open, then open " + url + " in Chrome.");
    log("Or run: termux-open-url " + url);
  }

  if (shouldOpenBrowser()) {
    log("Opening dashboard…");
    await openApp(url);
  }

  if (!reused) {
    log(`Press Ctrl+C to stop the server (port ${port}).`);
    await new Promise(() => {});
  }
}

main().catch((e) => {
  console.error("[Tevel] Error:", e.message);
  process.exit(1);
});
