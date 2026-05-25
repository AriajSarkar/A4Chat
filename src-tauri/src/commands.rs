use std::{
    net::{IpAddr, UdpSocket},
    time::Duration,
};

use anyhow::{anyhow, Context};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE, RETRY_AFTER};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::AppHandle;

use crate::storage;

#[derive(Debug, Serialize)]
pub struct AppHealth {
    platform: String,
    version: String,
    database_path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSettings {
    pub id: String,
    pub label: String,
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
    pub enabled: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionProvider {
    id: String,
    label: String,
    base_url: String,
    api_key: Option<String>,
    model: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionMessage {
    role: String,
    content: serde_json::Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionRequest {
    pub provider: CompletionProvider,
    pub messages: Vec<CompletionMessage>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionResponse {
    pub content: String,
    pub reasoning: Option<String>,
    pub model: Option<String>,
    pub input_tokens: Option<i64>,
    pub output_tokens: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationSnapshot {
    pub id: String,
    pub title: String,
    pub provider_id: String,
    pub model: Option<String>,
    pub messages: Vec<MessageSnapshot>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageSnapshot {
    pub id: String,
    pub role: String,
    pub content: String,
    pub reasoning: Option<String>,
    pub token_count: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedConversation {
    pub id: String,
    pub title: String,
    pub updated_at: i64,
    pub provider_id: String,
    pub model: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub reasoning: Option<String>,
    pub token_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderModelRow {
    pub provider_id: String,
    pub model_id: String,
    pub display_name: String,
    pub is_favorite: bool,
    pub last_seen_at: i64,
}

#[tauri::command]
pub fn app_health(app: AppHandle) -> Result<AppHealth, String> {
    let database_path = storage::database_path(&app).map_err(to_command_error)?;
    storage::connect(&app).map_err(to_command_error)?;

    Ok(AppHealth {
        platform: std::env::consts::OS.to_owned(),
        version: app.package_info().version.to_string(),
        database_path: database_path.display().to_string(),
    })
}

#[tauri::command]
pub fn list_provider_settings(app: AppHandle) -> Result<Vec<ProviderSettings>, String> {
    let connection = storage::connect(&app).map_err(to_command_error)?;
    storage::list_provider_settings(&connection).map_err(to_command_error)
}

#[tauri::command]
pub fn save_provider_settings(
    app: AppHandle,
    providers: Vec<ProviderSettings>,
) -> Result<(), String> {
    let mut connection = storage::connect(&app).map_err(to_command_error)?;
    storage::save_provider_settings(&mut connection, &providers).map_err(to_command_error)
}

#[tauri::command]
pub async fn send_chat_completion(
    request: CompletionRequest,
) -> Result<CompletionResponse, String> {
    request.validate().map_err(to_command_error)?;

    let endpoint = chat_completions_endpoint(&request.provider.base_url);
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert("x-title", HeaderValue::from_static("A4Chat"));

    if let Some(api_key) = request
        .provider
        .api_key
        .as_deref()
        .filter(|key| !key.is_empty())
    {
        let value = HeaderValue::from_str(&format!("Bearer {api_key}"))
            .context("provider API key contains invalid header characters")
            .map_err(to_command_error)?;
        headers.insert(AUTHORIZATION, value);
    }

    let body = json!({
        "model": request.provider.model,
        "messages": request.messages,
        "temperature": request.temperature.unwrap_or(0.7),
        "max_tokens": request.max_tokens.unwrap_or(2048),
        "stream": false
    });

    let response = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .context("unable to build HTTP client")
        .map_err(to_command_error)?
        .post(endpoint)
        .headers(headers)
        .json(&body)
        .send()
        .await
        .context("provider request failed")
        .map_err(to_command_error)?;

    let status = response.status();
    let headers = response.headers().clone();

    if !status.is_success() {
        let raw = response
            .text()
            .await
            .context("provider returned invalid error body")
            .map_err(to_command_error)?;
        let payload = serde_json::from_str::<Value>(&raw).unwrap_or_else(|_| {
            if raw.trim().is_empty() {
                json!({})
            } else {
                json!({"error": {"message": raw}})
            }
        });

        return Err(provider_error_message(
            &payload,
            status,
            &headers,
            "provider rejected the request",
        ));
    }

    let payload = response
        .json::<Value>()
        .await
        .context("provider returned invalid JSON")
        .map_err(to_command_error)?;

    parse_completion_response(payload).map_err(to_command_error)
}

#[tauri::command]
pub fn save_conversation_snapshot(
    app: AppHandle,
    snapshot: ConversationSnapshot,
) -> Result<(), String> {
    let mut connection = storage::connect(&app).map_err(to_command_error)?;
    storage::save_conversation_snapshot(&mut connection, &snapshot).map_err(to_command_error)
}

#[tauri::command]
pub fn list_conversations(app: AppHandle) -> Result<Vec<SavedConversation>, String> {
    let connection = storage::connect(&app).map_err(to_command_error)?;
    storage::list_conversations(&connection).map_err(to_command_error)
}

#[tauri::command]
pub fn load_conversation_messages(
    app: AppHandle,
    conversation_id: String,
) -> Result<Vec<SavedMessage>, String> {
    let connection = storage::connect(&app).map_err(to_command_error)?;
    storage::load_conversation_messages(&connection, &conversation_id).map_err(to_command_error)
}

#[tauri::command]
pub fn delete_conversation(app: AppHandle, conversation_id: String) -> Result<(), String> {
    let connection = storage::connect(&app).map_err(to_command_error)?;
    storage::delete_conversation(&connection, &conversation_id).map_err(to_command_error)
}

#[tauri::command]
pub fn rename_conversation(
    app: AppHandle,
    conversation_id: String,
    new_title: String,
) -> Result<(), String> {
    let connection = storage::connect(&app).map_err(to_command_error)?;
    storage::rename_conversation(&connection, &conversation_id, &new_title)
        .map_err(to_command_error)
}

#[tauri::command]
pub fn resolve_pairing_base_url(base_url: String) -> Result<String, String> {
    let mut url = reqwest::Url::parse(&base_url)
        .map_err(|error| format!("invalid provider base URL: {error}"))?;

    let host = url.host_str().unwrap_or_default().to_lowercase();
    if matches!(host.as_str(), "localhost" | "127.0.0.1" | "0.0.0.0" | "::1") {
        if let Some(local_ip) = local_network_ip() {
            let host = local_ip.to_string();
            let _ = url.set_host(Some(&host));
        }
    }

    Ok(url.to_string())
}

#[tauri::command]
pub async fn detect_provider_models(
    app: AppHandle,
    provider_id: String,
    base_url: String,
    api_key: Option<String>,
) -> Result<Vec<ProviderModelRow>, String> {
    let mut endpoint = models_endpoint(&base_url);
    if provider_id == "google-gemini" {
        endpoint = endpoint.replace("/openai/models", "/models");
        if let Some(key) = &api_key {
            endpoint.push_str(&format!("?key={}", key));
        }
    } else if provider_id == "comfyui" {
        let trimmed = base_url.trim().trim_end_matches('/');
        endpoint = format!("{trimmed}/object_info/CheckpointLoaderSimple");
    }

    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(
        "HTTP-Referer",
        HeaderValue::from_static("https://github.com/AriajSarkar/A4Chat"),
    );
    headers.insert("X-Title", HeaderValue::from_static("A4Chat"));

    if provider_id != "google-gemini" {
        if let Some(key) = api_key.as_deref().filter(|k| !k.is_empty()) {
            let value = HeaderValue::from_str(&format!("Bearer {key}"))
                .context("API key contains invalid header characters")
                .map_err(to_command_error)?;
            headers.insert(AUTHORIZATION, value);
        }
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .context("unable to build HTTP client")
        .map_err(to_command_error)?;

    let response = client
        .get(&endpoint)
        .headers(headers)
        .send()
        .await
        .context("model discovery request failed")
        .map_err(to_command_error)?;

    let status = response.status();
    let headers = response.headers().clone();

    if !status.is_success() {
        let raw = response
            .text()
            .await
            .context("provider returned invalid error body")
            .map_err(to_command_error)?;
        let payload = serde_json::from_str::<Value>(&raw).unwrap_or_else(|_| {
            if raw.trim().is_empty() {
                json!({})
            } else {
                json!({"error": {"message": raw}})
            }
        });

        return Err(provider_error_message(
            &payload,
            status,
            &headers,
            "provider rejected the models request",
        ));
    }

    let payload = response
        .json::<Value>()
        .await
        .context("provider returned invalid JSON")
        .map_err(to_command_error)?;

    let now = storage::unix_timestamp();
    
    let models: Vec<ProviderModelRow> = if provider_id == "google-gemini" {
        payload
            .get("models")
            .and_then(Value::as_array)
            .map(|arr| {
                arr.iter()
                    .filter_map(|entry| {
                        let name = entry.get("name").and_then(Value::as_str)?;
                        let id = name.trim_start_matches("models/");
                        let display_name = entry
                            .get("displayName")
                            .and_then(Value::as_str)
                            .unwrap_or(id);
                        Some(ProviderModelRow {
                            provider_id: provider_id.clone(),
                            model_id: id.to_owned(),
                            display_name: display_name.to_owned(),
                            is_favorite: false,
                            last_seen_at: now,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default()
    } else if provider_id == "comfyui" {
        payload
            .get("CheckpointLoaderSimple")
            .and_then(|v| v.get("input"))
            .and_then(|v| v.get("required"))
            .and_then(|v| v.get("ckpt_name"))
            .and_then(Value::as_array)
            .and_then(|arr| arr.first())
            .and_then(Value::as_array)
            .map(|arr| {
                arr.iter()
                    .filter_map(|entry| {
                        let id = entry.as_str()?;
                        let display_name = id.split('.').next().unwrap_or(id).replace(['_', '-'], " ");
                        Some(ProviderModelRow {
                            provider_id: provider_id.clone(),
                            model_id: id.to_owned(),
                            display_name,
                            is_favorite: false,
                            last_seen_at: now,
                        })
                    })
                    .collect()
            })
            .unwrap_or_else(|| {
                vec![ProviderModelRow {
                    provider_id: provider_id.clone(),
                    model_id: "default-workflow".to_string(),
                    display_name: "Default Text-to-Image".to_string(),
                    is_favorite: false,
                    last_seen_at: now,
                }]
            })
    } else {
        let data_array = payload
            .get("data")
            .and_then(Value::as_array)
            .or_else(|| payload.as_array());

        data_array
            .map(|arr| {
                arr.iter()
                    .filter_map(|entry| {
                        let id = entry.get("id").and_then(Value::as_str)?;
                        Some(ProviderModelRow {
                            provider_id: provider_id.clone(),
                            model_id: id.to_owned(),
                            display_name: id.to_owned(),
                            is_favorite: false,
                            last_seen_at: now,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default()
    };

    let mut connection = storage::connect(&app).map_err(to_command_error)?;
    storage::save_provider_models(&mut connection, &provider_id, &models)
        .map_err(to_command_error)?;

    // Return the full list (with preserved favorites) from DB
    storage::list_provider_models(&connection, &provider_id).map_err(to_command_error)
}

#[tauri::command]
pub fn list_provider_models(
    app: AppHandle,
    provider_id: String,
) -> Result<Vec<ProviderModelRow>, String> {
    let connection = storage::connect(&app).map_err(to_command_error)?;
    storage::list_provider_models(&connection, &provider_id).map_err(to_command_error)
}

#[tauri::command]
pub fn toggle_model_favorite(
    app: AppHandle,
    provider_id: String,
    model_id: String,
    is_favorite: bool,
) -> Result<(), String> {
    let connection = storage::connect(&app).map_err(to_command_error)?;
    storage::toggle_model_favorite(&connection, &provider_id, &model_id, is_favorite)
        .map_err(to_command_error)
}

fn to_command_error(error: anyhow::Error) -> String {
    error.to_string()
}

fn provider_error_message(
    payload: &Value,
    status: reqwest::StatusCode,
    headers: &HeaderMap,
    fallback: &str,
) -> String {
    let error = payload.get("error").unwrap_or(payload);
    let metadata = error.get("metadata");

    let message = metadata
        .and_then(|value| value.get("raw"))
        .and_then(Value::as_str)
        .or_else(|| error.get("message").and_then(Value::as_str))
        .or_else(|| payload.get("message").and_then(Value::as_str))
        .unwrap_or(fallback);

    let provider_name = metadata
        .and_then(|value| value.get("provider_name"))
        .and_then(Value::as_str)
        .or_else(|| error.get("provider_name").and_then(Value::as_str))
        .or_else(|| payload.get("provider_name").and_then(Value::as_str));

    let retry_after_seconds = metadata
        .and_then(|value| value.get("retry_after_seconds_raw"))
        .and_then(parse_retry_after_seconds_value)
        .or_else(|| {
            metadata
                .and_then(|value| value.get("retry_after_seconds"))
                .and_then(parse_retry_after_seconds_value)
        })
        .or_else(|| {
            error
                .get("retry_after_seconds")
                .and_then(parse_retry_after_seconds_value)
        })
        .or_else(|| {
            payload
                .get("retry_after_seconds")
                .and_then(parse_retry_after_seconds_value)
        })
        .or_else(|| {
            headers
                .get(RETRY_AFTER)
                .and_then(|value| value.to_str().ok())
                .and_then(parse_retry_after_seconds_str)
        });

    let mut output = String::new();
    if let Some(provider_name) = provider_name {
        if !message
            .to_lowercase()
            .contains(&provider_name.to_lowercase())
        {
            output.push_str(provider_name);
            output.push_str(": ");
        }
    }

    output.push_str(message);

    if let Some(retry_after_seconds) = retry_after_seconds {
        output.push_str(&format!(" (retry after {retry_after_seconds}s)"));
    } else if status.as_u16() == 429 {
        output.push_str(" (rate limited)");
    }

    output
}

fn parse_retry_after_seconds_value(value: &Value) -> Option<u64> {
    value
        .as_u64()
        .or_else(|| {
            value
                .as_str()
                .and_then(|raw| raw.trim().parse::<u64>().ok())
        })
        .map(|seconds| seconds.max(1))
}

fn parse_retry_after_seconds_str(raw: &str) -> Option<u64> {
    raw.trim().parse::<u64>().ok().map(|seconds| seconds.max(1))
}

fn local_network_ip() -> Option<IpAddr> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    if socket.connect("8.8.8.8:80").is_err() {
        return None;
    }

    socket.local_addr().ok().map(|address| address.ip())
}

impl CompletionRequest {
    pub fn validate(&self) -> anyhow::Result<()> {
        if self.provider.base_url.trim().is_empty() {
            return Err(anyhow!("provider base URL is required"));
        }

        if self.provider.model.trim().is_empty() {
            return Err(anyhow!("provider model is required"));
        }

        if self.messages.is_empty() {
            return Err(anyhow!("at least one message is required"));
        }

        if self.messages.iter().any(|message| {
            if let Some(s) = message.content.as_str() {
                s.trim().is_empty()
            } else if let Some(arr) = message.content.as_array() {
                arr.is_empty()
            } else {
                true
            }
        }) {
            return Err(anyhow!("message content cannot be empty"));
        }

        Ok(())
    }
}

pub fn chat_completions_endpoint(base_url: &str) -> String {
    let trimmed = base_url.trim().trim_end_matches('/');

    if trimmed.ends_with("/chat/completions") {
        trimmed.to_owned()
    } else {
        let has_path = trimmed
            .split_once("://")
            .and_then(|(_, rest)| rest.split_once('/'))
            .is_some();

        if has_path {
            format!("{trimmed}/chat/completions")
        } else {
            format!("{trimmed}/v1/chat/completions")
        }
    }
}

pub fn models_endpoint(base_url: &str) -> String {
    let trimmed = base_url.trim().trim_end_matches('/');

    if trimmed.ends_with("/models") {
        trimmed.to_owned()
    } else {
        format!("{trimmed}/models")
    }
}

#[cfg(test)]
mod tests {
    use super::chat_completions_endpoint;

    #[test]
    fn infers_v1_for_bare_base_urls() {
        assert_eq!(
            chat_completions_endpoint("http://localhost:1234"),
            "http://localhost:1234/v1/chat/completions"
        );
        assert_eq!(
            chat_completions_endpoint("http://localhost:1234/"),
            "http://localhost:1234/v1/chat/completions"
        );
    }

    #[test]
    fn preserves_versioned_base_urls() {
        assert_eq!(
            chat_completions_endpoint("http://localhost:1234/v1"),
            "http://localhost:1234/v1/chat/completions"
        );
        assert_eq!(
            chat_completions_endpoint("https://openrouter.ai/api/v1"),
            "https://openrouter.ai/api/v1/chat/completions"
        );
    }

    #[test]
    fn preserves_full_chat_completions_endpoint() {
        assert_eq!(
            chat_completions_endpoint("https://openrouter.ai/api/v1/chat/completions"),
            "https://openrouter.ai/api/v1/chat/completions"
        );
    }
}

pub fn parse_completion_response(payload: Value) -> anyhow::Result<CompletionResponse> {
    let choice = payload
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|choices| choices.first())
        .context("provider response did not include choices")?;

    let message = choice
        .get("message")
        .context("provider response did not include a message")?;

    let content = message
        .get("content")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_owned();

    let reasoning = message
        .get("reasoning")
        .or_else(|| message.get("reasoning_content"))
        .and_then(Value::as_str)
        .map(ToOwned::to_owned);

    let usage = payload.get("usage").unwrap_or(&Value::Null);

    Ok(CompletionResponse {
        content,
        reasoning,
        model: payload
            .get("model")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned),
        input_tokens: usage
            .get("prompt_tokens")
            .and_then(Value::as_i64)
            .or_else(|| usage.get("input_tokens").and_then(Value::as_i64)),
        output_tokens: usage
            .get("completion_tokens")
            .and_then(Value::as_i64)
            .or_else(|| usage.get("output_tokens").and_then(Value::as_i64)),
    })
}

#[tauri::command]
#[allow(unused_variables)]
pub fn get_default_save_dir(app: tauri::AppHandle) -> String {
    #[cfg(target_os = "android")]
    {
        return "/storage/emulated/0/DCIM/A4chat".to_string();
    }
    
    #[cfg(not(target_os = "android"))]
    {
        use tauri::Manager;
        if let Ok(path) = app.path().download_dir() {
            return path.to_string_lossy().to_string();
        }
        return "".to_string();
    }
}

#[tauri::command]
pub fn save_file_to_disk(path: String, bytes: Vec<u8>) -> Result<(), String> {
    use std::fs;
    use std::path::Path;
    
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    
    fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(())
}
