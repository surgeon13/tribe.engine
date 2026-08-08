import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dashboardDir = path.join(root, "dashboard");
const assetsDir = path.join(root, "assets");
const distDir = path.join(root, "dist");

console.log("[Build] Generating dashboard data...");
execSync("node scripts/build-dashboard-data.js", { cwd: root, stdio: "inherit" });

console.log("[Build] Preparing dist directory...");
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

console.log("[Build] Copying dashboard files to dist...");
fs.cpSync(dashboardDir, distDir, { recursive: true });

console.log("[Build] Copying assets to dist/assets...");
const distAssetsDir = path.join(distDir, "assets");
fs.mkdirSync(distAssetsDir, { recursive: true });
fs.cpSync(assetsDir, distAssetsDir, { recursive: true });

console.log("[Build] Build complete! Published directory ready at dist/");
