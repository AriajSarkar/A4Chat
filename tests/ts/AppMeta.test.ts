import { describe, expect, it } from "vitest";

import { APP_NAME, APP_VERSION, GITHUB_URL, GITHUB_RELEASES_URL } from "@/lib/AppMeta";
import { parseSemver } from "@/lib/AppUpdate";

describe("AppMeta constants", () => {
    // ── APP_NAME ────────────────────────────────────────────────
    it("APP_NAME is a non-empty string", () => {
        expect(typeof APP_NAME).toBe("string");
        expect(APP_NAME.length).toBeGreaterThan(0);
    });

    it("APP_NAME equals 'A4Chat'", () => {
        expect(APP_NAME).toBe("A4Chat");
    });

    // ── APP_VERSION ─────────────────────────────────────────────
    it("APP_VERSION is a non-empty string", () => {
        expect(typeof APP_VERSION).toBe("string");
        expect(APP_VERSION.length).toBeGreaterThan(0);
    });

    it("APP_VERSION is valid semver", () => {
        const parsed = parseSemver(APP_VERSION);
        expect(parsed).not.toBeNull();
        expect(parsed!.major).toBeGreaterThanOrEqual(0);
        expect(parsed!.minor).toBeGreaterThanOrEqual(0);
        expect(parsed!.patch).toBeGreaterThanOrEqual(0);
    });

    it("APP_VERSION does not have a 'v' prefix", () => {
        expect(APP_VERSION).not.toMatch(/^v/);
    });

    // ── GITHUB_URL ──────────────────────────────────────────────
    it("GITHUB_URL is a valid HTTPS GitHub URL", () => {
        expect(GITHUB_URL).toMatch(/^https:\/\/github\.com\//);
    });

    it("GITHUB_URL does not end with a trailing slash", () => {
        expect(GITHUB_URL).not.toMatch(/\/$/);
    });

    // ── GITHUB_RELEASES_URL ─────────────────────────────────────
    it("GITHUB_RELEASES_URL is derived from GITHUB_URL", () => {
        expect(GITHUB_RELEASES_URL).toBe(`${GITHUB_URL}/releases`);
    });

    it("GITHUB_RELEASES_URL ends with /releases", () => {
        expect(GITHUB_RELEASES_URL).toMatch(/\/releases$/);
    });

    it("GITHUB_RELEASES_URL starts with GITHUB_URL", () => {
        expect(GITHUB_RELEASES_URL.startsWith(GITHUB_URL)).toBe(true);
    });
});
