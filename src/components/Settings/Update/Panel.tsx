"use client";

import { useEffect } from "react";
import {
  RiCheckboxCircleLine,
  RiDownloadCloud2Line,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiRefreshLine,
  RiRestartLine,
} from "@remixicon/react";

import { GITHUB_RELEASES_URL } from "@/lib/AppMeta";
import { formatBytes, formatUpdateScale } from "@/lib/AppUpdate";
import { useAppUpdate, type AppUpdateStatus } from "@/hooks/useAppUpdate";
import { cn } from "@/lib/cn";

export function UpdatePanel() {
  const { check, checkNow, error, installNow, percent, progress, restartNow, scale, status } =
    useAppUpdate();

  useEffect(() => {
    if (status === "idle") {
      void checkNow();
    }
  }, [checkNow, status]);

  const busy = status === "checking" || status === "downloading" || status === "installing";
  const isApkUpdate = check?.platformStrategy === "github-apk";
  const progressLabel =
    status === "downloading"
      ? `${percent ?? 0}% of ${formatBytes(progress?.contentLength)}`
      : status === "installing"
        ? "Installing"
        : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/6 bg-surface-0 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3 text-text-primary">
            <RiDownloadCloud2Line className="shrink-0 text-accent-soft" size={20} />
            <h3 className="font-semibold">App updates</h3>
            <StatusPill status={status} />
          </div>
          <p className="text-sm leading-6 text-text-tertiary">
            {statusText(status, check?.currentVersion, check?.version)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {status === "ready" ? (
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
              onClick={() => void restartNow()}
              type="button"
            >
              <RiRestartLine size={18} />
              Restart
            </button>
          ) : null}

          {status === "available" ? (
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              disabled={busy}
              onClick={() => void installNow()}
              type="button"
            >
              <RiDownloadCloud2Line size={18} />
              {isApkUpdate ? "Download" : "Install"}
            </button>
          ) : null}

          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary disabled:opacity-50"
            disabled={busy}
            onClick={() => void checkNow()}
            type="button"
          >
            <RiRefreshLine size={18} />
            Check
          </button>

          <a
            className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 text-text-secondary transition-colors hover:bg-white/6 hover:text-text-primary"
            href={GITHUB_RELEASES_URL}
            rel="noreferrer"
            target="_blank"
            title="GitHub releases"
          >
            <RiExternalLinkLine size={18} />
          </a>
        </div>
      </div>

      {check?.available ? (
        <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-accent/20 bg-accent/8 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {formatUpdateScale(scale)} {check.version ? `v${check.version}` : ""}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Current v{check.currentVersion}
                {check.target ? ` - ${check.target}` : ""}
              </p>
            </div>
            {check.date ? (
              <span className="text-xs text-text-quaternary">{formatDate(check.date)}</span>
            ) : null}
          </div>
          {check.body ? (
            <p className="mt-3 break-words whitespace-pre-wrap text-sm leading-6 text-text-secondary">
              {check.body}
            </p>
          ) : null}
        </div>
      ) : null}

      {progressLabel ? (
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-xs text-text-tertiary">
            <span>{progressLabel}</span>
            <span>{formatBytes(progress?.downloadedBytes)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${percent ?? 8}%` }}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 flex gap-2 rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm leading-6 text-danger">
          <RiErrorWarningLine className="mt-0.5 shrink-0" size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      {status === "download-started" ? (
        <div className="mt-4 flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm leading-6 text-emerald-200">
          <RiCheckboxCircleLine className="mt-0.5 shrink-0" size={18} />
          <span>APK download opened in your browser. Install it from your notifications once complete.</span>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: AppUpdateStatus }) {
  const positive = status === "current" || status === "ready" || status === "download-started";
  const attention = status === "available";
  const label = statusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        positive && "bg-emerald-400/10 text-emerald-200",
        attention && "bg-accent/15 text-accent-soft",
        !positive && !attention && "bg-white/8 text-text-tertiary",
      )}
    >
      {positive ? <RiCheckboxCircleLine size={13} /> : null}
      {label}
    </span>
  );
}

function statusLabel(status: AppUpdateStatus) {
  switch (status) {
    case "checking":
      return "Checking";
    case "current":
      return "Current";
    case "available":
      return "Available";
    case "downloading":
      return "Downloading";
    case "installing":
      return "Installing";
    case "ready":
      return "Ready";
    case "download-started":
      return "Opened";
    case "unsupported":
      return "Desktop";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

function statusText(status: AppUpdateStatus, currentVersion?: string, nextVersion?: string | null) {
  if (status === "unsupported") {
    return "Installed desktop builds update from GitHub Releases. Mobile builds stay store-managed.";
  }

  if (status === "available") {
    return `v${nextVersion} is ready for this device.`;
  }

  if (status === "download-started") {
    return "APK download opened. Install it from your browser downloads.";
  }

  if (status === "ready") {
    return "The update is installed and will finish after restart.";
  }

  if (status === "downloading") {
    return "Downloading the signed update package.";
  }

  if (status === "installing") {
    return "Installing the verified package.";
  }

  if (status === "current") {
    return `v${currentVersion ?? "current"} is up to date.`;
  }

  if (status === "error") {
    return "Update check failed.";
  }

  return "Checking GitHub Releases for a signed package.";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
