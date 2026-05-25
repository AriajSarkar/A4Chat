use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

use anyhow::{Context, Result};
use rusqlite::{params, Connection};
use tauri::{AppHandle, Manager};

use crate::commands::{
    ConversationSnapshot, ProviderModelRow, ProviderSettings, SavedConversation, SavedMessage,
};

const DATABASE_FILE: &str = "a4chat.sqlite3";

pub fn database_path(app: &AppHandle) -> Result<PathBuf> {
    let data_dir = app
        .path()
        .app_data_dir()
        .context("unable to resolve app data directory")?;

    fs::create_dir_all(&data_dir).context("unable to create app data directory")?;

    Ok(data_dir.join(DATABASE_FILE))
}

pub fn connect(app: &AppHandle) -> Result<Connection> {
    let path = database_path(app)?;
    let connection = Connection::open(path).context("unable to open local database")?;
    migrate(&connection)?;
    Ok(connection)
}

pub fn list_provider_settings(connection: &Connection) -> Result<Vec<ProviderSettings>> {
    let mut statement = connection
        .prepare(
            "SELECT id, label, base_url, api_key, model, enabled
             FROM provider_settings
             ORDER BY label COLLATE NOCASE",
        )
        .context("unable to prepare provider settings query")?;

    let rows = statement
        .query_map([], |row| {
            Ok(ProviderSettings {
                id: row.get(0)?,
                label: row.get(1)?,
                base_url: row.get(2)?,
                api_key: row.get(3)?,
                model: row.get(4)?,
                enabled: row.get::<_, i64>(5)? == 1,
            })
        })
        .context("unable to read provider settings")?;

    rows.collect::<rusqlite::Result<Vec<_>>>()
        .context("unable to collect provider settings")
}

pub fn save_provider_settings(
    connection: &mut Connection,
    providers: &[ProviderSettings],
) -> Result<()> {
    let now = unix_timestamp();
    let transaction = connection
        .transaction()
        .context("unable to start provider settings transaction")?;

    for provider in providers {
        transaction
            .execute(
                "INSERT INTO provider_settings (id, label, base_url, api_key, model, enabled, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                   label = excluded.label,
                   base_url = excluded.base_url,
                   api_key = excluded.api_key,
                   model = excluded.model,
                   enabled = excluded.enabled,
                   updated_at = excluded.updated_at",
                params![
                    provider.id,
                    provider.label,
                    provider.base_url,
                    provider.api_key,
                    provider.model,
                    if provider.enabled { 1_i64 } else { 0_i64 },
                    now
                ],
            )
            .with_context(|| format!("unable to persist provider {}", provider.id))?;
    }

    let existing_ids: Vec<String> = {
        let mut stmt = transaction
            .prepare("SELECT id FROM provider_settings")
            .context("unable to prepare id query")?;
        let rows = stmt
            .query_map([], |row| row.get(0))
            .context("unable to query existing provider ids")?;
        rows.filter_map(Result::ok).collect()
    };

    for id in existing_ids {
        if !providers.iter().any(|p| p.id == id) {
            transaction
                .execute("DELETE FROM provider_settings WHERE id = ?1", params![id])
                .with_context(|| format!("unable to delete removed provider {id}. Note: Providers with existing conversations cannot be deleted."))?;
        }
    }

    transaction
        .commit()
        .context("unable to commit provider settings")
}

pub fn save_conversation_snapshot(
    connection: &mut Connection,
    snapshot: &ConversationSnapshot,
) -> Result<()> {
    let now = unix_timestamp();
    let transaction = connection
        .transaction()
        .context("unable to start conversation transaction")?;

    transaction
        .execute(
            "INSERT INTO conversations (id, title, provider_id, model, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?5)
             ON CONFLICT(id) DO UPDATE SET
               title = excluded.title,
               provider_id = excluded.provider_id,
               model = excluded.model,
               updated_at = excluded.updated_at",
            params![
                snapshot.id,
                snapshot.title,
                snapshot.provider_id,
                snapshot.model,
                now
            ],
        )
        .context("unable to persist conversation")?;

    for message in &snapshot.messages {
        transaction
            .execute(
                "INSERT INTO messages (
                   id, conversation_id, role, content, reasoning, token_count, created_at
                 )
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                   role = excluded.role,
                   content = excluded.content,
                   reasoning = excluded.reasoning,
                   token_count = excluded.token_count",
                params![
                    message.id,
                    snapshot.id,
                    message.role,
                    message.content,
                    message.reasoning,
                    message.token_count,
                    now
                ],
            )
            .with_context(|| format!("unable to persist message {}", message.id))?;
    }

    transaction
        .commit()
        .context("unable to commit conversation")
}

// ── CRUD additions ─────────────────────────────────────────

pub fn list_conversations(connection: &Connection) -> Result<Vec<SavedConversation>> {
    let mut statement = connection
        .prepare(
            "SELECT id, title, updated_at, provider_id, model
             FROM conversations
             ORDER BY updated_at DESC",
        )
        .context("unable to prepare conversation list query")?;

    let rows = statement
        .query_map([], |row| {
            Ok(SavedConversation {
                id: row.get(0)?,
                title: row.get(1)?,
                updated_at: row.get(2)?,
                provider_id: row.get(3)?,
                model: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
            })
        })
        .context("unable to read conversations")?;

    rows.collect::<rusqlite::Result<Vec<_>>>()
        .context("unable to collect conversations")
}

pub fn load_conversation_messages(
    connection: &Connection,
    conversation_id: &str,
) -> Result<Vec<SavedMessage>> {
    let mut statement = connection
        .prepare(
            "SELECT id, role, content, reasoning, token_count
             FROM messages
             WHERE conversation_id = ?1
             ORDER BY created_at ASC",
        )
        .context("unable to prepare messages query")?;

    let rows = statement
        .query_map(params![conversation_id], |row| {
            Ok(SavedMessage {
                id: row.get(0)?,
                role: row.get(1)?,
                content: row.get(2)?,
                reasoning: row.get(3)?,
                token_count: row.get(4)?,
            })
        })
        .context("unable to read messages")?;

    rows.collect::<rusqlite::Result<Vec<_>>>()
        .context("unable to collect messages")
}

pub fn delete_conversation(connection: &Connection, conversation_id: &str) -> Result<()> {
    // Foreign key cascade will delete messages automatically
    connection
        .execute(
            "DELETE FROM conversations WHERE id = ?1",
            params![conversation_id],
        )
        .context("unable to delete conversation")?;
    Ok(())
}

pub fn rename_conversation(
    connection: &Connection,
    conversation_id: &str,
    new_title: &str,
) -> Result<()> {
    let now = unix_timestamp();
    connection
        .execute(
            "UPDATE conversations SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_title, now, conversation_id],
        )
        .context("unable to rename conversation")?;
    Ok(())
}

// ── Provider models ────────────────────────────────────────

pub fn save_provider_models(
    connection: &mut Connection,
    provider_id: &str,
    models: &[ProviderModelRow],
) -> Result<()> {
    let transaction = connection
        .transaction()
        .context("unable to start provider models transaction")?;

    for model in models {
        transaction
            .execute(
                "INSERT INTO provider_models (provider_id, model_id, display_name, is_favorite, last_seen_at)
                 VALUES (?1, ?2, ?3, 0, ?4)
                 ON CONFLICT(provider_id, model_id) DO UPDATE SET
                   display_name = excluded.display_name,
                   last_seen_at = excluded.last_seen_at",
                params![provider_id, model.model_id, model.display_name, model.last_seen_at],
            )
            .with_context(|| {
                format!(
                    "unable to persist model {} for provider {}",
                    model.model_id, provider_id
                )
            })?;
    }

    transaction
        .commit()
        .context("unable to commit provider models")
}

pub fn list_provider_models(
    connection: &Connection,
    provider_id: &str,
) -> Result<Vec<ProviderModelRow>> {
    let mut statement = connection
        .prepare(
            "SELECT provider_id, model_id, display_name, is_favorite, last_seen_at
             FROM provider_models
             WHERE provider_id = ?1
             ORDER BY is_favorite DESC, display_name COLLATE NOCASE ASC",
        )
        .context("unable to prepare provider models query")?;

    let rows = statement
        .query_map(params![provider_id], |row| {
            Ok(ProviderModelRow {
                provider_id: row.get(0)?,
                model_id: row.get(1)?,
                display_name: row.get(2)?,
                is_favorite: row.get::<_, i64>(3)? == 1,
                last_seen_at: row.get(4)?,
            })
        })
        .context("unable to read provider models")?;

    rows.collect::<rusqlite::Result<Vec<_>>>()
        .context("unable to collect provider models")
}

pub fn toggle_model_favorite(
    connection: &Connection,
    provider_id: &str,
    model_id: &str,
    is_favorite: bool,
) -> Result<()> {
    connection
        .execute(
            "UPDATE provider_models SET is_favorite = ?1 WHERE provider_id = ?2 AND model_id = ?3",
            params![
                if is_favorite { 1_i64 } else { 0_i64 },
                provider_id,
                model_id
            ],
        )
        .context("unable to toggle model favorite")?;
    Ok(())
}

// ── Migrations & helpers ───────────────────────────────────

pub fn migrate(connection: &Connection) -> Result<()> {
    connection
        .execute_batch(
            "
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS provider_settings (
              id TEXT PRIMARY KEY,
              label TEXT NOT NULL,
              base_url TEXT NOT NULL,
              api_key TEXT,
              model TEXT NOT NULL DEFAULT '',
              enabled INTEGER NOT NULL DEFAULT 1,
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS conversations (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              provider_id TEXT NOT NULL,
              model TEXT,
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL,
              FOREIGN KEY (provider_id) REFERENCES provider_settings(id) ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS messages (
              id TEXT PRIMARY KEY,
              conversation_id TEXT NOT NULL,
              role TEXT NOT NULL,
              content TEXT NOT NULL,
              reasoning TEXT,
              token_count INTEGER,
              created_at INTEGER NOT NULL,
              FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
              ON conversations(updated_at DESC);

            CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
              ON messages(conversation_id, created_at ASC);

            CREATE TABLE IF NOT EXISTS provider_models (
              provider_id TEXT NOT NULL,
              model_id TEXT NOT NULL,
              display_name TEXT NOT NULL DEFAULT '',
              is_favorite INTEGER NOT NULL DEFAULT 0,
              last_seen_at INTEGER NOT NULL,
              PRIMARY KEY (provider_id, model_id),
              FOREIGN KEY (provider_id) REFERENCES provider_settings(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_provider_models_provider
              ON provider_models(provider_id);
            ",
        )
        .context("unable to migrate local database")?;

    ensure_column(
        connection,
        "provider_settings",
        "model",
        "ALTER TABLE provider_settings ADD COLUMN model TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_column(
        connection,
        "provider_settings",
        "enabled",
        "ALTER TABLE provider_settings ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1",
    )?;
    seed_default_providers(connection)?;

    Ok(())
}

pub fn unix_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or_default()
}

fn ensure_column(
    connection: &Connection,
    table: &str,
    column: &str,
    statement: &str,
) -> Result<()> {
    let mut columns = connection
        .prepare(&format!("PRAGMA table_info({table})"))
        .with_context(|| format!("unable to inspect table {table}"))?;

    let exists = columns
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<rusqlite::Result<Vec<_>>>()?
        .iter()
        .any(|name| name == column);

    if !exists {
        connection
            .execute_batch(statement)
            .with_context(|| format!("unable to add column {column} to {table}"))?;
    }

    Ok(())
}

fn seed_default_providers(connection: &Connection) -> Result<()> {
    let now = unix_timestamp();

    connection
        .execute(
            "INSERT INTO provider_settings (id, label, base_url, api_key, model, enabled, created_at, updated_at)
             VALUES ('lmstudio', 'LM Studio', 'http://localhost:1234/v1', NULL, 'local-model', 1, ?1, ?1)
             ON CONFLICT(id) DO NOTHING",
            params![now],
        )
        .context("unable to seed LM Studio provider")?;

    connection
        .execute(
            "INSERT INTO provider_settings (id, label, base_url, api_key, model, enabled, created_at, updated_at)
             VALUES ('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', NULL, 'openrouter/auto', 1, ?1, ?1)
             ON CONFLICT(id) DO NOTHING",
            params![now],
        )
        .context("unable to seed OpenRouter provider")?;

    Ok(())
}
