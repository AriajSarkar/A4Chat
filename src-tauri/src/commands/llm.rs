use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmGenerateRequest {
    pub provider: String,
    pub model: String,
    pub prompt: String,
    pub conversation_id: String,
}

#[derive(Serialize)]
pub struct LlmGenerateResponse {
    pub stream_id: String,
}

#[command]
pub async fn llm_generate(
    app: AppHandle,
    request: LlmGenerateRequest,
) -> Result<LlmGenerateResponse, String> {
    // Generate a unique stream ID
    let stream_id = uuid::Uuid::new_v4().to_string();
    let stream_id_clone = stream_id.clone();

    log::info!(
        "LLM Generate: provider={}, model={}, stream_id={}",
        request.provider,
        request.model,
        stream_id
    );

    // Spawn a task to handle the generation
    tauri::async_runtime::spawn(async move {
        log::info!("Starting generation task for stream_id={}", stream_id_clone);

        let result = match request.provider.as_str() {
            "ollama" => {
                use crate::providers::ollama::{self, OllamaRequest};
                let ollama_req = OllamaRequest {
                    model: request.model.clone(),
                    prompt: request.prompt.clone(),
                    stream: true,
                    options: None,
                };
                ollama::generate(app.clone(), stream_id_clone.clone(), ollama_req).await
            }
            "openrouter" => {
                use crate::providers::openrouter::{self, Message, OpenRouterRequest};
                let openrouter_req = OpenRouterRequest {
                    model: request.model.clone(),
                    messages: vec![Message {
                        role: "user".to_string(),
                        content: request.prompt.clone(),
                    }],
                    stream: true,
                };
                openrouter::generate(app.clone(), stream_id_clone.clone(), openrouter_req).await
            }
            _ => {
                log::error!("Unknown provider: {}", request.provider);
                Err(format!("Unknown provider: {}", request.provider))
            }
        };

        if let Err(e) = result {
            log::error!("Generation failed for stream_id={}: {}", stream_id_clone, e);
        } else {
            log::info!(
                "Generation completed successfully for stream_id={}",
                stream_id_clone
            );
        }
    });

    Ok(LlmGenerateResponse { stream_id })
}

#[command]
pub async fn cancel_stream(_stream_id: String) -> Result<(), String> {
    // TODO: Implement cancellation logic using StreamManager
    Ok(())
}
