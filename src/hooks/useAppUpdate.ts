"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import {
  classifyUpdateScale,
  progressPercent,
  type AppUpdateCheck,
  type AppUpdateProgress,
} from "@/lib/AppUpdate";
import { checkAppUpdate, installAppUpdate, restartApp } from "@/lib/AppUpdateNative";
import { isTauriRuntime } from "@/lib/native";

export type AppUpdateStatus =
  | "idle"
  | "checking"
  | "current"
  | "available"
  | "downloading"
  | "installing"
  | "ready"
  | "unsupported"
  | "error";

const UPDATE_PROGRESS_EVENT = "app-update://progress";

export function useAppUpdate() {
  const [status, setStatus] = useState<AppUpdateStatus>("idle");
  const [check, setCheck] = useState<AppUpdateCheck | null>(null);
  const [progress, setProgress] = useState<AppUpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauriRuntime()) {
      setStatus("unsupported");
      return;
    }

    let disposed = false;
    let unlistenProgress: (() => void) | undefined;
    void listen<AppUpdateProgress>(UPDATE_PROGRESS_EVENT, (event) => {
      if (disposed) return;
      setProgress(event.payload);
      if (event.payload.phase === "downloading") setStatus("downloading");
      if (event.payload.phase === "installing") setStatus("installing");
      if (event.payload.phase === "installed") setStatus("ready");
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
        return;
      }
      unlistenProgress = unlisten;
    });

    return () => {
      disposed = true;
      unlistenProgress?.();
    };
  }, []);

  const checkNow = useCallback(async () => {
    if (!isTauriRuntime()) {
      setStatus("unsupported");
      return;
    }

    setStatus("checking");
    setError(null);
    setProgress(null);
    try {
      const result = await checkAppUpdate();
      setCheck(result);
      if (result?.platformStrategy === "store") {
        setStatus("unsupported");
        return;
      }
      setStatus(result?.available ? "available" : "current");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, []);

  const installNow = useCallback(async () => {
    if (!isTauriRuntime()) {
      setStatus("unsupported");
      return;
    }

    setStatus("downloading");
    setError(null);
    try {
      const result = await installAppUpdate();
      if (result?.platformStrategy === "store") {
        setStatus("unsupported");
        return;
      }
      setStatus(result?.installed ? "ready" : "current");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, []);

  const restartNow = useCallback(async () => {
    await restartApp();
  }, []);

  const scale = useMemo(
    () => classifyUpdateScale(check?.currentVersion ?? "", check?.version ?? null),
    [check?.currentVersion, check?.version],
  );

  return {
    check,
    checkNow,
    error,
    installNow,
    percent: progressPercent(progress),
    progress,
    restartNow,
    scale,
    status,
  };
}
