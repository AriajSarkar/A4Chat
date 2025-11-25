// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod providers;
mod streaming;

use sqlx::sqlite::SqlitePoolOptions;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

// State struct to hold the database pool
pub struct AppState {
    pub db: sqlx::SqlitePool,
}

// Cleanup old log files
fn cleanup_old_logs(log_dir: &PathBuf, keep_days: u64) {
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    let cutoff = now - Duration::from_secs(keep_days * 24 * 60 * 60);

    if let Ok(entries) = fs::read_dir(log_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(modified) = metadata.modified() {
                    if let Ok(modified_duration) = modified.duration_since(UNIX_EPOCH) {
                        if modified_duration < cutoff {
                            let _ = fs::remove_file(entry.path());
                            log::info!("Cleaned up old log file: {:?}", entry.path());
                        }
                    }
                }
            }
        }
    }
}

/// Shared app builder configuration for both desktop and mobile
pub fn build_app() -> tauri::Builder<tauri::Wry> {
    dotenv::dotenv().ok();

    // Set up logging - different approaches for desktop vs mobile
    #[cfg(not(mobile))]
    {
        // Desktop: Use file logging with hourly rotation
        let log_dir = PathBuf::from("./logs");
        if std::fs::create_dir_all(&log_dir).is_ok() {
            let file_appender = tracing_appender::rolling::hourly(log_dir.clone(), "a4chat.log");
            let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

            tracing_subscriber::fmt()
                .with_writer(non_blocking)
                .with_ansi(false)
                .with_max_level(tracing::Level::DEBUG)
                .init();

            log::info!("A4Chat starting (desktop)...");
            cleanup_old_logs(&log_dir, 7);
        } else {
            // Fallback to stdout if file logging fails
            tracing_subscriber::fmt()
                .with_ansi(false)
                .with_max_level(tracing::Level::DEBUG)
                .init();
            log::warn!("Failed to create logs directory, using stdout");
        }
    }

    #[cfg(mobile)]
    {
        // Mobile: Use stdout logging (Android logcat will capture this)
        tracing_subscriber::fmt()
            .with_ansi(false)
            .with_max_level(tracing::Level::DEBUG)
            .init();
        log::info!("A4Chat starting (mobile)...");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Auto-open DevTools in development mode (desktop only)
            #[cfg(all(debug_assertions, not(mobile)))]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            // Initialize database asynchronously
            tauri::async_runtime::spawn(async move {
                // Resolve AppData directory
                let app_data_dir = app_handle
                    .path()
                    .app_local_data_dir()
                    .expect("failed to resolve app data dir");

                // Ensure directory exists
                if !app_data_dir.exists() {
                    fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");
                }

                let db_path = app_data_dir.join("data.db");
                let db_url = format!("sqlite:{}", db_path.to_string_lossy());

                // If DB doesn't exist in AppData, copy from bundled/local source
                if !db_path.exists() {
                    let possible_sources =
                        vec![PathBuf::from("src-tauri/data.db"), PathBuf::from("data.db")];

                    for src in possible_sources {
                        if src.exists() {
                            fs::copy(&src, &db_path).expect("failed to copy initial database");
                            log::info!("Initialized database at {:?}", db_path);
                            break;
                        }
                    }
                }

                log::info!("Connecting to database at {}", db_url);

                let pool = SqlitePoolOptions::new()
                    .max_connections(5)
                    .connect(&db_url)
                    .await
                    .expect("Failed to connect to database");

                log::info!("Database connected successfully");
                app_handle.manage(AppState { db: pool });
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::llm::llm_generate,
            commands::llm::cancel_stream,
            commands::db::get_conversations,
            commands::db::get_messages,
            commands::db::save_message,
            commands::db::create_conversation,
            commands::db::delete_all_data,
            commands::config::get_api_key,
            commands::config::set_api_key,
        ])
}

/// Mobile entry point
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    build_app()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
