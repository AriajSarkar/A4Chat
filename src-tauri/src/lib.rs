pub mod commands;
pub mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::app_health,
            commands::list_provider_settings,
            commands::save_provider_settings,
            commands::send_chat_completion,
            commands::save_conversation_snapshot,
            commands::list_conversations,
            commands::load_conversation_messages,
            commands::delete_conversation,
            commands::rename_conversation,
            commands::resolve_pairing_base_url,
            commands::detect_provider_models,
            commands::list_provider_models,
            commands::toggle_model_favorite
        ])
        .run(tauri::generate_context!())
        .expect("failed to run A4Chat");
}
