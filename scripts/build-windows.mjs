#!/usr/bin/env node
// build-windows.mjs — Build Windows NSIS installer (Node wrapper)
// Usage: node scripts/build-windows.mjs [rust-target]

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, cpSync, readdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const RELEASE_DIR = join(ROOT, "release");
const SIGNING_KEY = join(ROOT, "_signing", "a4chat-updater.key");
const ENV_FILE = join(ROOT, ".env");
const TARGET = process.argv[2] || "";

function run(cmd, env = {}) {
  console.log(`==> ${cmd}`);
  execSync(cmd, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

// 1. Sync version
run("node scripts/tauri-build.mjs");

// 2. Setup updater signing env
const signingEnv = {};

// Parse .env if it exists
if (existsSync(ENV_FILE)) {
  const envContent = readFileSync(ENV_FILE, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (key.startsWith("TAURI_SIGNING_PRIVATE_KEY")) {
        signingEnv[key] = value;
      }
    }
  }
}

if (signingEnv.TAURI_SIGNING_PRIVATE_KEY || process.env.TAURI_SIGNING_PRIVATE_KEY || process.env.TAURI_SIGNING_PRIVATE_KEY_PATH) {
  console.log("==> Tauri updater signing key loaded from environment / .env");
} else if (existsSync(SIGNING_KEY)) {
  signingEnv.TAURI_SIGNING_PRIVATE_KEY_PATH = SIGNING_KEY;
  console.log("==> Tauri updater signing key loaded from _signing/");
} else {
  console.log("⚠  No signing key found — build will fail to produce .sig files");
}

// 3. Build
console.log("==> Building Windows NSIS...");
const targetFlag = TARGET ? ` --target ${TARGET}` : "";
run(`pnpm tauri build --bundles nsis${targetFlag}`, signingEnv);

// 4. Copy artifacts to release/
mkdirSync(RELEASE_DIR, { recursive: true });

function copyGlob(baseDir, ext) {
  if (!existsSync(baseDir)) return;
  for (const entry of readdirSync(baseDir, { withFileTypes: true, recursive: true })) {
    const full = join(entry.parentPath ?? entry.path, entry.name);
    if (entry.isFile() && full.endsWith(ext) && full.includes("release\\bundle\\nsis")) {
      const dest = join(RELEASE_DIR, entry.name);
      cpSync(full, dest);
      console.log(`    Copied: ${entry.name}`);
    }
  }
}

const targetDir = join(ROOT, "src-tauri", "target");
copyGlob(targetDir, ".exe");
copyGlob(targetDir, ".sig");

// 5. Verify
const exes = readdirSync(RELEASE_DIR).filter((f) => f.endsWith(".exe"));
if (exes.length === 0) {
  console.error("❌ No Windows NSIS installer found");
  process.exit(1);
}

console.log("");
console.log("==========================================");
console.log("  Windows installer(s) copied to: release/");
exes.forEach((f) => console.log(`    ${f}`));
console.log("==========================================");
