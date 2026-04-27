import { agentproxyFetch } from "./fetch.js";
import type { ProxyAdapter, ProxyCredentials } from "../adapters/index.js";
import type { ProxySuccessResponse } from "../types.js";
import { SAFE_COUNTRY, SAFE_SESSION_ID, QUOTA_NOTE } from "../validation.js";

export interface BatchFetchParams {
  urls: string[];
  country?: string;
  session_id?: string;
  format?: "markdown" | "raw";
  timeout?: number;
  concurrency?: number;
}

export interface BatchFetchResult {
  url: string;
  ok: boolean;
  status_code?: number;
  content?: string;
  size_bytes?: number;
  cache_hit?: boolean;  // true = served from in-process cache (no proxy credit consumed)
  error?: { code: string; message: string };
  latency_ms: number;
}

export async function agentproxyBatchFetch(
  params: BatchFetchParams,
  adapter: ProxyAdapter,
  credentials: ProxyCredentials
): Promise<string> {
  const {
    urls,
    country,
    session_id,
    format = "markdown",
    timeout = 60,
    concurrency = 3,
  } = params;

  const wallStart = Date.now();

  // Semaphore-based concurrency control
  let activeCount = 0;
  const queue: Array<() => void> = [];

  function acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (activeCount < concurrency) {
        activeCount++;
        resolve();
      } else {
        queue.push(() => {
          activeCount++;
          resolve();
        });
      }
    });
  }

  function release(): void {
    activeCount--;
    const next = queue.shift();
    if (next) next();
  }

  const fetchOne = async (url: string): Promise<BatchFetchResult> => {
    const start = Date.now();
    await acquire();
    try {
      const rawResult = await agentproxyFetch(
        { url, country, session_id, format, timeout },
        adapter,
        credentials
      );
      const parsed = JSON.parse(rawResult) as ProxySuccessResponse;
      const latency_ms = Date.now() - start;

      return {
        url,
        ok: true,
        status_code: parsed.data.status_code as number | undefined,
        content: parsed.data.content as string | undefined,
        size_bytes: parsed.data.size_bytes as number | undefined,
        cache_hit: parsed.meta.cache_hit,
        latency_ms,
      };
    } catch (err) {
      const latency_ms = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);

      // Infer error code from message
      let code = "UNKNOWN_ERROR";
      if (msg.includes("429") || msg.includes("rate limit")) code = "RATE_LIMITED";
      else if (msg.includes("timeout") || msg.includes("ECONNABORTED")) code = "TIMEOUT";
      else if (msg.includes("TLS") || msg.includes("SSL")) code = "TLS_ERROR";
      else if (msg.includes("blocked") || msg.includes("403") || msg.includes("401")) code = "BOT_DETECTION_SUSPECTED";
      else if (msg.includes("http://") || msg.includes("https://") || msg.includes("must start with")) code = "INVALID_INPUT";

      return {
        url,
        ok: false,
        error: { code, message: msg },
        latency_ms,
      };
    } finally {
      release();
    }
  };

  const results = await Promise.all(urls.map(fetchOne));

  const wallLatency = Date.now() - wallStart;
  const succeeded = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const cachedCount = results.filter(r => r.ok && r.cache_hit).length;

  const result: ProxySuccessResponse = {
    ok: true,
    tool: "agentproxy_batch_fetch",
    data: {
      requested: urls.length,
      succeeded,
      failed,
      results: results as unknown as Record<string, unknown>[],
    },
    meta: {
      latency_ms: wallLatency,
      concurrency,
      country,
      quota: {
        credits_estimated: urls.length - cachedCount,
        note: QUOTA_NOTE,
      },
    },
  };

  if (!result.meta.country) delete result.meta.country;

  return JSON.stringify(result);
}

export function validateBatchFetchParams(raw: Record<string, unknown>): BatchFetchParams {
  if (!raw.urls || !Array.isArray(raw.urls)) {
    throw new Error("urls is required and must be an array");
  }
  if (raw.urls.length < 2 || raw.urls.length > 20) {
    throw new Error("urls must contain between 2 and 20 URLs");
  }
  for (const u of raw.urls) {
    if (typeof u !== "string") throw new Error("each url must be a string");
    // Note: URL format is intentionally NOT validated here — invalid URLs are captured
    // as per-item errors in data.results rather than failing the whole batch.
    // This allows agents to pass mixed lists and inspect failures per-URL.
  }
  if (raw.country !== undefined) {
    if (typeof raw.country !== "string" || raw.country.length > 10 || !SAFE_COUNTRY.test(raw.country)) {
      throw new Error("country must be a 2-letter ISO code with no hyphens (e.g. US, DE, GB)");
    }
  }
  if (raw.session_id !== undefined) {
    if (typeof raw.session_id !== "string" || raw.session_id.length > 64 || !SAFE_SESSION_ID.test(raw.session_id)) {
      throw new Error("session_id must contain only letters, numbers, and underscores, max 64 chars (no hyphens)");
    }
  }
  if (raw.format && raw.format !== "raw" && raw.format !== "markdown") {
    throw new Error("format must be 'raw' or 'markdown'");
  }
  const timeout = raw.timeout !== undefined ? Number(raw.timeout) : 60;
  if (!Number.isFinite(timeout) || timeout < 1 || timeout > 120) {
    throw new Error("timeout must be between 1 and 120 seconds");
  }
  const concurrency = raw.concurrency !== undefined ? Number(raw.concurrency) : 3;
  if (!Number.isFinite(concurrency) || concurrency < 1 || concurrency > 5) {
    throw new Error("concurrency must be between 1 and 5");
  }
  return {
    urls: raw.urls as string[],
    country:     raw.country     as string | undefined,
    session_id:  raw.session_id  as string | undefined,
    format:      (raw.format as "raw" | "markdown") || "markdown",
    timeout,
    concurrency,
  };
}
