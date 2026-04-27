import { describe, it, expect } from "vitest";
import { validateFetchParams } from "../tools/fetch.js";
import { validateSessionParams } from "../tools/session.js";
import { validateRenderParams } from "../tools/render.js";
import { validateSearchParams } from "../tools/search.js";
import { validateBatchFetchParams } from "../tools/batch.js";
import { validateExtractParams } from "../tools/extract.js";
import { validateMapParams } from "../tools/map.js";
// ─── Fetch validator ──────────────────────────────────────
describe("validateFetchParams", () => {
    it("accepts valid params", () => {
        const p = validateFetchParams({ url: "https://example.com" });
        expect(p.url).toBe("https://example.com");
        expect(p.format).toBe("markdown");
        expect(p.timeout).toBe(60);
    });
    it("rejects missing url", () => {
        expect(() => validateFetchParams({})).toThrow("url is required");
    });
    it("rejects non-http url", () => {
        expect(() => validateFetchParams({ url: "ftp://bad" })).toThrow("http://");
    });
    it("rejects country with hyphens (injection prevention)", () => {
        expect(() => validateFetchParams({ url: "https://x.com", country: "us-session-injected" }))
            .toThrow();
    });
    it("rejects country over 10 chars", () => {
        expect(() => validateFetchParams({ url: "https://x.com", country: "abcdefghijk" }))
            .toThrow();
    });
    it("rejects city with hyphens", () => {
        expect(() => validateFetchParams({ url: "https://x.com", city: "new-york" }))
            .toThrow();
    });
    it("rejects city over 50 chars", () => {
        expect(() => validateFetchParams({ url: "https://x.com", city: "a".repeat(51) }))
            .toThrow();
    });
    it("rejects session_id with hyphens", () => {
        expect(() => validateFetchParams({ url: "https://x.com", session_id: "my-session" }))
            .toThrow();
    });
    it("rejects session_id over 64 chars", () => {
        expect(() => validateFetchParams({ url: "https://x.com", session_id: "a".repeat(65) }))
            .toThrow();
    });
    it("accepts valid session_id", () => {
        const p = validateFetchParams({ url: "https://x.com", session_id: "abc_123" });
        expect(p.session_id).toBe("abc_123");
    });
    it("rejects invalid format", () => {
        expect(() => validateFetchParams({ url: "https://x.com", format: "json" }))
            .toThrow("format");
    });
    it("rejects NaN timeout", () => {
        expect(() => validateFetchParams({ url: "https://x.com", timeout: "abc" }))
            .toThrow("timeout");
    });
    it("rejects timeout out of range", () => {
        // 0 is falsy — defaults to 60, so only test explicit out-of-range values
        expect(() => validateFetchParams({ url: "https://x.com", timeout: -1 })).toThrow();
        expect(() => validateFetchParams({ url: "https://x.com", timeout: 121 })).toThrow();
    });
    it("accepts valid timeout", () => {
        expect(validateFetchParams({ url: "https://x.com", timeout: 30 }).timeout).toBe(30);
    });
});
// ─── Session validator ────────────────────────────────────
describe("validateSessionParams", () => {
    it("accepts valid params", () => {
        const p = validateSessionParams({ session_id: "s1", url: "https://x.com" });
        expect(p.session_id).toBe("s1");
        expect(p.format).toBe("markdown");
    });
    it("rejects missing session_id", () => {
        expect(() => validateSessionParams({ url: "https://x.com" })).toThrow("session_id");
    });
    it("rejects session_id with hyphens", () => {
        expect(() => validateSessionParams({ session_id: "a-b", url: "https://x.com" }))
            .toThrow();
    });
    it("rejects country with hyphens", () => {
        expect(() => validateSessionParams({ session_id: "s1", url: "https://x.com", country: "us-bad" }))
            .toThrow();
    });
    it("rejects city with hyphens", () => {
        expect(() => validateSessionParams({ session_id: "s1", url: "https://x.com", city: "new-york" }))
            .toThrow();
    });
    it("validates format", () => {
        expect(() => validateSessionParams({ session_id: "s1", url: "https://x.com", format: "json" }))
            .toThrow("format");
    });
    it("rejects NaN timeout", () => {
        expect(() => validateSessionParams({ session_id: "s1", url: "https://x.com", timeout: "abc" }))
            .toThrow("timeout");
    });
});
// ─── Render validator ─────────────────────────────────────
describe("validateRenderParams", () => {
    it("accepts valid params", () => {
        const p = validateRenderParams({ url: "https://x.com" });
        expect(p.format).toBe("markdown");
        expect(p.timeout).toBe(60);
    });
    it("rejects missing url", () => {
        expect(() => validateRenderParams({})).toThrow("url");
    });
    it("rejects invalid format", () => {
        expect(() => validateRenderParams({ url: "https://x.com", format: "json" })).toThrow();
    });
    it("rejects wait_for over 200 chars", () => {
        expect(() => validateRenderParams({ url: "https://x.com", wait_for: "a".repeat(201) }))
            .toThrow("200");
    });
    it("rejects wait_for with unsafe characters (backtick)", () => {
        expect(() => validateRenderParams({ url: "https://x.com", wait_for: "div`injected`" }))
            .toThrow("invalid characters");
    });
    it("rejects wait_for with semicolons", () => {
        expect(() => validateRenderParams({ url: "https://x.com", wait_for: "div;alert(1)" }))
            .toThrow("invalid characters");
    });
    it("rejects wait_for with curly braces", () => {
        expect(() => validateRenderParams({ url: "https://x.com", wait_for: "div{color:red}" }))
            .toThrow("invalid characters");
    });
    it("accepts valid CSS selectors", () => {
        const cases = [".class", "#id", "div > span", "[data-test='value']", "h1:first-child", ".a .b .c"];
        for (const sel of cases) {
            expect(validateRenderParams({ url: "https://x.com", wait_for: sel }).wait_for).toBe(sel);
        }
    });
    it("rejects timeout below 5", () => {
        expect(() => validateRenderParams({ url: "https://x.com", timeout: 4 })).toThrow();
    });
    it("rejects NaN timeout", () => {
        expect(() => validateRenderParams({ url: "https://x.com", timeout: "abc" })).toThrow();
    });
});
// ─── Search validator ─────────────────────────────────────
describe("validateSearchParams", () => {
    it("accepts valid params", () => {
        const p = validateSearchParams({ query: "test" });
        expect(p.query).toBe("test");
        expect(p.num).toBe(10);
        expect(p.engine).toBe("google");
    });
    it("rejects missing query", () => {
        expect(() => validateSearchParams({})).toThrow("query");
    });
    it("rejects non-google engine", () => {
        expect(() => validateSearchParams({ query: "test", engine: "bing" })).toThrow("google");
    });
    it("rejects NaN num", () => {
        expect(() => validateSearchParams({ query: "test", num: "abc" })).toThrow("num");
    });
    it("rejects num out of range", () => {
        // 0 is falsy — defaults to 10, so only test explicit out-of-range values
        expect(() => validateSearchParams({ query: "test", num: -1 })).toThrow();
        expect(() => validateSearchParams({ query: "test", num: 21 })).toThrow();
    });
    it("rejects country with invalid chars", () => {
        expect(() => validateSearchParams({ query: "test", country: "u s" })).toThrow();
    });
    it("accepts valid locale codes", () => {
        expect(validateSearchParams({ query: "test", country: "en-US" }).country).toBe("en-US");
        expect(validateSearchParams({ query: "test", language: "zh" }).language).toBe("zh");
    });
});
// ─── Batch fetch validator ────────────────────────────────
describe("validateBatchFetchParams", () => {
    const validUrls = ["https://example.com", "https://httpbin.org/ip"];
    it("accepts valid params", () => {
        const p = validateBatchFetchParams({ urls: validUrls });
        expect(p.urls).toHaveLength(2);
        expect(p.concurrency).toBe(3);
        expect(p.format).toBe("markdown");
        expect(p.timeout).toBe(60);
    });
    it("rejects missing urls", () => {
        expect(() => validateBatchFetchParams({})).toThrow("urls is required");
    });
    it("rejects non-array urls", () => {
        expect(() => validateBatchFetchParams({ urls: "https://example.com" })).toThrow("array");
    });
    it("rejects fewer than 2 urls", () => {
        expect(() => validateBatchFetchParams({ urls: ["https://example.com"] })).toThrow("between 2 and 20");
    });
    it("rejects more than 20 urls", () => {
        const tooMany = Array.from({ length: 21 }, (_, i) => `https://example.com/${i}`);
        expect(() => validateBatchFetchParams({ urls: tooMany })).toThrow("between 2 and 20");
    });
    it("allows url missing http(s) scheme (per-item failure, not batch rejection)", () => {
        // Invalid URLs are not rejected at validation time — they become per-item errors in data.results
        expect(() => validateBatchFetchParams({ urls: ["https://example.com", "not-a-url"] }))
            .not.toThrow();
    });
    it("rejects non-string in urls array", () => {
        expect(() => validateBatchFetchParams({ urls: ["https://example.com", 42] }))
            .toThrow("string");
    });
    it("rejects country with hyphens", () => {
        expect(() => validateBatchFetchParams({ urls: validUrls, country: "us-bad" })).toThrow();
    });
    it("rejects session_id with hyphens", () => {
        expect(() => validateBatchFetchParams({ urls: validUrls, session_id: "my-session" })).toThrow();
    });
    it("rejects invalid format", () => {
        expect(() => validateBatchFetchParams({ urls: validUrls, format: "json" })).toThrow("format");
    });
    it("rejects concurrency out of range", () => {
        expect(() => validateBatchFetchParams({ urls: validUrls, concurrency: 0 })).toThrow("concurrency");
        expect(() => validateBatchFetchParams({ urls: validUrls, concurrency: 6 })).toThrow("concurrency");
    });
    it("accepts valid concurrency", () => {
        expect(validateBatchFetchParams({ urls: validUrls, concurrency: 5 }).concurrency).toBe(5);
    });
    it("rejects NaN timeout", () => {
        expect(() => validateBatchFetchParams({ urls: validUrls, timeout: "abc" })).toThrow("timeout");
    });
    it("rejects timeout out of range", () => {
        expect(() => validateBatchFetchParams({ urls: validUrls, timeout: 0 })).toThrow();
        expect(() => validateBatchFetchParams({ urls: validUrls, timeout: 121 })).toThrow();
    });
});
// ─── Extract validator ──────────────────────────────────
describe("validateExtractParams", () => {
    it("accepts valid params with url and fields array", () => {
        const p = validateExtractParams({ url: "https://example.com", fields: ["title", "price"] });
        expect(p.url).toBe("https://example.com");
        expect(p.fields).toEqual(["title", "price"]);
        expect(p.timeout).toBe(60);
        expect(p.render_fallback).toBe(false);
    });
    it("rejects missing url", () => {
        expect(() => validateExtractParams({ fields: ["title"] })).toThrow("url is required");
    });
    it("rejects non-http url", () => {
        expect(() => validateExtractParams({ url: "ftp://bad.com", fields: ["title"] })).toThrow("http://");
    });
    it("rejects missing fields", () => {
        expect(() => validateExtractParams({ url: "https://example.com" })).toThrow("fields is required");
    });
    it("rejects fields that is not an array", () => {
        expect(() => validateExtractParams({ url: "https://example.com", fields: "title" })).toThrow("fields is required");
    });
    it("rejects empty fields array", () => {
        expect(() => validateExtractParams({ url: "https://example.com", fields: [] })).toThrow("fields is required");
    });
    it("rejects fields with more than 20 elements", () => {
        const tooMany = Array.from({ length: 21 }, (_, i) => `field${i}`);
        expect(() => validateExtractParams({ url: "https://example.com", fields: tooMany })).toThrow("at most 20");
    });
    it("rejects non-string field element", () => {
        expect(() => validateExtractParams({ url: "https://example.com", fields: [42] })).toThrow("string");
    });
    it("rejects field string over 50 chars", () => {
        const longField = "a".repeat(51);
        expect(() => validateExtractParams({ url: "https://example.com", fields: [longField] })).toThrow("50");
    });
    it("rejects country with hyphens", () => {
        expect(() => validateExtractParams({ url: "https://example.com", fields: ["title"], country: "us-bad" })).toThrow();
    });
    it("rejects session_id with hyphens", () => {
        expect(() => validateExtractParams({ url: "https://example.com", fields: ["title"], session_id: "my-session" })).toThrow();
    });
    it("rejects timeout out of range", () => {
        expect(() => validateExtractParams({ url: "https://example.com", fields: ["title"], timeout: 0 })).toThrow();
        expect(() => validateExtractParams({ url: "https://example.com", fields: ["title"], timeout: 121 })).toThrow();
    });
    it("passes render_fallback:true through", () => {
        const p = validateExtractParams({ url: "https://example.com", fields: ["title"], render_fallback: true });
        expect(p.render_fallback).toBe(true);
    });
    it("defaults render_fallback to false", () => {
        const p = validateExtractParams({ url: "https://example.com", fields: ["title"] });
        expect(p.render_fallback).toBe(false);
    });
});
// ─── Map validator ──────────────────────────────────────
describe("validateMapParams", () => {
    it("accepts valid url with defaults", () => {
        const p = validateMapParams({ url: "https://example.com" });
        expect(p.url).toBe("https://example.com");
        expect(p.limit).toBe(50);
        expect(p.include_external).toBe(false);
        expect(p.timeout).toBe(60);
    });
    it("rejects missing url", () => {
        expect(() => validateMapParams({})).toThrow("url is required");
    });
    it("rejects non-http url", () => {
        expect(() => validateMapParams({ url: "ftp://bad.com" })).toThrow("http://");
    });
    it("rejects limit below 10", () => {
        expect(() => validateMapParams({ url: "https://example.com", limit: 5 })).toThrow("between 10 and 200");
    });
    it("rejects limit above 200", () => {
        expect(() => validateMapParams({ url: "https://example.com", limit: 201 })).toThrow("between 10 and 200");
    });
    it("rejects NaN limit", () => {
        expect(() => validateMapParams({ url: "https://example.com", limit: "abc" })).toThrow("between 10 and 200");
    });
    it("rejects country with hyphens", () => {
        expect(() => validateMapParams({ url: "https://example.com", country: "us-bad" })).toThrow();
    });
    it("rejects timeout out of range", () => {
        expect(() => validateMapParams({ url: "https://example.com", timeout: 0 })).toThrow();
        expect(() => validateMapParams({ url: "https://example.com", timeout: 121 })).toThrow();
    });
    it("passes include_external:true through", () => {
        const p = validateMapParams({ url: "https://example.com", include_external: true });
        expect(p.include_external).toBe(true);
    });
    it("defaults include_external to false", () => {
        const p = validateMapParams({ url: "https://example.com" });
        expect(p.include_external).toBe(false);
    });
});
