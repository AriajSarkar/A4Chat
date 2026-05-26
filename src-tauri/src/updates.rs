use serde::Serialize;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateCheck {
    pub available: bool,
    pub current_version: String,
    pub version: Option<String>,
    pub date: Option<String>,
    pub body: Option<String>,
    pub target: Option<String>,
    pub download_url: Option<String>,
    pub channel: UpdateChannel,
    pub platform_strategy: UpdatePlatformStrategy,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateInstallResult {
    pub installed: bool,
    pub version: Option<String>,
    pub restart_required: bool,
    pub platform_strategy: UpdatePlatformStrategy,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateProgress {
    pub phase: UpdateProgressPhase,
    pub downloaded_bytes: u64,
    pub content_length: Option<u64>,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum UpdateChannel {
    GithubRelease,
    StoreManaged,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum UpdatePlatformStrategy {
    TauriUpdater,
    Store,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum UpdateProgressPhase {
    Checking,
    Downloading,
    Downloaded,
    Installing,
    Installed,
}

const UPDATE_PROGRESS_EVENT: &str = "app-update://progress";

#[tauri::command]
pub async fn check_app_update(app: AppHandle) -> Result<AppUpdateCheck, String> {
    check_app_update_inner(app).await.map_err(to_update_error)
}

#[tauri::command]
pub async fn install_app_update(app: AppHandle) -> Result<AppUpdateInstallResult, String> {
    install_app_update_inner(app).await.map_err(to_update_error)
}

#[tauri::command]
pub fn restart_app(app: AppHandle) -> Result<(), String> {
    app.restart();
}

#[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
async fn check_app_update_inner(app: AppHandle) -> tauri_plugin_updater::Result<AppUpdateCheck> {
    use std::time::Duration;
    use tauri::Emitter;
    use tauri_plugin_updater::UpdaterExt;

    let _ = app.emit(
        UPDATE_PROGRESS_EVENT,
        AppUpdateProgress {
            phase: UpdateProgressPhase::Checking,
            downloaded_bytes: 0,
            content_length: None,
        },
    );

    let current_version = app.package_info().version.to_string();
    let update = app
        .updater_builder()
        .timeout(Duration::from_secs(30))
        .build()?
        .check()
        .await?;

    Ok(match update {
        Some(update) => AppUpdateCheck {
            available: true,
            current_version,
            version: Some(update.version),
            date: update.date.map(|date| date.to_string()),
            body: update.body,
            target: Some(update.target),
            download_url: Some(update.download_url.to_string()),
            channel: UpdateChannel::GithubRelease,
            platform_strategy: UpdatePlatformStrategy::TauriUpdater,
        },
        None => AppUpdateCheck {
            available: false,
            current_version,
            version: None,
            date: None,
            body: None,
            target: None,
            download_url: None,
            channel: UpdateChannel::GithubRelease,
            platform_strategy: UpdatePlatformStrategy::TauriUpdater,
        },
    })
}

#[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
async fn install_app_update_inner(
    app: AppHandle,
) -> tauri_plugin_updater::Result<AppUpdateInstallResult> {
    use std::{
        sync::{
            atomic::{AtomicU64, Ordering},
            Arc,
        },
        time::Duration,
    };
    use tauri::Emitter;
    use tauri_plugin_updater::UpdaterExt;

    let _ = app.emit(
        UPDATE_PROGRESS_EVENT,
        AppUpdateProgress {
            phase: UpdateProgressPhase::Checking,
            downloaded_bytes: 0,
            content_length: None,
        },
    );

    let update = app
        .updater_builder()
        .timeout(Duration::from_secs(30))
        .build()?
        .check()
        .await?;

    let Some(update) = update else {
        return Ok(AppUpdateInstallResult {
            installed: false,
            version: None,
            restart_required: false,
            platform_strategy: UpdatePlatformStrategy::TauriUpdater,
        });
    };

    let version = update.version.clone();
    let downloaded = Arc::new(AtomicU64::new(0));
    let progress_app = app.clone();
    let progress_downloaded = Arc::clone(&downloaded);

    let bytes = update
        .download(
            move |chunk_length, content_length| {
                let next_downloaded = progress_downloaded
                    .fetch_add(chunk_length as u64, Ordering::Relaxed)
                    + chunk_length as u64;
                let _ = progress_app.emit(
                    UPDATE_PROGRESS_EVENT,
                    AppUpdateProgress {
                        phase: UpdateProgressPhase::Downloading,
                        downloaded_bytes: next_downloaded,
                        content_length,
                    },
                );
            },
            {
                let finished_app = app.clone();
                let downloaded = Arc::clone(&downloaded);
                move || {
                    let downloaded_bytes = downloaded.load(Ordering::Relaxed);
                    let _ = finished_app.emit(
                        UPDATE_PROGRESS_EVENT,
                        AppUpdateProgress {
                            phase: UpdateProgressPhase::Downloaded,
                            downloaded_bytes,
                            content_length: Some(downloaded_bytes),
                        },
                    );
                }
            },
        )
        .await?;

    let _ = app.emit(
        UPDATE_PROGRESS_EVENT,
        AppUpdateProgress {
            phase: UpdateProgressPhase::Installing,
            downloaded_bytes: downloaded.load(Ordering::Relaxed),
            content_length: Some(downloaded.load(Ordering::Relaxed)),
        },
    );

    update.install(bytes)?;

    let _ = app.emit(
        UPDATE_PROGRESS_EVENT,
        AppUpdateProgress {
            phase: UpdateProgressPhase::Installed,
            downloaded_bytes: downloaded.load(Ordering::Relaxed),
            content_length: Some(downloaded.load(Ordering::Relaxed)),
        },
    );

    Ok(AppUpdateInstallResult {
        installed: true,
        version: Some(version),
        restart_required: true,
        platform_strategy: UpdatePlatformStrategy::TauriUpdater,
    })
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
async fn check_app_update_inner(app: AppHandle) -> Result<AppUpdateCheck, String> {
    Ok(AppUpdateCheck {
        available: false,
        current_version: app.package_info().version.to_string(),
        version: None,
        date: None,
        body: None,
        target: None,
        download_url: None,
        channel: UpdateChannel::StoreManaged,
        platform_strategy: UpdatePlatformStrategy::Store,
    })
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
async fn install_app_update_inner(app: AppHandle) -> Result<AppUpdateInstallResult, String> {
    let _ = app;
    Ok(AppUpdateInstallResult {
        installed: false,
        version: None,
        restart_required: false,
        platform_strategy: UpdatePlatformStrategy::Store,
    })
}

pub fn progress_percent(downloaded_bytes: u64, content_length: Option<u64>) -> Option<u8> {
    let content_length = content_length?;
    if content_length == 0 {
        return None;
    }

    let percent = downloaded_bytes.saturating_mul(100) / content_length;
    Some(percent.min(100) as u8)
}

fn to_update_error(error: impl std::fmt::Display) -> String {
    error.to_string()
}
