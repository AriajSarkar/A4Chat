//! Integration tests for release progress helper logic.

use a4chat_lib::updates::progress_percent;

#[test]
fn progress_percent_returns_none_without_total() {
    assert_eq!(progress_percent(100, None), None);
}

#[test]
fn progress_percent_clamps_at_one_hundred() {
    assert_eq!(progress_percent(150, Some(100)), Some(100));
}

#[test]
fn progress_percent_handles_partial_downloads() {
    assert_eq!(progress_percent(25, Some(100)), Some(25));
}
