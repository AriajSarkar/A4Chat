use std::fs;
use std::path::PathBuf;
use tauri::{command, AppHandle, Manager};

const CONFIG_FILE: &str = "config.json";

#[derive(serde::Serialize, serde::Deserialize, Default)]
struct AppConfig {
    openrouter_api_key: Option<String>,
}

fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    }

    Ok(app_data_dir.join(CONFIG_FILE))
}

fn read_config(app: &AppHandle) -> Result<AppConfig, String> {
    let config_path = get_config_path(app)?;

    if !config_path.exists() {
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse config file: {}", e))
}

fn write_config(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let config_path = get_config_path(app)?;

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content).map_err(|e| format!("Failed to write config file: {}", e))?;

    log::info!("Config saved to {:?}", config_path);
    Ok(())
}

#[command]
pub fn get_api_key(app: AppHandle) -> Result<String, String> {
    let config = read_config(&app)?;
    Ok(config.openrouter_api_key.unwrap_or_default())
}

#[command]
pub fn set_api_key(app: AppHandle, key: String) -> Result<(), String> {
    let mut config = read_config(&app).unwrap_or_default();

    config.openrouter_api_key = if key.trim().is_empty() {
        None
    } else {
        Some(key.trim().to_string())
    };

    write_config(&app, &config)?;
    log::info!("API key updated successfully");
    Ok(())
}

// Helper function for providers to get API key
pub fn get_stored_api_key(app: &AppHandle) -> Option<String> {
    read_config(app)
        .ok()
        .and_then(|config| config.openrouter_api_key)
}
