import { describe, expect, it } from "vitest";

import { cn } from "@/lib/cn";

describe("cn", () => {
    // ── Basic usage ─────────────────────────────────────────────
    it("returns a single class string unchanged", () => {
        expect(cn("foo")).toBe("foo");
    });

    it("joins multiple class strings with a space", () => {
        expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
    });

    it("returns empty string for no arguments", () => {
        expect(cn()).toBe("");
    });

    // ── Falsy value filtering ───────────────────────────────────
    it("filters out false", () => {
        expect(cn("foo", false, "bar")).toBe("foo bar");
    });

    it("filters out null", () => {
        expect(cn("foo", null, "bar")).toBe("foo bar");
    });

    it("filters out undefined", () => {
        expect(cn("foo", undefined, "bar")).toBe("foo bar");
    });

    it("filters out 0", () => {
        expect(cn("foo", 0, "bar")).toBe("foo bar");
    });

    it("filters out empty string", () => {
        expect(cn("foo", "", "bar")).toBe("foo bar");
    });

    it("returns empty string when all inputs are falsy", () => {
        expect(cn(false, null, undefined, 0, "")).toBe("");
    });

    // ── Conditional classes ─────────────────────────────────────
    it("includes class when condition is truthy", () => {
        const isActive = true;
        expect(cn("base", isActive && "active")).toBe("base active");
    });

    it("excludes class when condition is falsy", () => {
        const isActive = false;
        expect(cn("base", isActive && "active")).toBe("base");
    });

    // ── Object syntax ───────────────────────────────────────────
    it("includes keys with truthy values from objects", () => {
        expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });

    it("handles object with all falsy values", () => {
        expect(cn({ a: false, b: null, c: undefined, d: 0 })).toBe("");
    });

    it("handles object with all truthy values", () => {
        expect(cn({ a: true, b: 1, c: "yes" })).toBe("a b c");
    });

    // ── Array syntax ────────────────────────────────────────────
    it("flattens arrays of class names", () => {
        expect(cn(["foo", "bar"])).toBe("foo bar");
    });

    it("filters falsy values from arrays", () => {
        expect(cn(["foo", false, "bar", null])).toBe("foo bar");
    });

    it("handles nested arrays", () => {
        expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz");
    });

    it("handles empty arrays", () => {
        expect(cn([])).toBe("");
    });

    // ── Mixed inputs ────────────────────────────────────────────
    it("handles mixed strings, objects, and arrays", () => {
        expect(cn("foo", { bar: true, baz: false }, ["qux", null])).toBe("foo bar qux");
    });

    it("handles complex conditional composition", () => {
        const variant: string = "primary";
        const disabled = false;
        const size = "lg";
        expect(
            cn(
                "btn",
                variant === "primary" && "btn-primary",
                variant === "secondary" && "btn-secondary",
                disabled && "btn-disabled",
                { [`btn-${size}`]: true },
            ),
        ).toBe("btn btn-primary btn-lg");
    });

    // ── Whitespace edge cases ───────────────────────────────────
    it("preserves inner whitespace in class names", () => {
        // clsx does not trim inner whitespace — this is deliberate
        expect(cn("foo  bar")).toBe("foo  bar");
    });
});
