import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { gunzipSync, brotliDecompressSync, inflateSync } from "zlib";
import { PROXY_HOST, PROXY_PORT, DEFAULT_USER_AGENT } from "../config.js";

export interface FetchParams {
  url: string;
  country?: string;
  city?: string;
  session_id?: string;
  asn?: string;
  format?: "raw" | "markdown";
  timeout?: number;
}

function buildProxyAuth(apiKey: string, params: FetchParams): string {
  let suffix = "";
  if (params.country) suffix += `-country-${params.country.toUpperCase()}`;
  if (params.city) suffix += `-city-${params.city.toLowerCase()}`;
  if (params.session_id) suffix += `-session-${params.session_id}`;
  if (params.asn) suffix += `-asn-${params.asn}`;
  return `${apiKey}${suffix}`;
}

function decompress(buffer: Buffer, encoding: string | undefined): string {
  try {
    if (encoding === "gzip") return gunzipSync(buffer).toString("utf-8");
    if (encoding === "br") return brotliDecompressSync(buffer).toString("utf-8");
    if (encoding === "deflate") return inflateSync(buffer).toString("utf-8");
  } catch {
    // fallback: try gunzip anyway (some servers lie about encoding)
    try { return gunzipSync(buffer).toString("utf-8"); } catch { /* ignore */ }
  }
  return buffer.toString("utf-8");
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<h([1-6])[^>]*>/gi, (_, n) => "#".repeat(Number(n)) + " ")
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function agentproxyFetch(
  params: FetchParams,
  proxyApiKey: string
): Promise<string> {
  const { url, format = "markdown", timeout = 60 } = params;

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("URL must start with http:// or https://");
  }

  const proxyAuth = buildProxyAuth(proxyApiKey, params);
  const proxyUrl = `http://user:${proxyAuth}@${PROXY_HOST}:${PROXY_PORT}`;
  const agent = new HttpsProxyAgent(proxyUrl);

  const response = await axios.get(url, {
    httpsAgent: agent,
    httpAgent: agent,
    proxy: false,
    // arraybuffer + decompress:false = we handle decompression ourselves
    // This avoids axios/proxy-agent decompression conflicts on large pages
    responseType: "arraybuffer",
    decompress: false,
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
    },
    timeout: timeout * 1000,
    maxContentLength: 50 * 1024 * 1024, // 50MB cap
    maxRedirects: 5,
  });

  const encoding = response.headers["content-encoding"] as string | undefined;
  const contentType = response.headers["content-type"] as string | undefined;
  const body = decompress(Buffer.from(response.data as ArrayBuffer), encoding);

  const isHtml = contentType?.includes("text/html") || body.toLowerCase().includes("<html");
  const output = format === "markdown" && isHtml ? htmlToMarkdown(body) : body;

  // Truncate very large outputs to keep MCP responses sane (first 100KB)
  const truncated = output.length > 100_000;
  const finalOutput = truncated ? output.slice(0, 100_000) + "\n\n[... truncated — page is large]" : output;

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
}

export function validateFetchParams(raw: Record<string, unknown>): FetchParams {
  if (!raw.url || typeof raw.url !== "string") {
    throw new Error("url is required and must be a string");
  }
  if (raw.country && typeof raw.country !== "string") {
    throw new Error("country must be a 2-letter ISO code (e.g. US, DE, GB)");
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
    asn: raw.asn as string | undefined,
    format: (raw.format as "raw" | "markdown") || "markdown",
    timeout,
  };
}
