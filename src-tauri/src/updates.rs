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
    GithubApk,
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
    let update = app.updater_builder().timeout(Duration::from_secs(30)).build()?.check().await?;

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

    let update = app.updater_builder().timeout(Duration::from_secs(30)).build()?.check().await?;

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
const GITHUB_RELEASES_API: &str = "https://api.github.com/repos/AriajSarkar/A4Chat/releases/latest";

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
#[derive(serde::Deserialize)]
struct GithubRelease {
    tag_name: String,
    body: Option<String>,
    published_at: Option<String>,
    assets: Vec<GithubAsset>,
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
#[derive(serde::Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn parse_semver(version: &str) -> Option<(u32, u32, u32)> {
    let v = version.trim_start_matches('v');
    let mut parts = v.splitn(3, '.');
    Some((
        parts.next()?.parse().ok()?,
        parts.next()?.parse().ok()?,
        parts.next()?.split(&['-', '+'][..]).next()?.parse().ok()?,
    ))
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn is_newer(current: &str, latest: &str) -> bool {
    match (parse_semver(current), parse_semver(latest)) {
        (Some(c), Some(l)) => l > c,
        _ => false,
    }
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn device_arch() -> &'static str {
    match std::env::consts::ARCH {
        "aarch64" => "aarch64",
        "arm" | "armv7" => "armv7",
        "x86" | "i686" => "i686",
        "x86_64" => "x86_64",
        _ => "universal",
    }
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn find_apk_url(assets: &[GithubAsset], arch: &str, tag: &str) -> Option<String> {
    let version = tag.trim_start_matches('v');
    let patterns = [
        format!("A4Chat_{version}_{arch}.apk"),
        format!("A4Chat_v{version}_{arch}.apk"),
        format!("A4Chat_{version}_universal.apk"),
        format!("A4Chat_v{version}_universal.apk"),
    ];
    for pattern in &patterns {
        if let Some(asset) = assets.iter().find(|a| a.name == *pattern) {
            return Some(asset.browser_download_url.clone());
        }
    }
    assets
        .iter()
        .find(|a| a.name.ends_with(".apk"))
        .map(|a| a.browser_download_url.clone())
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
async fn fetch_latest_release() -> Result<GithubRelease, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(GITHUB_RELEASES_API)
        .header("User-Agent", "A4Chat-Updater")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("Failed to check for updates: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("GitHub API returned status {}", resp.status()));
    }
    resp.json::<GithubRelease>()
        .await
        .map_err(|e| format!("Failed to parse release data: {e}"))
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn clean_release_body(body: Option<String>) -> Option<String> {
    let raw = body?;
    let lower = raw.to_lowercase();
    let start = lower
        .find("## what's changed")
        .or_else(|| lower.find("## what's changed"))
        .or_else(|| lower.find("### what's changed"))?;
    let section = &raw[start..];
    let end = section.to_lowercase().find("full changelog").unwrap_or(section.len());
    let trimmed = section[..end].trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
async fn check_app_update_inner(app: AppHandle) -> Result<AppUpdateCheck, String> {
    use tauri::Emitter;

    let _ = app.emit(
        UPDATE_PROGRESS_EVENT,
        AppUpdateProgress {
            phase: UpdateProgressPhase::Checking,
            downloaded_bytes: 0,
            content_length: None,
        },
    );

    let current_version = app.package_info().version.to_string();
    let release = fetch_latest_release().await?;
    let release_version = release.tag_name.trim_start_matches('v').to_string();
    let arch = device_arch();
    let download_url = find_apk_url(&release.assets, arch, &release.tag_name);
    let available = is_newer(&current_version, &release_version) && download_url.is_some();

    Ok(AppUpdateCheck {
        available,
        current_version,
        version: if available {
            Some(release_version)
        } else {
            None
        },
        date: release.published_at,
        body: clean_release_body(release.body),
        target: Some(format!("android-{arch}")),
        download_url: if available {
            download_url
        } else {
            None
        },
        channel: UpdateChannel::GithubRelease,
        platform_strategy: UpdatePlatformStrategy::GithubApk,
    })
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
async fn install_app_update_inner(app: AppHandle) -> Result<AppUpdateInstallResult, String> {
    use tauri_plugin_opener::OpenerExt;

    let release = fetch_latest_release().await?;
    let current_version = app.package_info().version.to_string();
    let release_version = release.tag_name.trim_start_matches('v').to_string();

    if !is_newer(&current_version, &release_version) {
        return Ok(AppUpdateInstallResult {
            installed: false,
            version: None,
            restart_required: false,
            platform_strategy: UpdatePlatformStrategy::GithubApk,
        });
    }

    let arch = device_arch();
    let download_url = find_apk_url(&release.assets, arch, &release.tag_name)
        .ok_or("No compatible APK found in the latest release")?;

    // Resolve GitHub's redirect chain to get the final CDN URL.
    // Android's download manager can stall on multi-hop redirects.
    let client = reqwest::Client::new();
    let resolved = client
        .head(&download_url)
        .header("User-Agent", "A4Chat-Updater")
        .send()
        .await
        .map_err(|e| format!("Failed to resolve download URL: {e}"))?;
    let final_url = resolved.url().to_string();

    app.opener()
        .open_url(&final_url, None::<&str>)
        .map_err(|e| format!("Failed to open download URL: {e}"))?;

    Ok(AppUpdateInstallResult {
        installed: false,
        version: Some(release_version),
        restart_required: false,
        platform_strategy: UpdatePlatformStrategy::GithubApk,
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
