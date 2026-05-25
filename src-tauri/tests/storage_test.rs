//! Integration tests for the storage layer.
//!
//! Uses an in-memory SQLite database — no Tauri AppHandle required.
//! Run: `cd src-tauri && cargo test`

use a4chat_lib::commands::{ConversationSnapshot, MessageSnapshot, ProviderSettings};
use a4chat_lib::storage;
use rusqlite::Connection;

// ── Helpers ─────────────────────────────────────────────────

fn test_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    storage::migrate(&conn).unwrap();
    conn
}

fn sample_provider(id: &str) -> ProviderSettings {
    ProviderSettings {
        id: id.to_owned(),
        label: format!("Provider {id}"),
        base_url: format!("http://{id}.example.com/v1"),
        api_key: Some("sk-test".to_owned()),
        model: "test-model".to_owned(),
        enabled: true,
    }
}

fn sample_snapshot(conv_id: &str, provider_id: &str) -> ConversationSnapshot {
    ConversationSnapshot {
        id: conv_id.to_owned(),
        title: format!("Conversation {conv_id}"),
        provider_id: provider_id.to_owned(),
        model: Some("gpt-4".to_owned()),
        messages: vec![
            MessageSnapshot {
                id: format!("{conv_id}-msg-1"),
                role: "user".to_owned(),
                content: "Hello".to_owned(),
                reasoning: None,
                token_count: None,
            },
            MessageSnapshot {
                id: format!("{conv_id}-msg-2"),
                role: "assistant".to_owned(),
                content: "Hi there!".to_owned(),
                reasoning: Some("I should greet back".to_owned()),
                token_count: Some(42),
            },
        ],
    }
}

// ── Migration ───────────────────────────────────────────────

#[test]
fn migration_creates_all_tables() {
    let conn = test_db();
    let tables: Vec<String> = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .unwrap()
        .query_map([], |row| row.get(0))
        .unwrap()
        .collect::<rusqlite::Result<Vec<_>>>()
        .unwrap();

    assert!(tables.contains(&"provider_settings".to_owned()));
    assert!(tables.contains(&"conversations".to_owned()));
    assert!(tables.contains(&"messages".to_owned()));
}

#[test]
fn migration_seeds_default_providers() {
    let conn = test_db();
    let providers = storage::list_provider_settings(&conn).unwrap();
    let ids: Vec<&str> = providers.iter().map(|p| p.id.as_str()).collect();
    assert!(ids.contains(&"lmstudio"));
    assert!(ids.contains(&"openrouter"));
}

#[test]
fn migration_is_idempotent() {
    let conn = test_db();
    storage::migrate(&conn).unwrap(); // second call
    let providers = storage::list_provider_settings(&conn).unwrap();
    assert!(providers.len() >= 2);
}

// ── Provider CRUD ───────────────────────────────────────────

#[test]
fn save_and_list_providers() {
    let mut conn = test_db();
    let custom = sample_provider("custom");
    storage::save_provider_settings(&mut conn, &[custom]).unwrap();

    let all = storage::list_provider_settings(&conn).unwrap();
    let found = all.iter().find(|p| p.id == "custom").unwrap();
    assert_eq!(found.label, "Provider custom");
    assert_eq!(found.api_key, Some("sk-test".to_owned()));
}

#[test]
fn save_provider_upserts_on_conflict() {
    let mut conn = test_db();
    let mut p = sample_provider("upsert-test");
    storage::save_provider_settings(&mut conn, &[p.clone()]).unwrap();

    p.label = "Updated Label".to_owned();
    p.model = "new-model".to_owned();
    storage::save_provider_settings(&mut conn, &[p]).unwrap();

    let all = storage::list_provider_settings(&conn).unwrap();
    let found = all.iter().find(|p| p.id == "upsert-test").unwrap();
    assert_eq!(found.label, "Updated Label");
    assert_eq!(found.model, "new-model");
}

#[test]
fn providers_listed_alphabetically() {
    let mut conn = test_db();
    storage::save_provider_settings(
        &mut conn,
        &[sample_provider("zebra"), sample_provider("alpha")],
    )
    .unwrap();

    let all = storage::list_provider_settings(&conn).unwrap();
    let labels: Vec<&str> = all.iter().map(|p| p.label.as_str()).collect();
    let mut sorted = labels.clone();
    sorted.sort_by_key(|a| a.to_lowercase());
    assert_eq!(labels, sorted);
}

#[test]
fn save_disabled_provider() {
    let mut conn = test_db();
    let mut p = sample_provider("disabled");
    p.enabled = false;
    storage::save_provider_settings(&mut conn, &[p]).unwrap();

    let found = storage::list_provider_settings(&conn)
        .unwrap()
        .into_iter()
        .find(|p| p.id == "disabled")
        .unwrap();
    assert!(!found.enabled);
}

// ── Conversation lifecycle ──────────────────────────────────

#[test]
fn save_and_list_conversations() {
    let mut conn = test_db();
    storage::save_conversation_snapshot(&mut conn, &sample_snapshot("conv-1", "lmstudio")).unwrap();

    let convs = storage::list_conversations(&conn).unwrap();
    let found = convs.iter().find(|c| c.id == "conv-1").unwrap();
    assert_eq!(found.title, "Conversation conv-1");
    assert_eq!(found.provider_id, "lmstudio");
}

#[test]
fn load_conversation_messages_ordered() {
    let mut conn = test_db();
    storage::save_conversation_snapshot(&mut conn, &sample_snapshot("conv-msg", "lmstudio"))
        .unwrap();

    let msgs = storage::load_conversation_messages(&conn, "conv-msg").unwrap();
    assert_eq!(msgs.len(), 2);
    assert_eq!(msgs[0].role, "user");
    assert_eq!(msgs[0].content, "Hello");
    assert_eq!(msgs[1].role, "assistant");
    assert_eq!(msgs[1].content, "Hi there!");
    assert_eq!(msgs[1].reasoning, Some("I should greet back".to_owned()));
    assert_eq!(msgs[1].token_count, Some(42));
}

#[test]
fn load_messages_for_nonexistent_conversation_returns_empty() {
    let conn = test_db();
    let msgs = storage::load_conversation_messages(&conn, "nonexistent").unwrap();
    assert!(msgs.is_empty());
}

#[test]
fn rename_conversation_updates_title() {
    let mut conn = test_db();
    storage::save_conversation_snapshot(&mut conn, &sample_snapshot("rename-me", "lmstudio"))
        .unwrap();

    storage::rename_conversation(&conn, "rename-me", "New Title").unwrap();

    let found = storage::list_conversations(&conn)
        .unwrap()
        .into_iter()
        .find(|c| c.id == "rename-me")
        .unwrap();
    assert_eq!(found.title, "New Title");
}

#[test]
fn delete_conversation_removes_it() {
    let mut conn = test_db();
    storage::save_conversation_snapshot(&mut conn, &sample_snapshot("del-me", "lmstudio")).unwrap();
    storage::delete_conversation(&conn, "del-me").unwrap();

    let convs = storage::list_conversations(&conn).unwrap();
    assert!(!convs.iter().any(|c| c.id == "del-me"));
}

#[test]
fn delete_conversation_cascades_to_messages() {
    let mut conn = test_db();
    storage::save_conversation_snapshot(&mut conn, &sample_snapshot("cascade", "lmstudio"))
        .unwrap();

    assert_eq!(
        storage::load_conversation_messages(&conn, "cascade")
            .unwrap()
            .len(),
        2
    );

    storage::delete_conversation(&conn, "cascade").unwrap();

    assert!(storage::load_conversation_messages(&conn, "cascade")
        .unwrap()
        .is_empty());
}

#[test]
fn conversation_upsert_updates_existing() {
    let mut conn = test_db();
    let snap = sample_snapshot("upsert-conv", "lmstudio");
    storage::save_conversation_snapshot(&mut conn, &snap).unwrap();

    let mut updated = snap;
    updated.title = "Updated Title".to_owned();
    storage::save_conversation_snapshot(&mut conn, &updated).unwrap();

    let convs = storage::list_conversations(&conn).unwrap();
    let matches: Vec<_> = convs.iter().filter(|c| c.id == "upsert-conv").collect();
    assert_eq!(matches.len(), 1);
    assert_eq!(matches[0].title, "Updated Title");
}

// ── Edge cases ──────────────────────────────────────────────

#[test]
fn special_characters_in_title() {
    let mut conn = test_db();
    let mut snap = sample_snapshot("special", "lmstudio");
    snap.title = "Hello 'world' — \"quotes\" & <tags> 🚀".to_owned();
    storage::save_conversation_snapshot(&mut conn, &snap).unwrap();

    let found = storage::list_conversations(&conn)
        .unwrap()
        .into_iter()
        .find(|c| c.id == "special")
        .unwrap();
    assert_eq!(found.title, "Hello 'world' — \"quotes\" & <tags> 🚀");
}

#[test]
fn very_long_message_content() {
    let mut conn = test_db();
    let mut snap = sample_snapshot("long", "lmstudio");
    snap.messages[0].content = "x".repeat(100_000);
    storage::save_conversation_snapshot(&mut conn, &snap).unwrap();

    let msgs = storage::load_conversation_messages(&conn, "long").unwrap();
    assert_eq!(msgs[0].content.len(), 100_000);
}

#[test]
fn conversations_listed_newest_first() {
    let mut conn = test_db();
    storage::save_conversation_snapshot(&mut conn, &sample_snapshot("old", "lmstudio")).unwrap();
    std::thread::sleep(std::time::Duration::from_millis(1100));
    storage::save_conversation_snapshot(&mut conn, &sample_snapshot("new", "lmstudio")).unwrap();

    let convs = storage::list_conversations(&conn).unwrap();
    let ids: Vec<&str> = convs.iter().map(|c| c.id.as_str()).collect();
    let old_pos = ids.iter().position(|&id| id == "old").unwrap();
    let new_pos = ids.iter().position(|&id| id == "new").unwrap();
    assert!(new_pos < old_pos, "newer conversation should come first");
}
