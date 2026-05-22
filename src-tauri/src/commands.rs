use std::time::Duration;

use anyhow::{anyhow, Context};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
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

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSettings {
    pub(crate) id: String,
    pub(crate) label: String,
    pub(crate) base_url: String,
    pub(crate) api_key: Option<String>,
    pub(crate) model: String,
    pub(crate) enabled: bool,
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
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionRequest {
    provider: CompletionProvider,
    messages: Vec<CompletionMessage>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionResponse {
    content: String,
    reasoning: Option<String>,
    model: Option<String>,
    input_tokens: Option<i64>,
    output_tokens: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationSnapshot {
    pub(crate) id: String,
    pub(crate) title: String,
    pub(crate) provider_id: String,
    pub(crate) model: Option<String>,
    pub(crate) messages: Vec<MessageSnapshot>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageSnapshot {
    pub(crate) id: String,
    pub(crate) role: String,
    pub(crate) content: String,
    pub(crate) reasoning: Option<String>,
    pub(crate) token_count: Option<i64>,
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
    let payload = response
        .json::<Value>()
        .await
        .context("provider returned invalid JSON")
        .map_err(to_command_error)?;

    if !status.is_success() {
        let message = payload
            .pointer("/error/message")
            .and_then(Value::as_str)
            .unwrap_or("provider rejected the request");
        return Err(format!("{status}: {message}"));
    }

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

fn to_command_error(error: anyhow::Error) -> String {
    error.to_string()
}

impl CompletionRequest {
    fn validate(&self) -> anyhow::Result<()> {
        if self.provider.base_url.trim().is_empty() {
            return Err(anyhow!("provider base URL is required"));
        }

        if self.provider.model.trim().is_empty() {
            return Err(anyhow!("provider model is required"));
        }

        if self.messages.is_empty() {
            return Err(anyhow!("at least one message is required"));
        }

        if self
            .messages
            .iter()
            .any(|message| message.content.trim().is_empty())
        {
            return Err(anyhow!("message content cannot be empty"));
        }

        Ok(())
    }
}

fn chat_completions_endpoint(base_url: &str) -> String {
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

fn parse_completion_response(payload: Value) -> anyhow::Result<CompletionResponse> {
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
