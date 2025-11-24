use crate::AppState;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::{command, State};

#[derive(Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub season_id: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[command]
pub async fn get_conversations(state: State<'_, AppState>) -> Result<Vec<Conversation>, String> {
    let rows = sqlx::query(
        "SELECT id, title, seasonId, createdAt FROM Conversation ORDER BY createdAt DESC",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let conversations = rows
        .iter()
        .map(|row| Conversation {
            id: row.get::<String, _>("id"),
            title: row.get::<String, _>("title"),
            season_id: row.get::<String, _>("seasonId"),
            created_at: row.get::<chrono::NaiveDateTime, _>("createdAt").to_string(),
        })
        .collect();

    Ok(conversations)
}

#[command]
pub async fn get_messages(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<Vec<Message>, String> {
    let rows = sqlx::query("SELECT id, conversationId, role, content, createdAt FROM Message WHERE conversationId = ? ORDER BY createdAt ASC")
        .bind(conversation_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let messages = rows
        .iter()
        .map(|row| Message {
            id: row.get::<String, _>("id"),
            conversation_id: row.get::<String, _>("conversationId"),
            role: row.get::<String, _>("role"),
            content: row.get::<String, _>("content"),
            created_at: row.get::<chrono::NaiveDateTime, _>("createdAt").to_string(),
        })
        .collect();

    Ok(messages)
}

#[command]
pub async fn save_message(
    state: State<'_, AppState>,
    conversation_id: String,
    role: String,
    content: String,
) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO Message (id, conversationId, role, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))")
        .bind(&id)
        .bind(&conversation_id)
        .bind(&role)
        .bind(&content)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(id)
}

#[command]
pub async fn create_conversation(
    state: State<'_, AppState>,
    title: String,
    season_id: String,
) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO Conversation (id, title, seasonId, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
        .bind(&id)
        .bind(&title)
        .bind(&season_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(id)
}

#[command]
pub async fn delete_all_data(state: State<'_, AppState>) -> Result<(), String> {
    // Transactional delete
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM Message")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM Conversation")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM Season")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}
