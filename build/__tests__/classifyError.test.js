import { describe, it, expect } from "vitest";
import { classifyError } from "../index.js";
// Helper to create a mock AxiosError that passes axios.isAxiosError()
function makeAxiosError(status, message) {
    const err = new Error(message || `Request failed with status code ${status}`);
    err.isAxiosError = true;
    err.response = { status, data: {}, headers: {}, statusText: "", config: {} };
    err.config = {};
    err.toJSON = () => ({});
    return err;
}
describe("classifyError", () => {
    // ─── 429 → RATE_LIMITED ────────────────────────────────────
    it("should return RATE_LIMITED with retry_after_seconds for HTTP 429", () => {
        const result = classifyError(makeAxiosError(429));
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("RATE_LIMITED");
        expect(result.error.recoverable).toBe(true);
        expect(result.error.retry_after_seconds).toBe(5);
    });
    // ─── 404 → PAGE_NOT_FOUND ─────────────────────────────────
    it("should return PAGE_NOT_FOUND for HTTP 404", () => {
        const result = classifyError(makeAxiosError(404));
        expect(result.error.code).toBe("PAGE_NOT_FOUND");
    });
    it("should set recoverable:false for PAGE_NOT_FOUND", () => {
        const result = classifyError(makeAxiosError(404));
        expect(result.error.recoverable).toBe(false);
    });
    // ─── 401, 403 → BOT_DETECTION_SUSPECTED ───────────────────
    it("should return BOT_DETECTION_SUSPECTED for HTTP 403", () => {
        const result = classifyError(makeAxiosError(403));
        expect(result.error.code).toBe("BOT_DETECTION_SUSPECTED");
        expect(result.error.recoverable).toBe(true);
    });
    it("should return BOT_DETECTION_SUSPECTED for HTTP 401", () => {
        const result = classifyError(makeAxiosError(401));
        expect(result.error.code).toBe("BOT_DETECTION_SUSPECTED");
    });
    // ─── Timeout ──────────────────────────────────────────────
    it("should return TIMEOUT when message contains 'timeout'", () => {
        const result = classifyError(new Error("Connection timeout after 60s"));
        expect(result.error.code).toBe("TIMEOUT");
        expect(result.error.recoverable).toBe(true);
        expect(result.error.retry_after_seconds).toBe(2);
    });
    it("should return TIMEOUT when message contains 'ECONNABORTED'", () => {
        const result = classifyError(new Error("ECONNABORTED"));
        expect(result.error.code).toBe("TIMEOUT");
    });
    // ─── DNS → NETWORK_ERROR ──────────────────────────────────
    it("should return NETWORK_ERROR for ENOTFOUND", () => {
        const result = classifyError(new Error("getaddrinfo ENOTFOUND example.invalid"));
        expect(result.error.code).toBe("NETWORK_ERROR");
        expect(result.error.recoverable).toBe(false);
    });
    it("should return NETWORK_ERROR for getaddrinfo", () => {
        const result = classifyError(new Error("getaddrinfo EAI_AGAIN some.host"));
        expect(result.error.code).toBe("NETWORK_ERROR");
    });
    // ─── TLS ──────────────────────────────────────────────────
    it("should return TLS_ERROR when message contains 'TLS'", () => {
        const result = classifyError(new Error("TLS handshake failed"));
        expect(result.error.code).toBe("TLS_ERROR");
        expect(result.error.recoverable).toBe(true);
        expect(result.error.retry_after_seconds).toBe(2);
    });
    it("should return TLS_ERROR when message contains 'SSL'", () => {
        const result = classifyError(new Error("SSL connection error"));
        expect(result.error.code).toBe("TLS_ERROR");
    });
    it("should return TLS_ERROR when message contains 'certificate'", () => {
        const result = classifyError(new Error("unable to verify the first certificate"));
        expect(result.error.code).toBe("TLS_ERROR");
    });
    // ─── PROVIDER_NOT_CONFIGURED ──────────────────────────────
    it("should return PROVIDER_NOT_CONFIGURED for 'not configured'", () => {
        const result = classifyError(new Error("Proxy provider not configured"));
        expect(result.error.code).toBe("PROVIDER_NOT_CONFIGURED");
        expect(result.error.recoverable).toBe(false);
    });
    // ─── INVALID_INPUT ────────────────────────────────────────
    it("should return INVALID_INPUT for 'is required'", () => {
        const result = classifyError(new Error("url is required"));
        expect(result.error.code).toBe("INVALID_INPUT");
        expect(result.error.recoverable).toBe(false);
    });
    it("should return INVALID_INPUT for 'must be'", () => {
        const result = classifyError(new Error("country must be a 2-letter ISO code"));
        expect(result.error.code).toBe("INVALID_INPUT");
    });
    // ─── UNKNOWN_ERROR fallback ───────────────────────────────
    it("should return UNKNOWN_ERROR for unrecognized errors", () => {
        const result = classifyError(new Error("something completely unexpected"));
        expect(result.error.code).toBe("UNKNOWN_ERROR");
        expect(result.error.recoverable).toBe(true);
    });
    it("should handle non-Error values (plain string)", () => {
        const result = classifyError("a plain string error");
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("UNKNOWN_ERROR");
        expect(result.error.message).toBe("a plain string error");
    });
    // ─── Priority / ordering ──────────────────────────────────
    it("should classify NETWORK_ERROR before TLS_ERROR when message contains both ENOTFOUND and SSL", () => {
        // DNS check comes before TLS check in classifyError
        const result = classifyError(new Error("ENOTFOUND SSL connection to host failed"));
        expect(result.error.code).toBe("NETWORK_ERROR");
    });
    it("should classify 429 before generic 4xx", () => {
        // 429 is a 4xx but gets its own RATE_LIMITED code, not BOT_DETECTION_SUSPECTED
        const result = classifyError(makeAxiosError(429));
        expect(result.error.code).toBe("RATE_LIMITED");
        expect(result.error.code).not.toBe("BOT_DETECTION_SUSPECTED");
    });
    it("should classify 404 before generic 4xx", () => {
        // 404 is a 4xx but gets its own PAGE_NOT_FOUND code, not BOT_DETECTION_SUSPECTED
        const result = classifyError(makeAxiosError(404));
        expect(result.error.code).toBe("PAGE_NOT_FOUND");
        expect(result.error.code).not.toBe("BOT_DETECTION_SUSPECTED");
    });
    // ─── Recoverable flags ────────────────────────────────────
    it("should set recoverable:false for NETWORK_ERROR, PAGE_NOT_FOUND, PROVIDER_NOT_CONFIGURED, INVALID_INPUT", () => {
        const cases = [
            [new Error("ENOTFOUND bad.host"), "NETWORK_ERROR"],
            [makeAxiosError(404), "PAGE_NOT_FOUND"],
            [new Error("not configured"), "PROVIDER_NOT_CONFIGURED"],
            [new Error("url is required"), "INVALID_INPUT"],
        ];
        for (const [err, expectedCode] of cases) {
            const result = classifyError(err);
            expect(result.error.code).toBe(expectedCode);
            expect(result.error.recoverable).toBe(false);
        }
    });
    it("should set recoverable:true for RATE_LIMITED, TIMEOUT, TLS_ERROR, BOT_DETECTION_SUSPECTED, UNKNOWN_ERROR", () => {
        const cases = [
            [makeAxiosError(429), "RATE_LIMITED"],
            [new Error("timeout"), "TIMEOUT"],
            [new Error("TLS handshake failed"), "TLS_ERROR"],
            [makeAxiosError(403), "BOT_DETECTION_SUSPECTED"],
            [new Error("some random error"), "UNKNOWN_ERROR"],
        ];
        for (const [err, expectedCode] of cases) {
            const result = classifyError(err);
            expect(result.error.code).toBe(expectedCode);
            expect(result.error.recoverable).toBe(true);
        }
    });
});
