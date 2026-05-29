import fc from "fast-check";
import { describe, it, expect } from "vitest";

import {
    parseSemver,
    classifyUpdateScale,
    formatUpdateScale,
    progressPercent,
    formatBytes,
    type UpdateScale,
    type AppUpdateProgress,
} from "@/lib/AppUpdate";

// ---------------------------------------------------------------------------
// parseSemver
// ---------------------------------------------------------------------------
describe("parseSemver", () => {
    describe("valid versions", () => {
        it('parses plain "3.2.1"', () => {
            expect(parseSemver("3.2.1")).toEqual({ major: 3, minor: 2, patch: 1 });
        });

        it('parses v-prefixed "v10.20.30"', () => {
            expect(parseSemver("v10.20.30")).toEqual({
                major: 10,
                minor: 20,
                patch: 30,
            });
        });

        it('parses prerelease "1.2.3-beta.1+abc"', () => {
            expect(parseSemver("1.2.3-beta.1+abc")).toEqual({
                major: 1,
                minor: 2,
                patch: 3,
            });
        });

        it('parses build-metadata-only suffix "1.2.3+build"', () => {
            expect(parseSemver("1.2.3+build")).toEqual({
                major: 1,
                minor: 2,
                patch: 3,
            });
        });

        it('parses prerelease-only suffix "1.2.3-alpha"', () => {
            expect(parseSemver("1.2.3-alpha")).toEqual({
                major: 1,
                minor: 2,
                patch: 3,
            });
        });

        it('parses zero version "0.0.0"', () => {
            expect(parseSemver("0.0.0")).toEqual({ major: 0, minor: 0, patch: 0 });
        });

        it("parses leading zeros (Number() strips them)", () => {
            expect(parseSemver("01.02.03")).toEqual({
                major: 1,
                minor: 2,
                patch: 3,
            });
        });

        it("parses very large numbers", () => {
            expect(parseSemver("999999.999999.999999")).toEqual({
                major: 999999,
                minor: 999999,
                patch: 999999,
            });
        });

        it("trims leading/trailing whitespace", () => {
            expect(parseSemver("  3.2.1  ")).toEqual({
                major: 3,
                minor: 2,
                patch: 1,
            });
        });
    });

    describe("invalid / null inputs", () => {
        it("returns null for null", () => {
            expect(parseSemver(null)).toBeNull();
        });

        it("returns null for undefined", () => {
            expect(parseSemver(undefined)).toBeNull();
        });

        it("returns null for empty string", () => {
            expect(parseSemver("")).toBeNull();
        });

        it("returns null for whitespace-only string", () => {
            expect(parseSemver("   ")).toBeNull();
        });

        it('returns null for double v-prefix "vv1.2.3"', () => {
            expect(parseSemver("vv1.2.3")).toBeNull();
        });

        it('returns null for two-part "1.2"', () => {
            expect(parseSemver("1.2")).toBeNull();
        });

        it('returns null for single number "123"', () => {
            expect(parseSemver("123")).toBeNull();
        });

        it('returns null for four-part "1.2.3.4"', () => {
            expect(parseSemver("1.2.3.4")).toBeNull();
        });

        it('returns null for negative "-1.2.3"', () => {
            expect(parseSemver("-1.2.3")).toBeNull();
        });

        it('returns null for non-numeric "abc.def.ghi"', () => {
            expect(parseSemver("abc.def.ghi")).toBeNull();
        });

        it('returns null for bare "v"', () => {
            expect(parseSemver("v")).toBeNull();
        });
    });

    describe("property-based", () => {
        it("any nat.nat.nat round-trips", () => {
            fc.assert(
                fc.property(fc.nat(), fc.nat(), fc.nat(), (a, b, c) => {
                    const result = parseSemver(`${a}.${b}.${c}`);
                    expect(result).toEqual({ major: a, minor: b, patch: c });
                }),
            );
        });

        it("v-prefixed nat.nat.nat round-trips", () => {
            fc.assert(
                fc.property(fc.nat(), fc.nat(), fc.nat(), (a, b, c) => {
                    const result = parseSemver(`v${a}.${b}.${c}`);
                    expect(result).toEqual({ major: a, minor: b, patch: c });
                }),
            );
        });

        it("returns null or a valid object for arbitrary strings", () => {
            fc.assert(
                fc.property(fc.string(), (s) => {
                    const result = parseSemver(s);
                    if (result !== null) {
                        expect(result).toHaveProperty("major");
                        expect(result).toHaveProperty("minor");
                        expect(result).toHaveProperty("patch");
                        expect(Number.isFinite(result.major)).toBe(true);
                        expect(Number.isFinite(result.minor)).toBe(true);
                        expect(Number.isFinite(result.patch)).toBe(true);
                    }
                }),
            );
        });
    });
});

// ---------------------------------------------------------------------------
// classifyUpdateScale
// ---------------------------------------------------------------------------
describe("classifyUpdateScale", () => {
    describe("deterministic cases", () => {
        it('returns "major" for major bump', () => {
            expect(classifyUpdateScale("1.2.3", "2.0.0")).toBe("major");
        });

        it('returns "minor" for minor bump', () => {
            expect(classifyUpdateScale("1.2.3", "1.3.0")).toBe("minor");
        });

        it('returns "patch" for patch bump', () => {
            expect(classifyUpdateScale("1.2.3", "1.2.4")).toBe("patch");
        });

        it('returns "same" for identical versions', () => {
            expect(classifyUpdateScale("1.2.3", "1.2.3")).toBe("same");
        });

        it('returns "unknown" when current is invalid', () => {
            expect(classifyUpdateScale("invalid", "1.0.0")).toBe("unknown");
        });

        it('returns "unknown" when next is invalid', () => {
            expect(classifyUpdateScale("1.0.0", "invalid")).toBe("unknown");
        });

        it('returns "unknown" when next is null', () => {
            expect(classifyUpdateScale("1.0.0", null)).toBe("unknown");
        });

        it('returns "unknown" when both are invalid', () => {
            expect(classifyUpdateScale("nope", "nah")).toBe("unknown");
        });

        it('returns "major" for major downgrade', () => {
            expect(classifyUpdateScale("2.0.0", "1.0.0")).toBe("major");
        });

        it('returns "minor" for minor downgrade', () => {
            expect(classifyUpdateScale("1.3.0", "1.2.0")).toBe("minor");
        });

        it("handles v-prefix cross comparison", () => {
            expect(classifyUpdateScale("v1.2.3", "1.3.0")).toBe("minor");
        });

        it("handles both v-prefixed", () => {
            expect(classifyUpdateScale("v1.0.0", "v2.0.0")).toBe("major");
        });
    });

    describe("property-based", () => {
        const validScales: UpdateScale[] = ["major", "minor", "patch", "same", "unknown"];

        it("result is always a valid UpdateScale", () => {
            fc.assert(
                fc.property(fc.string(), fc.string(), (a, b) => {
                    const result = classifyUpdateScale(a, b);
                    expect(validScales).toContain(result);
                }),
            );
        });

        it("returns a non-unknown scale for valid semver pairs", () => {
            fc.assert(
                fc.property(
                    fc.nat(),
                    fc.nat(),
                    fc.nat(),
                    fc.nat(),
                    fc.nat(),
                    fc.nat(),
                    (a, b, c, d, e, f) => {
                        const result = classifyUpdateScale(`${a}.${b}.${c}`, `${d}.${e}.${f}`);
                        expect(result).not.toBe("unknown");
                    },
                ),
            );
        });

        it('same version always yields "same"', () => {
            fc.assert(
                fc.property(fc.nat(), fc.nat(), fc.nat(), (a, b, c) => {
                    const v = `${a}.${b}.${c}`;
                    expect(classifyUpdateScale(v, v)).toBe("same");
                }),
            );
        });
    });
});

// ---------------------------------------------------------------------------
// formatUpdateScale
// ---------------------------------------------------------------------------
describe("formatUpdateScale", () => {
    it('formats "major" → "Major update"', () => {
        expect(formatUpdateScale("major")).toBe("Major update");
    });

    it('formats "minor" → "Feature update"', () => {
        expect(formatUpdateScale("minor")).toBe("Feature update");
    });

    it('formats "patch" → "Patch update"', () => {
        expect(formatUpdateScale("patch")).toBe("Patch update");
    });

    it('formats "same" → "Current version"', () => {
        expect(formatUpdateScale("same")).toBe("Current version");
    });

    it('formats "unknown" → "Update" (default branch)', () => {
        expect(formatUpdateScale("unknown")).toBe("Update");
    });

    it('formats unexpected string → "Update" (default)', () => {
        // Force an unexpected value through the type system to test the default branch
        expect(formatUpdateScale("bogus" as UpdateScale)).toBe("Update");
    });
});

// ---------------------------------------------------------------------------
// progressPercent
// ---------------------------------------------------------------------------
describe("progressPercent", () => {
    const mkProgress = (
        downloadedBytes: number,
        contentLength: number | null,
        phase: string = "downloading",
    ): AppUpdateProgress => ({ phase, downloadedBytes, contentLength }) as AppUpdateProgress;

    describe("null / falsy returns null", () => {
        it("returns null for null progress", () => {
            expect(progressPercent(null)).toBeNull();
        });

        it("returns null when contentLength is null", () => {
            expect(progressPercent(mkProgress(50, null))).toBeNull();
        });

        it("returns null when contentLength is 0", () => {
            expect(progressPercent(mkProgress(50, 0))).toBeNull();
        });
    });

    describe("deterministic calculations", () => {
        it("returns 0 when downloadedBytes is 0", () => {
            expect(progressPercent(mkProgress(0, 100))).toBe(0);
        });

        it("returns 50 for halfway", () => {
            expect(progressPercent(mkProgress(50, 100))).toBe(50);
        });

        it("returns 100 at completion", () => {
            expect(progressPercent(mkProgress(100, 100))).toBe(100);
        });

        it("clamps to 100 when downloaded exceeds content", () => {
            expect(progressPercent(mkProgress(120, 100))).toBe(100);
        });

        it("floors fractional percentages (1/3 → 33)", () => {
            expect(progressPercent(mkProgress(1, 3))).toBe(33);
        });

        it("floors 99.9% to 99", () => {
            expect(progressPercent(mkProgress(999, 1000))).toBe(99);
        });

        it("handles very large byte counts", () => {
            const large = 10 * 1024 * 1024 * 1024; // 10 GB
            expect(progressPercent(mkProgress(large / 2, large))).toBe(50);
        });
    });

    describe("property-based", () => {
        it("result is null or in [0, 100]", () => {
            fc.assert(
                fc.property(
                    fc.nat(),
                    fc.oneof(fc.constant(null), fc.nat()),
                    (downloaded, contentLength) => {
                        const result = progressPercent(mkProgress(downloaded, contentLength));
                        if (result !== null) {
                            expect(result).toBeGreaterThanOrEqual(0);
                            expect(result).toBeLessThanOrEqual(100);
                            expect(Number.isInteger(result)).toBe(true);
                        }
                    },
                ),
            );
        });

        it("100% download always yields 100", () => {
            fc.assert(
                fc.property(fc.integer({ min: 1, max: 1e12 }), (n) => {
                    expect(progressPercent(mkProgress(n, n))).toBe(100);
                }),
            );
        });
    });
});

// ---------------------------------------------------------------------------
// formatBytes
// ---------------------------------------------------------------------------
describe("formatBytes", () => {
    describe("invalid / falsy → Unknown size", () => {
        it("returns Unknown size for null", () => {
            expect(formatBytes(null)).toBe("Unknown size");
        });

        it("returns Unknown size for undefined", () => {
            expect(formatBytes(undefined)).toBe("Unknown size");
        });

        it("returns Unknown size for 0", () => {
            expect(formatBytes(0)).toBe("Unknown size");
        });

        it("returns Unknown size for -1", () => {
            expect(formatBytes(-1)).toBe("Unknown size");
        });

        it("returns Unknown size for NaN", () => {
            expect(formatBytes(NaN)).toBe("Unknown size");
        });

        it("returns Unknown size for Infinity", () => {
            expect(formatBytes(Infinity)).toBe("Unknown size");
        });

        it("returns Unknown size for -Infinity", () => {
            expect(formatBytes(-Infinity)).toBe("Unknown size");
        });
    });

    describe("bytes range (< 1024)", () => {
        it("formats 1 → 1 B", () => {
            expect(formatBytes(1)).toBe("1 B");
        });

        it("formats 512 → 512 B", () => {
            expect(formatBytes(512)).toBe("512 B");
        });

        it("formats 1023 → 1023 B", () => {
            expect(formatBytes(1023)).toBe("1023 B");
        });
    });

    describe("kilobytes range", () => {
        it("formats 1024 → 1 KB (exact, integer → 0 digits)", () => {
            expect(formatBytes(1024)).toBe("1 KB");
        });

        it("formats 1025 → 1.0 KB (fractional, < 10 → 1 digit)", () => {
            expect(formatBytes(1025)).toBe("1.0 KB");
        });

        it("formats 1536 → 1.5 KB", () => {
            expect(formatBytes(1536)).toBe("1.5 KB");
        });

        it("formats 10240 → 10 KB (≥ 10 → 0 digits)", () => {
            expect(formatBytes(10240)).toBe("10 KB");
        });
    });

    describe("megabytes range", () => {
        it("formats 2 MB exactly → 2 MB", () => {
            expect(formatBytes(2 * 1024 * 1024)).toBe("2 MB");
        });

        it("formats 5.5 MB → 5.5 MB", () => {
            expect(formatBytes(5.5 * 1024 * 1024)).toBe("5.5 MB");
        });
    });

    describe("gigabytes range", () => {
        it("formats 1 GB exactly → 1 GB", () => {
            expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
        });

        it("stays in GB for very large values (1 TB+)", () => {
            const tb = 1024 * 1024 * 1024 * 1024;
            expect(formatBytes(tb)).toBe("1024 GB");
        });
    });

    describe("property-based", () => {
        it("positive finite bytes match expected pattern", () => {
            fc.assert(
                fc.property(fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }), (n) => {
                    const result = formatBytes(n);
                    expect(result).toMatch(/^\d+(\.\d)? (B|KB|MB|GB)$/);
                }),
            );
        });

        it("result never says Unknown size for positive finite input", () => {
            fc.assert(
                fc.property(fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }), (n) => {
                    expect(formatBytes(n)).not.toBe("Unknown size");
                }),
            );
        });
    });
});
