"use client";

import {
    RiCheckboxCircleLine,
    RiDownloadCloud2Line,
    RiErrorWarningLine,
    RiExternalLinkLine,
    RiRefreshLine,
    RiRestartLine,
} from "@remixicon/react";
import { useEffect } from "react";

import { useAppUpdate, type AppUpdateStatus } from "@/hooks/useAppUpdate";
import { GITHUB_RELEASES_URL } from "@/lib/AppMeta";
import { formatBytes, formatUpdateScale } from "@/lib/AppUpdate";
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
        <div className="bg-surface-0 overflow-hidden rounded-2xl border border-white/6 px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="text-text-primary mb-2 flex items-center gap-3">
                        <RiDownloadCloud2Line className="text-accent-soft shrink-0" size={20} />
                        <h3 className="font-semibold">App updates</h3>
                        <StatusPill status={status} />
                    </div>
                    <p className="text-text-tertiary text-sm leading-6">
                        {statusText(status, check?.currentVersion, check?.version)}
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                    {status === "ready" ? (
                        <button
                            className="bg-accent hover:bg-accent/90 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-colors"
                            onClick={() => void restartNow()}
                            type="button"
                        >
                            <RiRestartLine size={18} />
                            Restart
                        </button>
                    ) : null}

                    {status === "available" ? (
                        <button
                            className="bg-accent hover:bg-accent/90 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                            disabled={busy}
                            onClick={() => void installNow()}
                            type="button"
                        >
                            <RiDownloadCloud2Line size={18} />
                            {isApkUpdate ? "Download" : "Install"}
                        </button>
                    ) : null}

                    <button
                        className="text-text-secondary hover:text-text-primary inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm transition-colors hover:bg-white/6 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void checkNow()}
                        type="button"
                    >
                        <RiRefreshLine size={18} />
                        Check
                    </button>

                    <a
                        className="text-text-secondary hover:text-text-primary grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 transition-colors hover:bg-white/6"
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
                <div className="border-accent/20 bg-accent/8 mt-4 min-w-0 overflow-hidden rounded-xl border p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-text-primary text-sm font-semibold">
                                {formatUpdateScale(scale)}{" "}
                                {check.version ? `v${check.version}` : ""}
                            </p>
                            <p className="text-text-tertiary mt-1 text-xs">
                                Current v{check.currentVersion}
                                {check.target ? ` - ${check.target}` : ""}
                            </p>
                        </div>
                        {check.date ? (
                            <span className="text-text-quaternary text-xs">
                                {formatDate(check.date)}
                            </span>
                        ) : null}
                    </div>
                    {check.body ? (
                        <p className="text-text-secondary mt-3 text-sm leading-6 wrap-break-word whitespace-pre-wrap">
                            {check.body}
                        </p>
                    ) : null}
                </div>
            ) : null}

            {progressLabel ? (
                <div className="mt-4">
                    <div className="text-text-tertiary mb-2 flex justify-between text-xs">
                        <span>{progressLabel}</span>
                        <span>{formatBytes(progress?.downloadedBytes)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                        <div
                            className="bg-accent h-full rounded-full transition-[width]"
                            style={{ width: `${percent ?? 8}%` }}
                        />
                    </div>
                </div>
            ) : null}

            {error ? (
                <div className="border-danger/20 bg-danger/10 text-danger mt-4 flex gap-2 rounded-xl border p-3 text-sm leading-6">
                    <RiErrorWarningLine className="mt-0.5 shrink-0" size={18} />
                    <span>{error}</span>
                </div>
            ) : null}

            {status === "download-started" ? (
                <div className="mt-4 flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm leading-6 text-emerald-200">
                    <RiCheckboxCircleLine className="mt-0.5 shrink-0" size={18} />
                    <span>
                        APK download opened in your browser. Install it from your notifications once
                        complete.
                    </span>
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
