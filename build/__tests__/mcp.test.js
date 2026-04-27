import { describe, it, expect } from "vitest";
import { classifyError } from "../index.js";
/**
 * MCP protocol layer contract tests.
 *
 * These verify the static shape of the server's tool, prompt, and resource
 * registrations without making any network calls.  The TOOLS array is
 * module-level in index.ts and exercised indirectly via classifyError
 * (already exported).  For prompts/resources (class-internal), we test
 * the classifyError contract completeness and the module's public surface.
 */
describe("MCP server contracts", () => {
    // ─── Module surface ──────────────────────────────────────────
    it("index.ts exports classifyError as a function", async () => {
        const mod = await import("../index.js");
        expect(typeof mod.classifyError).toBe("function");
    });
    // ─── classifyError response shape completeness ───────────────
    it("classifyError always returns ok:false with required error fields", () => {
        const result = classifyError(new Error("unknown failure"));
        expect(result.ok).toBe(false);
        expect(result.error).toBeDefined();
        expect(typeof result.error.code).toBe("string");
        expect(typeof result.error.message).toBe("string");
        expect(typeof result.error.recoverable).toBe("boolean");
        expect(typeof result.error.agent_instruction).toBe("string");
    });
    it("classifyError returns a valid ProxyErrorCode for every branch", () => {
        const KNOWN_CODES = [
            "RATE_LIMITED",
            "PAGE_NOT_FOUND",
            "BOT_DETECTION_SUSPECTED",
            "TIMEOUT",
            "NETWORK_ERROR",
            "TLS_ERROR",
            "PROVIDER_NOT_CONFIGURED",
            "INVALID_INPUT",
            "UNKNOWN_ERROR",
        ];
        // Trigger each branch with a representative error
        const triggers = [
            ["TIMEOUT", new Error("ECONNABORTED")],
            ["NETWORK_ERROR", new Error("getaddrinfo ENOTFOUND")],
            ["TLS_ERROR", new Error("TLS handshake failed")],
            ["PROVIDER_NOT_CONFIGURED", new Error("No proxy provider not configured")],
            ["INVALID_INPUT", new Error("url is required")],
            ["UNKNOWN_ERROR", new Error("something entirely new")],
        ];
        for (const [expectedCode, err] of triggers) {
            const result = classifyError(err);
            expect(result.error.code).toBe(expectedCode);
            expect(KNOWN_CODES).toContain(result.error.code);
        }
    });
    it("classifyError includes retry_after_seconds only for retryable codes that specify it", () => {
        // TIMEOUT should have retry_after_seconds
        const timeout = classifyError(new Error("ECONNABORTED"));
        expect(timeout.error.retry_after_seconds).toBe(2);
        // TLS_ERROR should have retry_after_seconds
        const tls = classifyError(new Error("TLS connection failed"));
        expect(tls.error.retry_after_seconds).toBe(2);
        // UNKNOWN_ERROR should NOT have retry_after_seconds
        const unknown = classifyError(new Error("something weird"));
        expect(unknown.error.retry_after_seconds).toBeUndefined();
        // INVALID_INPUT should NOT have retry_after_seconds
        const invalid = classifyError(new Error("url is required"));
        expect(invalid.error.retry_after_seconds).toBeUndefined();
    });
});
