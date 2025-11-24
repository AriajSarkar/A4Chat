use crate::streaming::stream_manager;
use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
    pub options: Option<serde_json::Value>,
}

#[derive(Deserialize, Debug)]
struct OllamaResponse {
    response: String,
    done: bool,
    // total_duration, etc. ignored for now
}

pub async fn generate(
    app: AppHandle,
    stream_id: String,
    request: OllamaRequest,
) -> Result<(), String> {
    let client = Client::new();
    let url = "http://localhost:11434/api/generate";

    let payload = serde_json::json!({
        "model": request.model,
        "prompt": request.prompt,
        "stream": true,
        "options": request.options
    });

    println!("Sending Ollama request to {}: {:?}", url, payload);

    let mut stream = client
        .post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            eprintln!("Ollama Request Failed: {}", e);
            e.to_string()
        })?
        .bytes_stream();

    println!("Ollama request sent, starting stream...");

    while let Some(item) = stream.next().await {
        match item {
            Ok(bytes) => {
                let chunk_str = String::from_utf8_lossy(&bytes);
                // Ollama can send multiple JSON objects in one chunk or split them
                // For simplicity, we assume line-delimited JSON or clean chunks for now.
                // In a robust app, we'd buffer and split by newline.

                for line in chunk_str.split('\n') {
                    if line.trim().is_empty() {
                        continue;
                    }

                    if let Ok(response) = serde_json::from_str::<OllamaResponse>(line) {
                        stream_manager::emit_chunk(
                            &app,
                            &stream_id,
                            &response.response,
                            response.done,
                        )
                        .await;
                        if response.done {
                            return Ok(());
                        }
                    } else {
                        eprintln!("Failed to parse Ollama response: {}", line);
                    }
                }
            }
            Err(e) => {
                return Err(format!("Stream error: {}", e));
            }
        }
    }

    Ok(())
}
