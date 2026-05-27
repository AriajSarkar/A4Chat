import { invoke } from "@tauri-apps/api/core";

import type { AppUpdateCheck, AppUpdateInstallResult } from "@/lib/AppUpdate";
import { isTauriRuntime } from "@/lib/native";

export async function checkAppUpdate() {
    if (!isTauriRuntime()) return null;
    return invoke<AppUpdateCheck>("check_app_update");
}

export async function installAppUpdate() {
    if (!isTauriRuntime()) return null;
    return invoke<AppUpdateInstallResult>("install_app_update");
}

export async function restartApp() {
    if (!isTauriRuntime()) return;
    await invoke("restart_app");
}
