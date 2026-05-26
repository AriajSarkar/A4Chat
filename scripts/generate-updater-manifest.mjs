#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function readArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(`Invalid argument near ${key ?? "(end)"}`);
    }
    args.set(key.slice(2), value);
  }
  return args;
}

function collectFiles(dir) {
  const entries = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      entries.push(...collectFiles(path));
    } else {
      entries.push(path);
    }
  }
  return entries;
}

function detectArtifact(filePath) {
  const normalized = filePath.replaceAll("\\", "/").toLowerCase();
  const fileName = basename(filePath).toLowerCase();

  if (fileName.endsWith(".sig") || fileName.endsWith(".dmg") || fileName.endsWith(".apk")) {
    return null;
  }

  if (fileName.endsWith(".appimage")) {
    return { os: "linux", installer: "appimage" };
  }

  if (fileName.endsWith(".deb")) {
    return { os: "linux", installer: "deb" };
  }

  if (fileName.endsWith(".app.tar.gz")) {
    return { os: "darwin", installer: "app" };
  }

  if (fileName.endsWith(".exe")) {
    return { os: "windows", installer: "nsis" };
  }

  if (fileName.endsWith(".msi")) {
    return { os: "windows", installer: "msi" };
  }

  if (normalized.includes("/bundle/nsis/")) {
    return { os: "windows", installer: "nsis" };
  }

  return null;
}

function detectArch(filePath, os) {
  const normalized = filePath.replaceAll("\\", "/").toLowerCase();
  const fileName = basename(filePath).toLowerCase();

  if (normalized.includes("aarch64") || normalized.includes("arm64")) {
    return "aarch64";
  }

  if (
    normalized.includes("x86_64") ||
    normalized.includes("x64") ||
    fileName.includes("_amd64.deb")
  ) {
    return "x86_64";
  }

  if (fileName.includes("_i386.deb") || normalized.includes("i686")) {
    return "i686";
  }

  if (os === "darwin") {
    return "aarch64";
  }

  return "x86_64";
}

function encodeReleaseAsset(fileName) {
  return encodeURIComponent(fileName).replaceAll("%20", "+");
}

function createManifest({ artifactRoot, repo, tag, version }) {
  const files = collectFiles(artifactRoot);
  const fileSet = new Set(files);
  const platforms = {};

  for (const file of files) {
    const artifact = detectArtifact(file);
    if (!artifact) continue;

    const signaturePath = `${file}.sig`;
    if (!fileSet.has(signaturePath)) continue;

    const arch = detectArch(file, artifact.os);
    const target = `${artifact.os}-${arch}-${artifact.installer}`;
    const fileName = basename(file);
    const assetUrl = `https://github.com/${repo}/releases/download/${tag}/${encodeReleaseAsset(fileName)}`;
    const signature = readFileSync(signaturePath, "utf8").trim();

    platforms[target] = {
      signature,
      url: assetUrl,
    };
  }

  if (Object.keys(platforms).length === 0) {
    throw new Error(`No signed updater artifacts found under ${artifactRoot}`);
  }

  return {
    version,
    notes: `See the GitHub release notes for ${tag}.`,
    pub_date: new Date().toISOString(),
    platforms,
  };
}

function main() {
  const args = readArgs(process.argv.slice(2));
  const artifactRoot = args.get("artifacts") ?? join(root, "artifacts");
  const outputPath = args.get("output") ?? join(root, "artifacts", "latest.json");
  const repo = args.get("repo") ?? process.env.GITHUB_REPOSITORY;
  const tag = args.get("tag") ?? process.env.GITHUB_REF_NAME;
  const version = (args.get("version") ?? tag ?? "").replace(/^v/, "");

  if (!repo) throw new Error("--repo or GITHUB_REPOSITORY is required");
  if (!tag) throw new Error("--tag or GITHUB_REF_NAME is required");
  if (!version) throw new Error("--version is required");

  const manifest = createManifest({ artifactRoot, repo, tag, version });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const rel = relative(root, outputPath).split(sep).join("/");
  console.log(`Generated ${rel} with ${Object.keys(manifest.platforms).length} platform entries`);
}

main();
