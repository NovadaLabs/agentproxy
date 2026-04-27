import { agentproxyFetch } from "./fetch.js";
import { agentproxyRender } from "./render.js";
import { decodeHtmlEntities } from "../utils.js";
import { SAFE_COUNTRY, SAFE_CITY, SAFE_SESSION_ID } from "../validation.js";
/**
 * Extract structured data from a URL using pattern matching on the fetched HTML.
 *
 * Strategy: fetch the raw HTML, then use regex + heuristic extraction for each
 * requested field. This is a lightweight alternative to LLM-based extraction —
 * fast, deterministic, and zero additional API cost.
 *
 * For more complex extraction needs, agents can use agentproxy_fetch(format="raw")
 * and do their own parsing.
 */
// Error messages that indicate the proxy fetch failed hard and render may succeed
const RENDER_ESCALATION_PATTERNS = [
    "TLS", "SSL", "socket disconnect", "secure TLS",
    "ECONNRESET", "ECONNREFUSED",
    "403", "blocked", "bot detection",
];
export function shouldEscalateToRender(msg) {
    return RENDER_ESCALATION_PATTERNS.some(p => msg.toLowerCase().includes(p.toLowerCase()));
}
export async function agentproxyExtract(params, adapter, credentials, browserWsEndpoint) {
    const { url, fields, country, city, session_id, timeout = 60, render_fallback = false } = params;
    const startTime = Date.now();
    let html = "";
    let usedRender = false;
    let fetchWarning;
    // Attempt 1: proxy fetch (fast, cheap)
    try {
        const fetchParams = { url, format: "raw", country, city, session_id, timeout };
        const fetchResultStr = await agentproxyFetch(fetchParams, adapter, credentials);
        const fetchResult = JSON.parse(fetchResultStr);
        html = fetchResult.data.content || "";
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Auto-escalate to render if enabled and the error suggests a JS/TLS block
        if (render_fallback && browserWsEndpoint && shouldEscalateToRender(msg)) {
            try {
                const renderResultStr = await agentproxyRender({ url, format: "html", timeout }, browserWsEndpoint);
                const renderResult = JSON.parse(renderResultStr);
                html = renderResult.data.content || "";
                usedRender = true;
                fetchWarning = `Proxy fetch failed (${msg.slice(0, 80)}...) — escalated to render automatically`;
            }
            catch (renderErr) {
                // Both failed — re-throw the original fetch error
                throw err;
            }
        }
        else {
            throw err;
        }
    }
    const latency_ms = Date.now() - startTime;
    // Extract each requested field using pattern-based heuristics
    const extractedFields = {};
    for (const field of fields) {
        extractedFields[field] = extractField(html, field);
    }
    const result = {
        ok: true,
        tool: "agentproxy_extract",
        data: {
            url,
            fields: extractedFields,
            ...(fetchWarning ? { fetch_warning: fetchWarning } : {}),
            ...(usedRender ? { extracted_via: "render" } : { extracted_via: "proxy_fetch" }),
        },
        meta: {
            latency_ms,
            country,
            session_id,
            // render costs 5 credits when used as fallback, else 1
            quota: {
                credits_estimated: usedRender ? 5 : 1,
                note: "Check dashboard.novada.com for real-time balance",
            },
        },
    };
    if (!result.meta.country)
        delete result.meta.country;
    if (!result.meta.session_id)
        delete result.meta.session_id;
    return JSON.stringify(result);
}
/**
 * Heuristic field extraction from HTML.
 *
 * Uses common patterns: meta tags, Open Graph, Schema.org JSON-LD, headings,
 * and semantic HTML. Falls back to regex scanning for common field names.
 */
export function extractField(html, field) {
    const f = field.toLowerCase().trim();
    // --- Title ---
    if (f === "title" || f === "name" || f === "product_name") {
        return (extractMetaContent(html, "og:title") ??
            extractJsonLd(html, "name") ??
            extractTag(html, "title") ??
            extractTag(html, "h1") ??
            null);
    }
    // --- Price ---
    if (f === "price" || f === "cost") {
        return (extractJsonLd(html, "price") ??
            extractJsonLd(html, "lowPrice") ??
            extractMetaContent(html, "product:price:amount") ??
            extractPriceFromHtml(html) ??
            null);
    }
    // --- Currency ---
    if (f === "currency") {
        return (extractJsonLd(html, "priceCurrency") ??
            extractMetaContent(html, "product:price:currency") ??
            null);
    }
    // --- Description ---
    if (f === "description" || f === "summary") {
        return (extractMetaContent(html, "og:description") ??
            extractMetaContent(html, "description") ??
            extractJsonLd(html, "description") ??
            null);
    }
    // --- Image ---
    if (f === "image" || f === "thumbnail" || f === "photo") {
        return (extractMetaContent(html, "og:image") ??
            extractJsonLd(html, "image") ??
            null);
    }
    // --- Rating / Reviews ---
    if (f === "rating" || f === "score") {
        return (extractJsonLd(html, "ratingValue") ??
            null);
    }
    if (f === "review_count" || f === "reviews" || f === "rating_count") {
        return (extractJsonLd(html, "reviewCount") ??
            extractJsonLd(html, "ratingCount") ??
            null);
    }
    // --- Author ---
    if (f === "author" || f === "creator") {
        return (extractJsonLd(html, "author") ??
            extractMetaContent(html, "author") ??
            extractMetaContent(html, "article:author") ??
            null);
    }
    // --- Date ---
    if (f === "date" || f === "published" || f === "publish_date") {
        return (extractJsonLd(html, "datePublished") ??
            extractMetaContent(html, "article:published_time") ??
            extractMetaContent(html, "date") ??
            null);
    }
    // --- URL / Canonical ---
    if (f === "url" || f === "canonical") {
        return (extractMetaContent(html, "og:url") ??
            extractCanonical(html) ??
            null);
    }
    // --- Links (returns array) ---
    if (f === "links" || f === "urls") {
        return extractAllLinks(html);
    }
    // --- Headings (returns array) ---
    if (f === "headings" || f === "h1" || f === "h2") {
        const tag = f === "h2" ? "h2" : "h1";
        return extractAllTags(html, tag);
    }
    // --- Generic fallback: try JSON-LD, then meta ---
    return (extractJsonLd(html, field) ??
        extractMetaContent(html, field) ??
        null);
}
// --- Extraction helpers ---
function extractMetaContent(html, name) {
    // Match both name= and property= attributes
    const patterns = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${escapeRegex(name)}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapeRegex(name)}["']`, "i"),
    ];
    for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1])
            return decodeHtmlEntities(m[1]);
    }
    return null;
}
function extractJsonLd(html, key) {
    const ldBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (!ldBlocks)
        return null;
    for (const block of ldBlocks) {
        const jsonMatch = block.match(/>([^<]+)</s);
        if (!jsonMatch?.[1])
            continue;
        try {
            const data = JSON.parse(jsonMatch[1]);
            const value = deepFind(data, key);
            if (value !== undefined) {
                return typeof value === "object" ? JSON.stringify(value) : String(value);
            }
        }
        catch {
            // malformed JSON-LD — skip
        }
    }
    return null;
}
function extractTag(html, tag) {
    const re = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i");
    const m = html.match(re);
    return m?.[1] ? decodeHtmlEntities(m[1]).trim() : null;
}
function extractAllTags(html, tag) {
    const re = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "gi");
    const results = [];
    let m;
    while ((m = re.exec(html)) !== null) {
        if (m[1])
            results.push(decodeHtmlEntities(m[1]).trim());
    }
    return results.length ? results : [];
}
function extractAllLinks(html) {
    const re = /<a[^>]+href=["']([^"']+)["']/gi;
    const results = [];
    let m;
    while ((m = re.exec(html)) !== null) {
        const href = m[1];
        if (href && href.startsWith("http") && !results.includes(href)) {
            results.push(href);
        }
    }
    return results.slice(0, 50); // cap at 50 links
}
function extractCanonical(html) {
    const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
    return m?.[1] ?? null;
}
function extractPriceFromHtml(html) {
    // Common price patterns: $29.99, €19,99, ¥1,999
    const priceRe = /(?:class=["'][^"']*price[^"']*["'][^>]*>)\s*[^<]*?([$€£¥]\s*[\d,.]+)/i;
    const m = html.match(priceRe);
    if (m?.[1])
        return m[1].trim();
    // Fallback: any currency pattern in the page
    const genericPriceRe = /([$€£¥]\s*\d[\d,.]*)/;
    const gm = html.match(genericPriceRe);
    return gm?.[1]?.trim() ?? null;
}
export function deepFind(obj, key, depth = 0) {
    if (depth > 20)
        return undefined;
    if (obj === null || obj === undefined)
        return undefined;
    if (typeof obj !== "object")
        return undefined;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = deepFind(item, key, depth + 1);
            if (found !== undefined)
                return found;
        }
        return undefined;
    }
    const record = obj;
    if (key in record)
        return record[key];
    for (const v of Object.values(record)) {
        const found = deepFind(v, key, depth + 1);
        if (found !== undefined)
            return found;
    }
    return undefined;
}
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// --- Validation ---
export function validateExtractParams(raw) {
    if (!raw.url || typeof raw.url !== "string") {
        throw new Error("url is required and must be a string");
    }
    if (!raw.url.startsWith("http://") && !raw.url.startsWith("https://")) {
        throw new Error("url must start with http:// or https://");
    }
    if (!raw.fields || !Array.isArray(raw.fields) || raw.fields.length === 0) {
        throw new Error("fields is required — provide an array of field names to extract (e.g. [\"title\", \"price\", \"description\"])");
    }
    if (raw.fields.length > 20) {
        throw new Error("fields must contain at most 20 field names");
    }
    for (const f of raw.fields) {
        if (typeof f !== "string" || f.length > 50) {
            throw new Error("each field must be a string of 50 characters or less");
        }
    }
    if (raw.country !== undefined) {
        if (typeof raw.country !== "string" || raw.country.length > 10 || !SAFE_COUNTRY.test(raw.country)) {
            throw new Error("country must be a 2-letter ISO code with no hyphens (e.g. US, DE, GB)");
        }
    }
    if (raw.city !== undefined) {
        if (typeof raw.city !== "string" || raw.city.length > 50 || !SAFE_CITY.test(raw.city)) {
            throw new Error("city must contain only letters, numbers, underscores, max 50 chars");
        }
    }
    if (raw.session_id !== undefined) {
        if (typeof raw.session_id !== "string" || raw.session_id.length > 64 || !SAFE_SESSION_ID.test(raw.session_id)) {
            throw new Error("session_id must contain only letters, numbers, and underscores, max 64 chars (no hyphens)");
        }
    }
    const timeout = raw.timeout !== undefined ? Number(raw.timeout) : 60;
    if (!Number.isFinite(timeout) || timeout < 1 || timeout > 120) {
        throw new Error("timeout must be between 1 and 120 seconds");
    }
    return {
        url: raw.url,
        fields: raw.fields,
        country: raw.country,
        city: raw.city,
        session_id: raw.session_id,
        timeout,
        render_fallback: raw.render_fallback === true,
    };
}
