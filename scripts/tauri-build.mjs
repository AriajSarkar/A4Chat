/**
 * Tauri static-export build script.
 *
 * Problem: `output: 'export'` cannot coexist with dynamic API routes.
 * Solution: temporarily move `src/app/api` out, build, then restore.
 *
 * Usage: node scripts/tauri-build.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const apiDir = join(root, "src", "app", "api");
const stash = join(root, ".api-stash");

function stashApi() {
  if (!existsSync(apiDir)) return;
  cpSync(apiDir, stash, { recursive: true });
  rmSync(apiDir, { recursive: true, force: true });
}

function restoreApi() {
  if (!existsSync(stash)) return;
  if (existsSync(apiDir)) rmSync(apiDir, { recursive: true, force: true });
  cpSync(stash, apiDir, { recursive: true });
  rmSync(stash, { recursive: true, force: true });
}

// 1. Stash API routes
console.log("⏳ Stashing API routes for static export…");
stashApi();

let exitCode = 0;
try {
  // 2. Build with static export
  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, TAURI_ENV_PLATFORM: process.env.TAURI_ENV_PLATFORM || "generic" },
  });
  console.log("✅ Static export complete.");
} catch (err) {
  console.error("❌ Build failed:", err.message);
  exitCode = 1;
} finally {
  // 3. Always restore API routes
  console.log("⏳ Restoring API routes…");
  restoreApi();
}

process.exit(exitCode);
