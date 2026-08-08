/**
 * Prepare a Netlify publish folder:
 *   netlify-dist/   ← dashboard UI + data.json
 *   netlify-dist/assets/  ← SVG / art referenced as /assets/...
 *
 * Netlify cannot serve the repo root as-is (index.html lives under dashboard/).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "netlify-dist");

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

const build = spawnSync(process.execPath, [path.join(root, "scripts", "build-dashboard-data.js")], {
  cwd: root,
  encoding: "utf8",
});
if (build.status !== 0) {
  console.error(build.stdout || "");
  console.error(build.stderr || "");
  process.exit(build.status || 1);
}
console.log((build.stdout || "").trim());

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const dashboardDir = path.join(root, "dashboard");
for (const name of fs.readdirSync(dashboardDir)) {
  copyRecursive(path.join(dashboardDir, name), path.join(outDir, name));
}

const assetsDir = path.join(root, "assets");
if (fs.existsSync(assetsDir)) {
  copyRecursive(assetsDir, path.join(outDir, "assets"));
}

// SPA-style fallback not required; keep API redirects in netlify.toml.
fs.writeFileSync(
  path.join(outDir, "_headers"),
  `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff

/data.json
  Cache-Control: no-store

/generated-data.js
  Cache-Control: no-store
`
);

console.log(`Prepared ${outDir} for Netlify publish`);
