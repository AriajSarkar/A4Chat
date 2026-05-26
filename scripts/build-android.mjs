#!/usr/bin/env node
// build-android.mjs — Build Android release APK(s) (Node wrapper)
// Usage: node scripts/build-android.mjs [arch]
//   arch: all (default), aarch64, armv7, i686, x86_64

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, cpSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const RELEASE_DIR = join(ROOT, "release");
const ARCH = process.argv[2] || "all";
const PACKAGE_JSON = join(ROOT, "package.json");
const TAURI_PROPERTIES = join(ROOT, "src-tauri", "gen", "android", "app", "tauri.properties");
const JNI_LIBS_DIR = join(ROOT, "src-tauri", "gen", "android", "app", "src", "main", "jniLibs");

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

// 2. Parse version and setup tauri.properties
const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf-8"));
const appVersion = pkg.version;
if (!appVersion) {
  console.error("❌ Could not detect app version from package.json");
  process.exit(1);
}

const [majorStr, minorStr, patchRaw] = appVersion.split(".");
const patchStr = patchRaw.replace(/[^0-9].*$/, "");
const major = parseInt(majorStr, 10);
const minor = parseInt(minorStr, 10);
const patch = parseInt(patchStr, 10);

if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
  console.error(`❌ Unsupported semver format in package.json: ${appVersion}`);
  process.exit(1);
}

const androidVersionCode = major * 1000000 + minor * 1000 + patch;

mkdirSync(join(ROOT, "src-tauri", "gen", "android", "app"), { recursive: true });
const propertiesContent = `tauri.android.versionName=${appVersion}\ntauri.android.versionCode=${androidVersionCode}\n`;
writeFileSync(TAURI_PROPERTIES, propertiesContent);
console.log(`==> Android version metadata: versionName=${appVersion} versionCode=${androidVersionCode}`);

// 3. Clean stale JNI libs
if (existsSync(JNI_LIBS_DIR)) {
  console.log(`==> Cleaning stale JNI libs: ${JNI_LIBS_DIR}`);
  rmSync(JNI_LIBS_DIR, { recursive: true, force: true });
}

const validArchs = ["all", "aarch64", "armv7", "i686", "x86_64"];
if (!validArchs.includes(ARCH)) {
  console.error(`❌ Unsupported Android arch: ${ARCH}`);
  console.error("Usage: node scripts/build-android.mjs [all|aarch64|armv7|i686|x86_64]");
  process.exit(1);
}

// 4. Build
console.log(`==> Building Android APK(s) for: ${ARCH}`);
const targetFlag = ARCH === "all" ? "" : ` --target ${ARCH}`;
run(`pnpm tauri android build --apk${targetFlag}`);

// 5. Copy artifacts to release/
mkdirSync(RELEASE_DIR, { recursive: true });

function findApks(baseDir) {
  const apks = [];
  if (!existsSync(baseDir)) return apks;
  for (const entry of readdirSync(baseDir, { withFileTypes: true, recursive: true })) {
    const full = join(entry.parentPath ?? entry.path, entry.name);
    // Check if it's an APK and is in a release folder
    if (entry.isFile() && full.endsWith(".apk") && full.includes("release")) {
      apks.push(full);
    }
  }
  return apks;
}

const apkDir = join(ROOT, "src-tauri", "gen", "android", "app", "build", "outputs", "apk");
const apks = findApks(apkDir);

if (apks.length === 0) {
  console.error("❌ No release APKs found under src-tauri/gen/android/app/build/outputs/apk");
  process.exit(1);
}

const tagVersion = process.env.GITHUB_REF_NAME ? process.env.GITHUB_REF_NAME.replace(/^v/, "") : "";
const version = process.env.A4CHAT_VERSION || tagVersion || appVersion;
const versionPrefix = version ? `${version}_` : "";

console.log("");
console.log("==========================================");
console.log("  Android APK(s) copied to: release/");

let index = 0;
for (const apk of apks) {
  index++;
  let outputName = ARCH === "all" 
    ? `A4Chat_${versionPrefix}universal.apk` 
    : `A4Chat_${versionPrefix}${ARCH}.apk`;

  if (apks.length > 1) {
    outputName = outputName.replace(".apk", `_${index}.apk`);
  }

  const outputPath = join(RELEASE_DIR, outputName);
  cpSync(apk, outputPath);
  console.log(`    ${outputName}`);
}
console.log("==========================================");
