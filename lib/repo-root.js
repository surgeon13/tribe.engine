/**
 * Resolve the Tevel repo / deploy root in local Node and Netlify Functions.
 *
 * Do not use top-level `fileURLToPath(import.meta.url)` in modules that ship
 * inside Netlify Functions — esbuild's CJS emit can leave `import.meta.url`
 * undefined and crash the whole function on load.
 */
import path from "path";
import { existsSync } from "fs";

/**
 * @returns {string}
 */
export function resolveRepoRoot() {
  if (process.env.TEVEL_ROOT && looksLikeRoot(process.env.TEVEL_ROOT)) {
    return process.env.TEVEL_ROOT;
  }

  // Netlify Functions: included_files land under LAMBDA_TASK_ROOT (/var/task)
  const lambda = process.env.LAMBDA_TASK_ROOT;
  if (lambda && looksLikeRoot(lambda)) return lambda;

  const cwd = process.cwd();
  if (looksLikeRoot(cwd)) return cwd;

  // Local: running from applet/ or scripts/
  const up = path.join(cwd, "..");
  if (looksLikeRoot(up)) return up;

  if (lambda) return lambda;
  return cwd;
}

function looksLikeRoot(dir) {
  return Boolean(dir) && existsSync(path.join(dir, "data", "tribes", "index.json"));
}
