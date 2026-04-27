import { describe, it, expect } from "vitest";
import { deepFind, shouldEscalateToRender } from "../tools/extract.js";
// ─── deepFind ────────────────────────────────────────────────────────────────
describe("deepFind", () => {
    it("returns undefined for null input", () => {
        expect(deepFind(null, "key")).toBeUndefined();
    });
    it("returns undefined for undefined input", () => {
        expect(deepFind(undefined, "key")).toBeUndefined();
    });
    it("returns undefined for primitive input", () => {
        expect(deepFind("hello", "key")).toBeUndefined();
        expect(deepFind(42, "key")).toBeUndefined();
        expect(deepFind(true, "key")).toBeUndefined();
    });
    it("returns value when key is at top level", () => {
        expect(deepFind({ name: "Alice" }, "name")).toBe("Alice");
    });
    it("returns value when key holds a falsy value (0, empty string, false)", () => {
        expect(deepFind({ count: 0 }, "count")).toBe(0);
        expect(deepFind({ label: "" }, "label")).toBe("");
        expect(deepFind({ active: false }, "active")).toBe(false);
    });
    it("finds key nested in child object", () => {
        const obj = { a: { b: { c: { target: 42 } } } };
        expect(deepFind(obj, "target")).toBe(42);
    });
    it("finds key inside array element", () => {
        const obj = { items: [{ id: 1 }, { id: 2, secret: "found" }] };
        expect(deepFind(obj, "secret")).toBe("found");
    });
    it("returns first occurrence when key appears at multiple levels", () => {
        // Breadth-first within each object: top-level keys are checked before recursing
        const obj = { a: { name: "inner" }, name: "outer" };
        expect(deepFind(obj, "name")).toBe("outer");
    });
    it("returns undefined when key not found", () => {
        const obj = { a: 1, b: { c: 2 } };
        expect(deepFind(obj, "missing")).toBeUndefined();
    });
    it("returns undefined when depth exceeds 20", () => {
        // Build a 25-level nested object with the target at the bottom
        let obj = { target: "deep" };
        for (let i = 0; i < 25; i++) {
            obj = { child: obj };
        }
        // At depth 0 the first object is checked, so 25 wraps = 25 recursive steps
        // depth > 20 means depth 21+ returns undefined
        expect(deepFind(obj, "target")).toBeUndefined();
    });
    it("finds key at exactly depth 20 (boundary)", () => {
        // 20 wraps means the deepFind recurses 20 times (depth 0..20)
        // depth > 20 triggers at depth 21, so depth 20 should still work
        let obj = { target: "found" };
        for (let i = 0; i < 20; i++) {
            obj = { child: obj };
        }
        expect(deepFind(obj, "target")).toBe("found");
    });
    it("handles empty object", () => {
        expect(deepFind({}, "key")).toBeUndefined();
    });
    it("handles empty array", () => {
        expect(deepFind([], "key")).toBeUndefined();
    });
    it("handles array at top level", () => {
        const arr = [{ name: "a" }, { name: "b" }];
        expect(deepFind(arr, "name")).toBe("a");
    });
    it("returns object values (not just primitives)", () => {
        const inner = { x: 1, y: 2 };
        const obj = { coords: inner };
        expect(deepFind(obj, "coords")).toBe(inner);
    });
});
// ─── shouldEscalateToRender ──────────────────────────────────────────────────
describe("shouldEscalateToRender", () => {
    it("returns true for TLS error messages", () => {
        expect(shouldEscalateToRender("TLS handshake failed")).toBe(true);
    });
    it("returns true for SSL error messages", () => {
        expect(shouldEscalateToRender("SSL connection refused")).toBe(true);
    });
    it("returns true for 403 blocked messages", () => {
        expect(shouldEscalateToRender("HTTP 403 — request blocked by target")).toBe(true);
    });
    it("returns true for 'blocked' keyword", () => {
        expect(shouldEscalateToRender("The request was blocked")).toBe(true);
    });
    it("returns true for 'bot detection' keyword", () => {
        expect(shouldEscalateToRender("Failed due to bot detection")).toBe(true);
    });
    it("returns true for ECONNRESET", () => {
        expect(shouldEscalateToRender("read ECONNRESET")).toBe(true);
    });
    it("returns true for ECONNREFUSED", () => {
        expect(shouldEscalateToRender("connect ECONNREFUSED 1.2.3.4:443")).toBe(true);
    });
    it("returns true for 'socket disconnect' message", () => {
        expect(shouldEscalateToRender("socket disconnect before secure TLS connection was established")).toBe(true);
    });
    it("returns true for 'secure TLS' substring", () => {
        expect(shouldEscalateToRender("failed: secure TLS connection")).toBe(true);
    });
    it("is case-insensitive", () => {
        expect(shouldEscalateToRender("tls error")).toBe(true);
        expect(shouldEscalateToRender("ssl ERROR")).toBe(true);
        expect(shouldEscalateToRender("BOT DETECTION triggered")).toBe(true);
    });
    it("returns false for timeout messages", () => {
        expect(shouldEscalateToRender("Request timed out after 60s")).toBe(false);
    });
    it("returns false for generic error messages", () => {
        expect(shouldEscalateToRender("Something went wrong")).toBe(false);
    });
    it("returns false for DNS errors (not in escalation list)", () => {
        expect(shouldEscalateToRender("getaddrinfo ENOTFOUND example.com")).toBe(false);
    });
    it("returns false for empty string", () => {
        expect(shouldEscalateToRender("")).toBe(false);
    });
});
