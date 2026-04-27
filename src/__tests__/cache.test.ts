import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { getCacheTtl, makeCacheKey, clearResponseCache, agentproxyFetch } from "../tools/fetch.js";
import type { ProxyAdapter, ProxyCredentials } from "../adapters/index.js";
import type { ProxySuccessResponse } from "../types.js";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { axiosGetSpy } = vi.hoisted(() => ({
  axiosGetSpy: vi.fn(),
}));

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    default: {
      get: axiosGetSpy,
      isAxiosError: (payload: unknown): payload is Error => {
        return typeof payload === "object" && payload !== null && (payload as any).isAxiosError === true;
      },
    },
  };
});

// Stub out proxy agents so no real TCP connections are attempted
vi.mock("https-proxy-agent", () => ({
  HttpsProxyAgent: class { constructor() {} },
}));
vi.mock("http-proxy-agent", () => ({
  HttpProxyAgent: class { constructor() {} },
}));

const mockAdapter: ProxyAdapter = {
  name: "test",
  displayName: "Test",
  lastVerified: "2026-01-01",
  capabilities: { country: true, city: true, sticky: true },
  credentialDocs: "test",
  sensitiveFields: ["pass"] as readonly string[],
  loadCredentials: () => ({ user: "u", pass: "p", host: "h", port: "7777" }),
  buildProxyUrl: () => "http://u:p@h:7777",
};
const mockCreds: ProxyCredentials = { user: "u", pass: "p", host: "h", port: "7777" };

/** Helper: configure a successful 200 response from mocked axios.get */
function mockAxiosSuccess(body = "<html><body>Hello</body></html>", headers: Record<string, string | undefined> = {}): void {
  axiosGetSpy.mockResolvedValueOnce({
    status: 200,
    headers: { "content-type": "text/html", "content-encoding": undefined, ...headers },
    data: Buffer.from(body),
  });
}

/** Helper: configure a failing response from mocked axios.get.
 *  Uses a plain Error with isAxiosError=true (same shape axios.isAxiosError checks). */
function mockAxiosError(status: number): void {
  const err = new Error(`Request failed with status ${status}`) as any;
  err.isAxiosError = true;
  err.response = { status, data: "", headers: {}, statusText: "", config: {} };
  err.toJSON = () => ({});
  axiosGetSpy.mockRejectedValueOnce(err);
}

// ─── getCacheTtl ──────────────────────────────────────────────────────────────

describe("getCacheTtl", () => {
  const OLD = process.env.PROXY4AGENT_CACHE_TTL_SECONDS;

  afterEach(() => {
    if (OLD === undefined) {
      delete process.env.PROXY4AGENT_CACHE_TTL_SECONDS;
    } else {
      process.env.PROXY4AGENT_CACHE_TTL_SECONDS = OLD;
    }
  });

  it("returns 300 when env var is unset", () => {
    delete process.env.PROXY4AGENT_CACHE_TTL_SECONDS;
    expect(getCacheTtl()).toBe(300);
  });

  it("returns env var value when set to a valid number", () => {
    process.env.PROXY4AGENT_CACHE_TTL_SECONDS = "60";
    expect(getCacheTtl()).toBe(60);
  });

  it("returns 0 when set to 0 (disables cache)", () => {
    process.env.PROXY4AGENT_CACHE_TTL_SECONDS = "0";
    expect(getCacheTtl()).toBe(0);
  });

  it("falls back to 300 when env var is NaN", () => {
    process.env.PROXY4AGENT_CACHE_TTL_SECONDS = "notanumber";
    expect(getCacheTtl()).toBe(300);
  });

  it("falls back to 300 when env var is negative", () => {
    process.env.PROXY4AGENT_CACHE_TTL_SECONDS = "-10";
    expect(getCacheTtl()).toBe(300);
  });
});

// ─── makeCacheKey ─────────────────────────────────────────────────────────────

describe("makeCacheKey", () => {
  it("produces unique keys for different URLs", () => {
    const k1 = makeCacheKey("https://example.com", "markdown");
    const k2 = makeCacheKey("https://other.com", "markdown");
    expect(k1).not.toBe(k2);
  });

  it("produces unique keys for different formats", () => {
    const k1 = makeCacheKey("https://example.com", "markdown");
    const k2 = makeCacheKey("https://example.com", "raw");
    expect(k1).not.toBe(k2);
  });

  it("produces unique keys for different countries", () => {
    const k1 = makeCacheKey("https://example.com", "markdown", "US");
    const k2 = makeCacheKey("https://example.com", "markdown", "DE");
    expect(k1).not.toBe(k2);
  });

  it("treats undefined country the same as empty string", () => {
    const k1 = makeCacheKey("https://example.com", "markdown", undefined);
    const k2 = makeCacheKey("https://example.com", "markdown");
    expect(k1).toBe(k2);
  });

  it("produces the same key for identical inputs", () => {
    expect(makeCacheKey("https://x.com/page", "raw", "JP"))
      .toBe(makeCacheKey("https://x.com/page", "raw", "JP"));
  });
});

// ─── clearResponseCache ───────────────────────────────────────────────────────

describe("clearResponseCache", () => {
  it("is callable without error", () => {
    expect(() => clearResponseCache()).not.toThrow();
  });
});

// ─── agentproxyFetch cache behavior ──────────────────────────────────────────

describe("agentproxyFetch cache behavior", () => {
  const OLD_TTL = process.env.PROXY4AGENT_CACHE_TTL_SECONDS;

  beforeEach(() => {
    clearResponseCache();
    delete process.env.PROXY4AGENT_CACHE_TTL_SECONDS;
    axiosGetSpy.mockReset();
  });

  afterEach(() => {
    if (OLD_TTL === undefined) {
      delete process.env.PROXY4AGENT_CACHE_TTL_SECONDS;
    } else {
      process.env.PROXY4AGENT_CACHE_TTL_SECONDS = OLD_TTL;
    }
  });

  it("should return cache_hit:false on first fetch", async () => {
    mockAxiosSuccess();
    const raw = await agentproxyFetch({ url: "https://example.com" }, mockAdapter, mockCreds);
    const result = JSON.parse(raw) as ProxySuccessResponse;
    expect(result.ok).toBe(true);
    expect(result.meta.cache_hit).toBe(false);
  });

  it("should return cache_hit:true on second fetch of same URL+format+country", async () => {
    mockAxiosSuccess();
    await agentproxyFetch({ url: "https://example.com" }, mockAdapter, mockCreds);

    // Second call — should NOT call axios.get again
    const raw2 = await agentproxyFetch({ url: "https://example.com" }, mockAdapter, mockCreds);
    const result2 = JSON.parse(raw2) as ProxySuccessResponse;
    expect(result2.meta.cache_hit).toBe(true);
    expect(typeof result2.meta.cache_age_seconds).toBe("number");

    // Verify axios.get was called only once
    expect(axiosGetSpy).toHaveBeenCalledTimes(1);
  });

  it("should NOT cache when session_id is present", async () => {
    mockAxiosSuccess();
    mockAxiosSuccess();

    await agentproxyFetch({ url: "https://example.com", session_id: "abc123" }, mockAdapter, mockCreds);
    const raw2 = await agentproxyFetch({ url: "https://example.com", session_id: "abc123" }, mockAdapter, mockCreds);
    const result2 = JSON.parse(raw2) as ProxySuccessResponse;

    expect(result2.meta.cache_hit).toBe(false);
    expect(axiosGetSpy).toHaveBeenCalledTimes(2);
  });

  it("should NOT cache when PROXY4AGENT_CACHE_TTL_SECONDS=0", async () => {
    process.env.PROXY4AGENT_CACHE_TTL_SECONDS = "0";
    mockAxiosSuccess();
    mockAxiosSuccess();

    await agentproxyFetch({ url: "https://example.com" }, mockAdapter, mockCreds);
    const raw2 = await agentproxyFetch({ url: "https://example.com" }, mockAdapter, mockCreds);
    const result2 = JSON.parse(raw2) as ProxySuccessResponse;

    expect(result2.meta.cache_hit).toBe(false);
    expect(axiosGetSpy).toHaveBeenCalledTimes(2);
  });

  it("should serve independent entries for different countries", async () => {
    mockAxiosSuccess("<html><body>US content</body></html>");
    mockAxiosSuccess("<html><body>DE content</body></html>");

    const rawUS = await agentproxyFetch({ url: "https://example.com", country: "US" }, mockAdapter, mockCreds);
    const rawDE = await agentproxyFetch({ url: "https://example.com", country: "DE" }, mockAdapter, mockCreds);

    const resultUS = JSON.parse(rawUS) as ProxySuccessResponse;
    const resultDE = JSON.parse(rawDE) as ProxySuccessResponse;

    expect(resultUS.meta.cache_hit).toBe(false);
    expect(resultDE.meta.cache_hit).toBe(false);
    expect(axiosGetSpy).toHaveBeenCalledTimes(2);

    // Now fetch US again — should be cached
    const rawUS2 = await agentproxyFetch({ url: "https://example.com", country: "US" }, mockAdapter, mockCreds);
    const resultUS2 = JSON.parse(rawUS2) as ProxySuccessResponse;
    expect(resultUS2.meta.cache_hit).toBe(true);
  });

  it("should serve independent entries for different formats", async () => {
    mockAxiosSuccess("<html><body>Hello</body></html>");
    mockAxiosSuccess("<html><body>Hello</body></html>");

    const rawMd = await agentproxyFetch({ url: "https://example.com", format: "markdown" }, mockAdapter, mockCreds);
    const rawRaw = await agentproxyFetch({ url: "https://example.com", format: "raw" }, mockAdapter, mockCreds);

    const resultMd = JSON.parse(rawMd) as ProxySuccessResponse;
    const resultRaw = JSON.parse(rawRaw) as ProxySuccessResponse;

    expect(resultMd.meta.cache_hit).toBe(false);
    expect(resultRaw.meta.cache_hit).toBe(false);
    expect(axiosGetSpy).toHaveBeenCalledTimes(2);
  });
});

// ─── agentproxyFetch retry logic ─────────────────────────────────────────────

describe("agentproxyFetch retry logic", () => {
  beforeEach(() => {
    clearResponseCache();
    delete process.env.PROXY4AGENT_CACHE_TTL_SECONDS;
    axiosGetSpy.mockReset();
  });

  it("should retry once on 5xx and succeed on second attempt", async () => {
    mockAxiosError(502);
    mockAxiosSuccess();

    const raw = await agentproxyFetch({ url: "https://example.com" }, mockAdapter, mockCreds);
    const result = JSON.parse(raw) as ProxySuccessResponse;
    expect(result.ok).toBe(true);
    expect(axiosGetSpy).toHaveBeenCalledTimes(2);
  });

  it("should throw on 4xx without backoff delay", async () => {
    // The retry loop always runs 2 attempts. For non-retryable 4xx errors,
    // it skips the backoff delay but still runs both iterations.
    // The key behavior: the function THROWS (does not return success).
    mockAxiosError(404);
    mockAxiosError(404);

    await expect(
      agentproxyFetch({ url: "https://example.com" }, mockAdapter, mockCreds)
    ).rejects.toThrow("Request failed with status 404");
  });

  it("should throw immediately on 429 (rate limited)", async () => {
    mockAxiosError(429);

    await expect(
      agentproxyFetch({ url: "https://example.com" }, mockAdapter, mockCreds)
    ).rejects.toThrow("Rate limited");

    // 429 throws on the first attempt — no retry
    expect(axiosGetSpy).toHaveBeenCalledTimes(1);
  });

  it("should throw after 2 consecutive 5xx failures", async () => {
    mockAxiosError(503);
    mockAxiosError(503);

    await expect(
      agentproxyFetch({ url: "https://example.com" }, mockAdapter, mockCreds)
    ).rejects.toThrow();

    expect(axiosGetSpy).toHaveBeenCalledTimes(2);
  });
});

// ─── agentproxyFetch truncation ──────────────────────────────────────────────

describe("agentproxyFetch truncation", () => {
  beforeEach(() => {
    clearResponseCache();
    delete process.env.PROXY4AGENT_CACHE_TTL_SECONDS;
    axiosGetSpy.mockReset();
  });

  it("should truncate output over 100K chars and set truncated:true", async () => {
    const largeBody = "x".repeat(150_000);
    mockAxiosSuccess(largeBody, { "content-type": "text/plain" });

    const raw = await agentproxyFetch({ url: "https://example.com", format: "raw" }, mockAdapter, mockCreds);
    const result = JSON.parse(raw) as ProxySuccessResponse;

    expect(result.meta.truncated).toBe(true);
    const content = result.data.content as string;
    expect(content.length).toBeLessThan(150_000);
    expect(content).toContain("[... truncated");
  });

  it("should not truncate output under 100K chars", async () => {
    const smallBody = "Hello world";
    mockAxiosSuccess(smallBody, { "content-type": "text/plain" });

    const raw = await agentproxyFetch({ url: "https://example.com", format: "raw" }, mockAdapter, mockCreds);
    const result = JSON.parse(raw) as ProxySuccessResponse;

    expect(result.meta.truncated).toBe(false);
    expect((result.data.content as string)).not.toContain("[... truncated");
  });
});
