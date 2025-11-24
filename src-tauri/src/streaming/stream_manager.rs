use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamChunk {
    pub stream_id: String,
    pub token: String,
    pub done: bool,
}

pub struct StreamManager {
    // Map of stream_id to abort handle or sender to cancel
    active_streams: Arc<Mutex<HashMap<String, mpsc::Sender<()>>>>,
}

impl StreamManager {
    pub fn new() -> Self {
        Self {
            active_streams: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn register_stream(&self, stream_id: String, abort_tx: mpsc::Sender<()>) {
        let mut streams = self.active_streams.lock().unwrap();
        streams.insert(stream_id, abort_tx);
    }

    pub fn remove_stream(&self, stream_id: &str) {
        let mut streams = self.active_streams.lock().unwrap();
        streams.remove(stream_id);
    }

    pub async fn cancel_stream(&self, stream_id: &str) {
        let tx = {
            let streams = self.active_streams.lock().unwrap();
            streams.get(stream_id).cloned()
        };

        if let Some(tx) = tx {
            let _ = tx.send(()).await;
            self.remove_stream(stream_id);
        }
    }
}

// Global instance or managed state would be better, but for now let's just expose a helper
// to emit events.

pub async fn emit_chunk(app: &AppHandle, stream_id: &str, token: &str, done: bool) {
    let chunk = StreamChunk {
        stream_id: stream_id.to_string(),
        token: token.to_string(),
        done,
    };
    log::debug!(
        "emit_chunk: stream_id={}, token_len={}, done={}",
        stream_id,
        token.len(),
        done
    );
    let _ = app.emit("llm_stream", chunk);
}
