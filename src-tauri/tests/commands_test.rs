//! Integration tests for command-layer logic.
//!
//! Tests validation, endpoint building, and response parsing — no network calls.
//! Run: `cd src-tauri && cargo test`

use serde_json::json;

// ── chat_completions_endpoint ───────────────────────────────
//
// These duplicate the existing unit tests (commands::tests) but live
// in the external test folder so the inline #[cfg(test)] block can be
// removed in the future without losing coverage.

use a4chat_lib::commands::chat_completions_endpoint;

#[test]
fn infers_v1_for_bare_host() {
    assert_eq!(
        chat_completions_endpoint("http://localhost:1234"),
        "http://localhost:1234/v1/chat/completions"
    );
}

#[test]
fn strips_trailing_slashes() {
    assert_eq!(
        chat_completions_endpoint("http://localhost:1234///"),
        "http://localhost:1234/v1/chat/completions"
    );
}

#[test]
fn preserves_versioned_path() {
    assert_eq!(
        chat_completions_endpoint("https://openrouter.ai/api/v1"),
        "https://openrouter.ai/api/v1/chat/completions"
    );
}

#[test]
fn preserves_full_endpoint_url() {
    let url = "https://openrouter.ai/api/v1/chat/completions";
    assert_eq!(chat_completions_endpoint(url), url);
}

#[test]
fn handles_whitespace_padded_input() {
    assert_eq!(
        chat_completions_endpoint("  http://localhost:1234  "),
        "http://localhost:1234/v1/chat/completions"
    );
}

#[test]
fn appends_chat_completions_for_custom_path() {
    assert_eq!(
        chat_completions_endpoint("http://myhost.com/custom/api"),
        "http://myhost.com/custom/api/chat/completions"
    );
}

// ── CompletionRequest validation ────────────────────────────

use a4chat_lib::commands::CompletionRequest;

fn valid_request() -> serde_json::Value {
    json!({
        "provider": {
            "id": "test",
            "label": "Test",
            "baseUrl": "http://localhost:1234",
            "apiKey": null,
            "model": "gpt-4"
        },
        "messages": [
            { "role": "user", "content": "Hello" }
        ]
    })
}

#[test]
fn valid_request_passes_validation() {
    let req: CompletionRequest = serde_json::from_value(valid_request()).unwrap();
    assert!(req.validate().is_ok());
}

#[test]
fn empty_base_url_fails_validation() {
    let mut val = valid_request();
    val["provider"]["baseUrl"] = json!("  ");
    let req: CompletionRequest = serde_json::from_value(val).unwrap();
    let err = req.validate().unwrap_err();
    assert!(err.to_string().contains("base URL"));
}

#[test]
fn empty_model_fails_validation() {
    let mut val = valid_request();
    val["provider"]["model"] = json!("  ");
    let req: CompletionRequest = serde_json::from_value(val).unwrap();
    let err = req.validate().unwrap_err();
    assert!(err.to_string().contains("model"));
}

#[test]
fn no_messages_fails_validation() {
    let mut val = valid_request();
    val["messages"] = json!([]);
    let req: CompletionRequest = serde_json::from_value(val).unwrap();
    let err = req.validate().unwrap_err();
    assert!(err.to_string().contains("at least one message"));
}

#[test]
fn empty_message_content_fails_validation() {
    let mut val = valid_request();
    val["messages"] = json!([{ "role": "user", "content": "  " }]);
    let req: CompletionRequest = serde_json::from_value(val).unwrap();
    let err = req.validate().unwrap_err();
    assert!(err.to_string().contains("content cannot be empty"));
}

// ── parse_completion_response ───────────────────────────────

use a4chat_lib::commands::parse_completion_response;

#[test]
fn parses_standard_openai_response() {
    let payload = json!({
        "choices": [{
            "message": {
                "content": "Hello!"
            }
        }],
        "model": "gpt-4",
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 5
        }
    });

    let res = parse_completion_response(payload).unwrap();
    assert_eq!(res.content, "Hello!");
    assert_eq!(res.model, Some("gpt-4".to_owned()));
    assert_eq!(res.input_tokens, Some(10));
    assert_eq!(res.output_tokens, Some(5));
    assert!(res.reasoning.is_none());
}

#[test]
fn parses_response_with_reasoning_field() {
    let payload = json!({
        "choices": [{
            "message": {
                "content": "Answer",
                "reasoning": "Thought process here"
            }
        }]
    });

    let res = parse_completion_response(payload).unwrap();
    assert_eq!(res.reasoning, Some("Thought process here".to_owned()));
}

#[test]
fn parses_response_with_reasoning_content_field() {
    let payload = json!({
        "choices": [{
            "message": {
                "content": "Answer",
                "reasoning_content": "DeepSeek style reasoning"
            }
        }]
    });

    let res = parse_completion_response(payload).unwrap();
    assert_eq!(res.reasoning, Some("DeepSeek style reasoning".to_owned()));
}

#[test]
fn parses_anthropic_style_usage_fields() {
    let payload = json!({
        "choices": [{
            "message": { "content": "Hi" }
        }],
        "usage": {
            "input_tokens": 15,
            "output_tokens": 8
        }
    });

    let res = parse_completion_response(payload).unwrap();
    assert_eq!(res.input_tokens, Some(15));
    assert_eq!(res.output_tokens, Some(8));
}

#[test]
fn handles_missing_usage() {
    let payload = json!({
        "choices": [{
            "message": { "content": "No usage" }
        }]
    });

    let res = parse_completion_response(payload).unwrap();
    assert!(res.input_tokens.is_none());
    assert!(res.output_tokens.is_none());
}

#[test]
fn handles_empty_content() {
    let payload = json!({
        "choices": [{
            "message": { "content": "" }
        }]
    });

    let res = parse_completion_response(payload).unwrap();
    assert_eq!(res.content, "");
}

#[test]
fn fails_on_missing_choices() {
    let payload = json!({ "model": "gpt-4" });
    assert!(parse_completion_response(payload).is_err());
}

#[test]
fn fails_on_empty_choices_array() {
    let payload = json!({ "choices": [] });
    assert!(parse_completion_response(payload).is_err());
}
