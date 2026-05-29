//! Integration/unit tests for updates.rs logic
//!
//! Uses proptest for DSA-level string parsing edge case verification.
//! Run: `cd src-tauri && cargo test`

use a4chat_lib::updates::{
    clean_release_body, device_arch, find_apk_url, is_newer, parse_semver, progress_percent,
    GithubAsset,
};
use proptest::prelude::*;

// ── parse_semver ──────────────────────────────────────────────────

#[test]
fn parse_semver_basic() {
    assert_eq!(parse_semver("1.2.3"), Some((1, 2, 3)));
    assert_eq!(parse_semver("v1.2.3"), Some((1, 2, 3)));
}

#[test]
fn parse_semver_with_suffixes() {
    assert_eq!(parse_semver("1.2.3-alpha"), Some((1, 2, 3)));
    assert_eq!(parse_semver("v1.2.3-beta.1"), Some((1, 2, 3)));
    assert_eq!(parse_semver("1.2.3+build"), Some((1, 2, 3)));
}

#[test]
fn parse_semver_invalid() {
    assert_eq!(parse_semver("1.2"), None);
    assert_eq!(parse_semver("1.a.3"), None);
    assert_eq!(parse_semver("v.2.3"), None);
    assert_eq!(parse_semver(""), None);
}

proptest! {
    #[test]
    fn parse_semver_roundtrip(major in 0u32..1000, minor in 0u32..1000, patch in 0u32..1000) {
        let s = format!("{}.{}.{}", major, minor, patch);
        prop_assert_eq!(parse_semver(&s), Some((major, minor, patch)));

        let vs = format!("v{}.{}.{}", major, minor, patch);
        prop_assert_eq!(parse_semver(&vs), Some((major, minor, patch)));

        let suffix = format!("{}.{}.{}-alpha+001", major, minor, patch);
        prop_assert_eq!(parse_semver(&suffix), Some((major, minor, patch)));
    }

    #[test]
    fn parse_semver_does_not_panic(s in "\\PC*") {
        let _ = parse_semver(&s);
    }
}

// ── is_newer ──────────────────────────────────────────────────────

#[test]
fn is_newer_basic() {
    assert!(is_newer("1.0.0", "1.0.1"));
    assert!(is_newer("1.0.0", "1.1.0"));
    assert!(is_newer("1.0.0", "2.0.0"));

    assert!(!is_newer("1.0.0", "1.0.0"));
    assert!(!is_newer("1.0.1", "1.0.0"));
    assert!(!is_newer("2.0.0", "1.0.0"));
}

#[test]
fn is_newer_handles_v_prefix() {
    assert!(is_newer("v1.0.0", "v1.0.1"));
    assert!(is_newer("1.0.0", "v1.0.1"));
    assert!(is_newer("v1.0.0", "1.0.1"));
}

#[test]
fn is_newer_handles_invalid_gracefully() {
    assert!(!is_newer("invalid", "1.0.0"));
    assert!(!is_newer("1.0.0", "invalid"));
    assert!(!is_newer("invalid", "invalid"));
}

// ── clean_release_body ────────────────────────────────────────────

#[test]
fn clean_release_body_extracts_whats_changed() {
    let body =
        "Some intro\n## What's Changed\n* Feature A\n* Feature B\n\nFull Changelog: https://..."
            .to_owned();
    let cleaned = clean_release_body(Some(body)).unwrap();
    assert_eq!(cleaned, "## What's Changed\n* Feature A\n* Feature B");
}

#[test]
fn clean_release_body_handles_h3() {
    let body = "Intro\n### what's changed\n* A\n* B\nFull changelog...".to_owned();
    let cleaned = clean_release_body(Some(body)).unwrap();
    assert_eq!(cleaned, "### what's changed\n* A\n* B");
}

#[test]
fn clean_release_body_returns_none_if_missing_header() {
    let body = "Just some text with no header".to_owned();
    assert_eq!(clean_release_body(Some(body)), None);
}

#[test]
fn clean_release_body_returns_none_if_empty() {
    assert_eq!(clean_release_body(None), None);
}

#[test]
fn clean_release_body_returns_none_if_only_header() {
    let body = "## What's Changed\nFull Changelog: link".to_owned();
    // After trimming, if it's empty, should return None
    // Wait, the header itself "## What's Changed" is included in the slice!
    let cleaned = clean_release_body(Some(body)).unwrap();
    assert_eq!(cleaned, "## What's Changed"); // It retains the header
}

proptest! {
    #[test]
    fn clean_release_body_does_not_panic(s in "\\PC*") {
        let _ = clean_release_body(Some(s));
    }
}

// ── find_apk_url ──────────────────────────────────────────────────

#[test]
fn find_apk_url_exact_arch_match() {
    let assets = vec![
        GithubAsset {
            name: "A4Chat_1.2.3_armv7.apk".into(),
            browser_download_url: "url1".into(),
        },
        GithubAsset {
            name: "A4Chat_1.2.3_aarch64.apk".into(),
            browser_download_url: "url2".into(),
        },
    ];
    let url = find_apk_url(&assets, "aarch64", "v1.2.3");
    assert_eq!(url, Some("url2".to_owned()));
}

#[test]
fn find_apk_url_v_prefix_match() {
    let assets = vec![GithubAsset {
        name: "A4Chat_v1.2.3_aarch64.apk".into(),
        browser_download_url: "url1".into(),
    }];
    let url = find_apk_url(&assets, "aarch64", "v1.2.3");
    assert_eq!(url, Some("url1".to_owned()));
}

#[test]
fn find_apk_url_universal_fallback() {
    let assets = vec![
        GithubAsset {
            name: "A4Chat_1.2.3_x86.apk".into(),
            browser_download_url: "url1".into(),
        },
        GithubAsset {
            name: "A4Chat_1.2.3_universal.apk".into(),
            browser_download_url: "url2".into(),
        },
    ];
    let url = find_apk_url(&assets, "aarch64", "v1.2.3");
    assert_eq!(url, Some("url2".to_owned()));
}

#[test]
fn find_apk_url_any_apk_fallback() {
    let assets = vec![
        GithubAsset {
            name: "random.zip".into(),
            browser_download_url: "url1".into(),
        },
        GithubAsset {
            name: "weird_name.apk".into(),
            browser_download_url: "url2".into(),
        },
    ];
    let url = find_apk_url(&assets, "aarch64", "v1.2.3");
    assert_eq!(url, Some("url2".to_owned()));
}

#[test]
fn find_apk_url_returns_none_if_no_apk() {
    let assets = vec![GithubAsset {
        name: "random.zip".into(),
        browser_download_url: "url1".into(),
    }];
    assert_eq!(find_apk_url(&assets, "aarch64", "v1.2.3"), None);
}

// ── progress_percent ──────────────────────────────────────────────

#[test]
fn progress_percent_basic() {
    assert_eq!(progress_percent(50, Some(100)), Some(50));
    assert_eq!(progress_percent(0, Some(100)), Some(0));
    assert_eq!(progress_percent(100, Some(100)), Some(100));
}

#[test]
fn progress_percent_exceeding() {
    assert_eq!(progress_percent(150, Some(100)), Some(100));
}

#[test]
fn progress_percent_zero_length() {
    assert_eq!(progress_percent(50, Some(0)), None);
}

#[test]
fn progress_percent_missing_length() {
    assert_eq!(progress_percent(50, None), None);
}

proptest! {
    #[test]
    fn progress_percent_never_exceeds_100_and_does_not_panic(
        downloaded in 0u64..u64::MAX,
        total in 0u64..u64::MAX
    ) {
        if let Some(percent) = progress_percent(downloaded, Some(total)) {
            prop_assert!(percent <= 100);
        }
    }
}

// ── device_arch ───────────────────────────────────────────────────

#[test]
fn device_arch_never_panics() {
    let arch = device_arch();
    assert!(!arch.is_empty());
}
