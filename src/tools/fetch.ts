import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { gunzipSync, brotliDecompressSync, inflateSync } from "zlib";
import { PROXY_HOST, PROXY_PORT, DEFAULT_USER_AGENT } from "../config.js";
import { htmlToMarkdown, unicodeSafeTruncate } from "../utils.js";

// Allowed characters for proxy auth suffix params — prevent URL injection
const SAFE_PARAM = /^[a-zA-Z0-9_-]+$/;
// session_id disallows hyphens — Novada uses `-` as the username param delimiter,
// so a hyphenated session_id like "my-session" would produce ambiguous parsing
// in the username string (e.g. USERNAME-zone-res-session-my-session).
const SAFE_SESSION_ID = /^[a-zA-Z0-9_]+$/;

export interface FetchParams {
  url: string;
  country?: string;
  city?: string;
  session_id?: string;
  format?: "raw" | "markdown";
  timeout?: number;
}

/**
 * Build the Novada proxy username with targeting suffixes appended after zone-res.
 * Format: USERNAME-zone-res[-region-XX][-city-CITY][-session-ID]
 */
function buildProxyUsername(baseUser: string, params: FetchParams): string {
  let username = `${baseUser}-zone-res`;
  if (params.country) username += `-region-${params.country.toLowerCase()}`;
  if (params.city) username += `-city-${params.city.toLowerCase()}`;
  if (params.session_id) username += `-session-${params.session_id}`;
  return username;
}

function decompress(buffer: Buffer, encoding: string | undefined): string {
  // Primary: decompress according to the Content-Encoding header
  if (encoding === "gzip") {
    try { return gunzipSync(buffer).toString("utf-8"); } catch { /* fall through to raw */ }
  } else if (encoding === "br") {
    try { return brotliDecompressSync(buffer).toString("utf-8"); } catch { /* fall through */ }
  } else if (encoding === "deflate") {
    try { return inflateSync(buffer).toString("utf-8"); } catch { /* fall through */ }
  } else {
    // No encoding header or unknown — try gunzip as fallback
    // (some servers send gzip without declaring it)
    try { return gunzipSync(buffer).toString("utf-8"); } catch { /* not compressed */ }
  }
  // Raw bytes — return as UTF-8 (may be uncompressed or failed decompression)
  return buffer.toString("utf-8");
}

export async function agentproxyFetch(
  params: FetchParams,
  proxyUser: string,
  proxyPass: string
): Promise<string> {
  const { url, format = "markdown", timeout = 60 } = params;

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("URL must start with http:// or https://");
  }

  const username = buildProxyUsername(proxyUser, params);
  const proxyUrl = `http://${encodeURIComponent(username)}:${encodeURIComponent(proxyPass)}@${PROXY_HOST}:${PROXY_PORT}`;
  const agent = new HttpsProxyAgent(proxyUrl);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await axios.get(url, {
        httpsAgent: agent,
        httpAgent: agent,
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

      const encoding = response.headers["content-encoding"] as string | undefined;
      const contentType = response.headers["content-type"] as string | undefined;
      const body = decompress(Buffer.from(response.data as ArrayBuffer), encoding);

      const isHtml = contentType?.includes("text/html") || body.toLowerCase().includes("<html");
      const output = format === "markdown" && isHtml ? htmlToMarkdown(body) : body;

      const truncated = output.length > 100_000;
      const finalOutput = truncated
        ? unicodeSafeTruncate(output, 100_000) + "\n\n[... truncated — page is large]"
        : output;

      const meta = [
        `URL: ${url}`,
        `Status: ${response.status}`,
        `Size: ${(body.length / 1024).toFixed(0)} KB`,
        params.country ? `Country: ${params.country.toUpperCase()}` : "",
        params.session_id ? `Session: ${params.session_id}` : "",
        truncated ? "Truncated: yes" : "",
      ]
        .filter(Boolean)
        .join(" | ");

      return `[${meta}]\n\n${finalOutput}`;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only retry on network errors or 5xx — never retry 4xx (auth, not-found, etc.)
      const isRetryable = !(
        axios.isAxiosError(err) &&
        err.response &&
        err.response.status < 500
      );
      if (attempt < 2 && isRetryable) continue;
    }
  }

  throw lastError!;
}

export function validateFetchParams(raw: Record<string, unknown>): FetchParams {
  if (!raw.url || typeof raw.url !== "string") {
    throw new Error("url is required and must be a string");
  }
  if (raw.country !== undefined) {
    if (typeof raw.country !== "string" || !SAFE_PARAM.test(raw.country)) {
      throw new Error("country must be a 2-letter ISO code (e.g. US, DE, GB)");
    }
  }
  if (raw.city !== undefined) {
    if (typeof raw.city !== "string" || !SAFE_PARAM.test(raw.city)) {
      throw new Error("city must contain only letters, numbers, hyphens, underscores");
    }
  }
  if (raw.session_id !== undefined) {
    if (typeof raw.session_id !== "string" || !SAFE_SESSION_ID.test(raw.session_id)) {
      throw new Error("session_id must contain only letters, numbers, and underscores (no hyphens)");
    }
  }
  if (raw.format && raw.format !== "raw" && raw.format !== "markdown") {
    throw new Error("format must be 'raw' or 'markdown'");
  }
  const timeout = raw.timeout ? Number(raw.timeout) : 60;
  if (timeout < 1 || timeout > 120) {
    throw new Error("timeout must be between 1 and 120 seconds");
  }
  return {
    url: raw.url,
    country: raw.country as string | undefined,
    city: raw.city as string | undefined,
    session_id: raw.session_id as string | undefined,
    format: (raw.format as "raw" | "markdown") || "markdown",
    timeout,
  };
}
