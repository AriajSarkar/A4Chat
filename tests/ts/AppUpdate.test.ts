import { describe, expect, it } from "vitest";

import {
    classifyUpdateScale,
    formatBytes,
    formatUpdateScale,
    parseSemver,
    progressPercent,
} from "@/lib/AppUpdate";

describe("parseSemver", () => {
    it("parses normal and v-prefixed versions", () => {
        expect(parseSemver("3.2.1")).toEqual({ major: 3, minor: 2, patch: 1 });
        expect(parseSemver("v10.20.30")).toEqual({ major: 10, minor: 20, patch: 30 });
    });

    it("ignores prerelease and build suffixes", () => {
        expect(parseSemver("1.2.3-beta.1+abc")).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it("returns null for invalid values", () => {
        expect(parseSemver("1.2")).toBeNull();
        expect(parseSemver(null)).toBeNull();
    });
});

describe("classifyUpdateScale", () => {
    it("classifies major, minor, and patch releases", () => {
        expect(classifyUpdateScale("1.2.3", "2.0.0")).toBe("major");
        expect(classifyUpdateScale("1.2.3", "1.3.0")).toBe("minor");
        expect(classifyUpdateScale("1.2.3", "1.2.4")).toBe("patch");
    });

    it("handles same and unknown versions", () => {
        expect(classifyUpdateScale("1.2.3", "1.2.3")).toBe("same");
        expect(classifyUpdateScale("bad", "1.2.3")).toBe("unknown");
    });
});

describe("formatUpdateScale", () => {
    it("returns user-facing labels", () => {
        expect(formatUpdateScale("major")).toBe("Major update");
        expect(formatUpdateScale("minor")).toBe("Feature update");
        expect(formatUpdateScale("patch")).toBe("Patch update");
    });
});

describe("progressPercent", () => {
    it("returns null when total size is unknown", () => {
        expect(progressPercent(null)).toBeNull();
        expect(
            progressPercent({ phase: "downloading", downloadedBytes: 10, contentLength: null }),
        ).toBeNull();
    });

    it("clamps progress at 100 percent", () => {
        expect(
            progressPercent({ phase: "downloading", downloadedBytes: 120, contentLength: 100 }),
        ).toBe(100);
    });
});

describe("formatBytes", () => {
    it("formats byte values with stable units", () => {
        expect(formatBytes(512)).toBe("512 B");
        expect(formatBytes(1536)).toBe("1.5 KB");
        expect(formatBytes(2 * 1024 * 1024)).toBe("2 MB");
    });

    it("handles missing sizes", () => {
        expect(formatBytes(null)).toBe("Unknown size");
    });
});
