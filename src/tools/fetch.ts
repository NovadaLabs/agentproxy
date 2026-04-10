import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import { gunzipSync, brotliDecompressSync, inflateSync } from "zlib";
import { DEFAULT_USER_AGENT } from "../config.js";
import { htmlToMarkdown, unicodeSafeTruncate } from "../utils.js";
import type { ProxyAdapter, ProxyCredentials } from "../adapters/index.js";

// Input validation patterns — prevent proxy username injection.
// No hyphens: Novada uses `-` as segment delimiter; other adapters have similar constraints.
// These patterns are intentionally strict — adapters may further restrict via their own format.
const SAFE_COUNTRY    = /^[a-zA-Z0-9_]+$/;
const SAFE_CITY       = /^[a-zA-Z0-9_]+$/;
const SAFE_SESSION_ID = /^[a-zA-Z0-9_]+$/;

export interface FetchParams {
  url: string;
  country?: string;
  city?: string;
  session_id?: string;
  format?: "raw" | "markdown";
  timeout?: number;
}

function decompress(buffer: Buffer, encoding: string | undefined): string {
  // When the server declares an encoding, trust it — throw on failure so the retry loop fires
  if (encoding === "gzip")    return gunzipSync(buffer).toString("utf-8");
  if (encoding === "br")      return brotliDecompressSync(buffer).toString("utf-8");
  if (encoding === "deflate") return inflateSync(buffer).toString("utf-8");

  // No encoding header — probe common encodings as best-effort fallback
  // (some servers send compressed data without declaring it)
  try { return gunzipSync(buffer).toString("utf-8"); } catch { /* not gzip */ }
  try { return brotliDecompressSync(buffer).toString("utf-8"); } catch { /* not brotli */ }
  try { return inflateSync(buffer).toString("utf-8"); } catch { /* not deflate */ }
  return buffer.toString("utf-8");
}

export async function agentproxyFetch(
  params: FetchParams,
  adapter: ProxyAdapter,
  credentials: ProxyCredentials
): Promise<string> {
  const { url, format = "markdown", timeout = 60 } = params;

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("URL must start with http:// or https://");
  }

  // Warn if targeting params are requested but the active adapter doesn't support them
  const unsupported: string[] = [];
  if (params.country    && !adapter.capabilities.country) unsupported.push(`country (not supported by ${adapter.displayName})`);
  if (params.city       && !adapter.capabilities.city)    unsupported.push(`city (not supported by ${adapter.displayName})`);
  if (params.session_id && !adapter.capabilities.sticky)  unsupported.push(`session_id/sticky (not supported by ${adapter.displayName})`);
  if (unsupported.length) {
    // Surface as a non-fatal note in the output rather than an error
    // so the fetch still proceeds — the params are simply ignored by buildProxyUrl
    console.error(`[proxy4agents] Warning: ${unsupported.join(", ")}. Switch to Novada for full targeting support.`);
  }

  const proxyUrl = adapter.buildProxyUrl(credentials, params);
  // HttpsProxyAgent for HTTPS targets (CONNECT tunnel + TLS); HttpProxyAgent for plain HTTP
  const httpsAgent = new HttpsProxyAgent(proxyUrl);
  const httpAgent  = new HttpProxyAgent(proxyUrl);

  // Capability warning text to prepend to successful response
  const capWarning = unsupported.length
    ? `⚠ Warning: ${unsupported.join(", ")}. These parameters were ignored.\n\n`
    : "";

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await axios.get(url, {
        httpsAgent,
        httpAgent,
        proxy: false,
        // arraybuffer + decompress:false = we handle decompression ourselves.
        // axios built-in decompress conflicts with https-proxy-agent CONNECT tunnel
        // on large pages (Amazon 1.6MB returned ECONNABORTED with decompress:true).
        responseType: "arraybuffer",
        decompress: false,
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
        },
        timeout: timeout * 1000,
        maxContentLength: 50 * 1024 * 1024,
        maxRedirects: 5,
      });

      const encoding    = response.headers["content-encoding"] as string | undefined;
      const contentType = response.headers["content-type"] as string | undefined;
      const body = decompress(Buffer.from(response.data as ArrayBuffer), encoding);

      const isHtml = contentType?.includes("text/html") || body.toLowerCase().includes("<html");
      const output = format === "markdown" && isHtml ? htmlToMarkdown(body) : body;

      const truncated   = output.length > 100_000;
      const finalOutput = truncated
        ? unicodeSafeTruncate(output, 100_000) + "\n\n[... truncated — page is large]"
        : output;

      const meta = [
        `URL: ${url}`,
        `Status: ${response.status}`,
        `Size: ${(body.length / 1024).toFixed(0)} KB`,
        params.country    ? `Country: ${params.country.toUpperCase()}` : "",
        params.session_id ? `Session: ${params.session_id}` : "",
        truncated         ? "Truncated: yes" : "",
      ]
        .filter(Boolean)
        .join(" | ");

      return `${capWarning}[${meta}]\n\n${finalOutput}`;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Surface rate-limit errors clearly
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        throw new Error("Rate limited (HTTP 429). Wait a moment before retrying. Consider using a session_id for consistent routing.");
      }
      // Only retry on network errors or 5xx — never retry 4xx (auth, not-found, etc.)
      const isRetryable = !(
        axios.isAxiosError(err) &&
        err.response &&
        err.response.status < 500
      );
      if (attempt < 2 && isRetryable) {
        // Exponential backoff: 500ms before retry
        await new Promise(r => setTimeout(r, 500 * attempt));
        continue;
      }
    }
  }

  throw lastError!;
}

export function validateFetchParams(raw: Record<string, unknown>): FetchParams {
  if (!raw.url || typeof raw.url !== "string") {
    throw new Error("url is required and must be a string");
  }
  if (!raw.url.startsWith("http://") && !raw.url.startsWith("https://")) {
    throw new Error("url must start with http:// or https://");
  }
  if (raw.country !== undefined) {
    if (typeof raw.country !== "string" || raw.country.length > 10 || !SAFE_COUNTRY.test(raw.country)) {
      throw new Error("country must be a 2-letter ISO code with no hyphens (e.g. US, DE, GB)");
    }
  }
  if (raw.city !== undefined) {
    if (typeof raw.city !== "string" || raw.city.length > 50 || !SAFE_CITY.test(raw.city)) {
      throw new Error("city must contain only letters, numbers, underscores, max 50 chars (e.g. newyork, london)");
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
  return {
    url: raw.url,
    country:    raw.country    as string | undefined,
    city:       raw.city       as string | undefined,
    session_id: raw.session_id as string | undefined,
    format:     (raw.format as "raw" | "markdown") || "markdown",
    timeout,
  };
}
