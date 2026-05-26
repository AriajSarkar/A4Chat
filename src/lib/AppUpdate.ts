export type UpdateChannel = "github-release" | "store-managed";
export type UpdatePlatformStrategy = "tauri-updater" | "store";
export type UpdateProgressPhase =
  | "checking"
  | "downloading"
  | "downloaded"
  | "installing"
  | "installed";
export type UpdateScale = "major" | "minor" | "patch" | "same" | "unknown";

export type AppUpdateCheck = {
  available: boolean;
  currentVersion: string;
  version: string | null;
  date: string | null;
  body: string | null;
  target: string | null;
  downloadUrl: string | null;
  channel: UpdateChannel;
  platformStrategy: UpdatePlatformStrategy;
};

export type AppUpdateInstallResult = {
  installed: boolean;
  version: string | null;
  restartRequired: boolean;
  platformStrategy: UpdatePlatformStrategy;
};

export type AppUpdateProgress = {
  phase: UpdateProgressPhase;
  downloadedBytes: number;
  contentLength: number | null;
};

type SemverParts = {
  major: number;
  minor: number;
  patch: number;
};

export function parseSemver(value: string | null | undefined): SemverParts | null {
  if (!value) return null;
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function classifyUpdateScale(
  currentVersion: string,
  nextVersion: string | null,
): UpdateScale {
  const current = parseSemver(currentVersion);
  const next = parseSemver(nextVersion);
  if (!current || !next) return "unknown" satisfies UpdateScale;

  if (next.major !== current.major) return "major" satisfies UpdateScale;
  if (next.minor !== current.minor) return "minor" satisfies UpdateScale;
  if (next.patch !== current.patch) return "patch" satisfies UpdateScale;
  return "same" satisfies UpdateScale;
}

export function formatUpdateScale(scale: UpdateScale) {
  switch (scale) {
    case "major":
      return "Major update";
    case "minor":
      return "Feature update";
    case "patch":
      return "Patch update";
    case "same":
      return "Current version";
    default:
      return "Update";
  }
}

export function progressPercent(progress: AppUpdateProgress | null) {
  if (!progress?.contentLength) return null;
  return Math.min(100, Math.floor((progress.downloadedBytes / progress.contentLength) * 100));
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 10 || unitIndex === 0 || Number.isInteger(value) ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}
