import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import { gunzipSync, brotliDecompressSync, inflateSync } from "zlib";
import { DEFAULT_USER_AGENT } from "../config.js";
import { htmlToMarkdown, unicodeSafeTruncate } from "../utils.js";
import { SAFE_COUNTRY, SAFE_CITY, SAFE_SESSION_ID, QUOTA_NOTE } from "../validation.js";
// ─── In-process response cache ───────────────────────────────────────────────
// Eliminates duplicate proxy credits when agents re-fetch the same URL.
// Keyed by (url + format + country). Session-pinned requests are NEVER cached
// (stickiness implies same-IP routing — caching would break that guarantee).
// TTL defaults to 300s. Set PROXY4AGENT_CACHE_TTL_SECONDS=0 to disable.
const DEFAULT_CACHE_TTL_SECONDS = 300;
const MAX_CACHE_ENTRIES = 200;
const _responseCache = new Map();
/** Returns the configured TTL in seconds. 0 = cache disabled. */
export function getCacheTtl() {
    const raw = Number(process.env.PROXY4AGENT_CACHE_TTL_SECONDS);
    return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_CACHE_TTL_SECONDS;
}
/** Cache key: url + format + country (country affects what you receive back). */
export function makeCacheKey(url, format, country) {
    return `${url}|${format}|${country ?? ""}`;
}
/** Remove all expired entries. */
function pruneExpired() {
    const now = Date.now();
    for (const [key, entry] of _responseCache) {
        if (entry.expires_at <= now)
            _responseCache.delete(key);
    }
}
/** Evict the oldest insertion when at capacity after pruning. */
function evictOldest() {
    const firstKey = (_responseCache.keys().next().value);
    if (firstKey !== undefined)
        _responseCache.delete(firstKey);
}
/** Clear the entire cache (useful for tests and manual cache invalidation). */
export function clearResponseCache() {
    _responseCache.clear();
}
function decompress(buffer, encoding) {
    // When the server declares an encoding, trust it — throw on failure so the retry loop fires
    if (encoding === "gzip")
        return gunzipSync(buffer).toString("utf-8");
    if (encoding === "br")
        return brotliDecompressSync(buffer).toString("utf-8");
    if (encoding === "deflate")
        return inflateSync(buffer).toString("utf-8");
    // No encoding header — check magic bytes before probing
    if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
        try {
            return gunzipSync(buffer).toString("utf-8");
        }
        catch { /* corrupted gzip */ }
    }
    // Brotli has no reliable magic bytes — skip probe
    // Deflate starts with various bytes (0x78 0x01/9C/DA common) but not reliable — skip probe
    return buffer.toString("utf-8");
}
export async function agentproxyFetch(params, adapter, credentials) {
    const { url, format = "markdown", timeout = 60 } = params;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        throw new Error("URL must start with http:// or https://");
    }
    // ── Cache lookup ────────────────────────────────────────────────────────────
    // Skip cache when session_id is set: sticky sessions imply same-IP routing,
    // so two agents with different session IDs would wrongly share cached content.
    const ttl = getCacheTtl();
    const cacheKey = !params.session_id && ttl > 0
        ? makeCacheKey(url, format, params.country)
        : null;
    if (cacheKey) {
        const hit = _responseCache.get(cacheKey);
        if (hit && hit.expires_at > Date.now()) {
            // LRU: refresh position in Map so this entry isn't evicted as "oldest"
            _responseCache.delete(cacheKey);
            _responseCache.set(cacheKey, hit);
            const serveStart = Date.now();
            const parsed = JSON.parse(hit.payload);
            parsed.meta.cache_hit = true;
            parsed.meta.cache_age_seconds = Math.floor((Date.now() - hit.cached_at) / 1000);
            parsed.meta.latency_ms = Date.now() - serveStart; // ~0ms — reflects cache serve time, not proxy latency
            return JSON.stringify(parsed);
        }
    }
    // Warn if targeting params are requested but the active adapter doesn't support them
    const unsupported = [];
    if (params.country && !adapter.capabilities.country)
        unsupported.push(`country (not supported by ${adapter.displayName})`);
    if (params.city && !adapter.capabilities.city)
        unsupported.push(`city (not supported by ${adapter.displayName})`);
    if (params.session_id && !adapter.capabilities.sticky)
        unsupported.push(`session_id/sticky (not supported by ${adapter.displayName})`);
    if (unsupported.length) {
        console.error(`[proxy4agents] Warning: ${unsupported.join(", ")}. Switch to Novada for full targeting support.`);
    }
    const proxyUrl = adapter.buildProxyUrl(credentials, params);
    // HttpsProxyAgent for HTTPS targets (CONNECT tunnel + TLS); HttpProxyAgent for plain HTTP
    const httpsAgent = new HttpsProxyAgent(proxyUrl);
    const httpAgent = new HttpProxyAgent(proxyUrl);
    let lastError = null;
    const startTime = Date.now();
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
            const latency_ms = Date.now() - startTime;
            const encoding = response.headers["content-encoding"];
            const contentType = response.headers["content-type"];
            const body = decompress(Buffer.from(response.data), encoding);
            const isHtml = contentType?.includes("text/html") || body.toLowerCase().includes("<html");
            // Pre-truncate before expensive markdown conversion to avoid 600MB of intermediate strings
            const bodyForConversion = body.length > 500_000 ? body.slice(0, 500_000) : body;
            const output = format === "markdown" && isHtml ? htmlToMarkdown(bodyForConversion) : body;
            const truncated = output.length > 100_000;
            const finalOutput = truncated
                ? unicodeSafeTruncate(output, 100_000) + "\n\n[... truncated — page is large]"
                : output;
            const result = {
                ok: true,
                tool: "agentproxy_fetch",
                data: {
                    url,
                    status_code: response.status,
                    content: finalOutput,
                    content_type: contentType || "unknown",
                    size_bytes: body.length,
                    warnings: unsupported.length ? unsupported.map(u => `Ignored param: ${u}`) : undefined,
                },
                meta: {
                    latency_ms,
                    country: params.country,
                    session_id: params.session_id,
                    truncated,
                    quota: { credits_estimated: 1, note: QUOTA_NOTE },
                    cache_hit: false,
                },
            };
            // Remove undefined fields from data
            if (!result.data.warnings)
                delete result.data.warnings;
            if (!result.meta.country)
                delete result.meta.country;
            if (!result.meta.session_id)
                delete result.meta.session_id;
            // ── Store in cache ──────────────────────────────────────────────────────
            if (cacheKey) {
                if (_responseCache.size >= MAX_CACHE_ENTRIES) {
                    pruneExpired();
                    if (_responseCache.size >= MAX_CACHE_ENTRIES)
                        evictOldest();
                }
                const now = Date.now();
                _responseCache.set(cacheKey, {
                    payload: JSON.stringify(result),
                    expires_at: now + ttl * 1000,
                    cached_at: now,
                });
            }
            return JSON.stringify(result);
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            // Surface rate-limit errors clearly
            if (axios.isAxiosError(err) && err.response?.status === 429) {
                throw new Error("Rate limited (HTTP 429). Wait a moment before retrying. Consider using a session_id for consistent routing.");
            }
            // Only retry on network errors or 5xx — never retry 4xx (auth, not-found, etc.)
            const isRetryable = !(axios.isAxiosError(err) &&
                err.response &&
                err.response.status < 500);
            if (attempt < 2 && isRetryable) {
                // Exponential backoff: 500ms before retry
                await new Promise(r => setTimeout(r, 500 * attempt));
                continue;
            }
        }
    }
    throw lastError;
}
export function validateFetchParams(raw) {
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
        country: raw.country,
        city: raw.city,
        session_id: raw.session_id,
        format: raw.format || "markdown",
        timeout,
    };
}
