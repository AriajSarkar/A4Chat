use crate::streaming::stream_manager;
use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;
use tauri::AppHandle;

#[derive(Serialize, Deserialize, Debug)]
pub struct OpenRouterRequest {
    pub model: String,
    pub messages: Vec<Message>,
    pub stream: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Deserialize, Debug)]
struct OpenRouterResponseChunk {
    choices: Vec<OpenRouterChoice>,
}

#[derive(Deserialize, Debug)]
struct OpenRouterChoice {
    delta: OpenRouterDelta,
    finish_reason: Option<String>,
}

#[derive(Deserialize, Debug)]
struct OpenRouterDelta {
    content: Option<String>,
}

pub async fn generate(
    app: AppHandle,
    stream_id: String,
    request: OpenRouterRequest,
) -> Result<(), String> {
    log::info!(
        "OpenRouter: Starting generation for stream_id={}, model={}",
        stream_id,
        request.model
    );

    let client = Client::new();
    let url = "https://openrouter.ai/api/v1/chat/completions";

    let api_key = env::var("OPENROUTER_API_KEY").unwrap_or_default();
    if api_key.is_empty() {
        log::error!("OpenRouter API Key is missing!");
        return Err("OpenRouter API Key not found".to_string());
    }

    let payload = serde_json::json!({
        "model": request.model,
        "messages": request.messages,
        "stream": true
    });

    log::debug!("OpenRouter: Sending request: {:?}", payload);

    let mut stream = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("HTTP-Referer", "https://a4chat.app")
        .header("X-Title", "A4Chat")
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            log::error!("OpenRouter: Request failed: {}", e);
            e.to_string()
        })?
        .bytes_stream();

    log::info!("OpenRouter: Stream started for stream_id={}", stream_id);

    let mut buffer = String::new();
    let mut token_count = 0;

    while let Some(item) = stream.next().await {
        match item {
            Ok(bytes) => {
                let chunk_str = String::from_utf8_lossy(&bytes);
                buffer.push_str(&chunk_str);

                while let Some(newline_idx) = buffer.find('\n') {
                    let line = buffer[..newline_idx].trim().to_string();
                    buffer.drain(..newline_idx + 1);

                    if line.starts_with("data: ") {
                        let data = &line[6..];

                        if data == "[DONE]" {
                            log::info!(
                                "OpenRouter: Stream completed, tokens={}, stream_id={}",
                                token_count,
                                stream_id
                            );
                            stream_manager::emit_chunk(&app, &stream_id, "", true).await;
                            return Ok(());
                        }

                        match serde_json::from_str::<OpenRouterResponseChunk>(data) {
                            Ok(chunk) => {
                                if let Some(choice) = chunk.choices.first() {
                                    if let Some(content) = &choice.delta.content {
                                        if !content.is_empty() {
                                            token_count += 1;
                                            log::debug!("OpenRouter: Emitting token #{} for stream_id={}: '{}'", 
                                                token_count, stream_id, content);
                                            stream_manager::emit_chunk(
                                                &app, &stream_id, content, false,
                                            )
                                            .await;
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                log::warn!("OpenRouter: Failed to parse chunk: {}", e);
                            }
                        }
                    } else if !line.is_empty() && line.starts_with("{") {
                        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&line) {
                            if let Some(error) = error_json.get("error") {
                                let err_msg = error
                                    .get("message")
                                    .and_then(|m| m.as_str())
                                    .unwrap_or("Unknown error");
                                log::error!("OpenRouter API Error: {}", err_msg);
                                return Err(format!("OpenRouter API Error: {}", err_msg));
                            }
                        }
                    }
                }
            }
            Err(e) => {
                log::error!("OpenRouter: Stream error: {}", e);
                return Err(format!("Stream error: {}", e));
            }
        }
    }

    log::info!(
        "OpenRouter: Stream ended without [DONE], stream_id={}",
        stream_id
    );
    stream_manager::emit_chunk(&app, &stream_id, "", true).await;
    Ok(())
}
