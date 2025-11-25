// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Desktop entry point - uses tokio runtime
#[tokio::main]
async fn main() {
    a4chat_lib::build_app()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
