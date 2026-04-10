import { agentproxyFetch } from "./fetch.js";
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
export async function agentproxyExtract(params, adapter, credentials) {
    const { url, fields, country, city, session_id, timeout = 60 } = params;
    // Fetch raw HTML — we need the full DOM for extraction
    const fetchParams = {
        url,
        format: "raw",
        country,
        city,
        session_id,
        timeout,
    };
    const rawResult = await agentproxyFetch(fetchParams, adapter, credentials);
    // rawResult format: "[meta]\n\nHTML_CONTENT"
    // Split off the metadata line to get pure HTML
    const htmlStart = rawResult.indexOf("\n\n");
    const html = htmlStart >= 0 ? rawResult.slice(htmlStart + 2) : rawResult;
    const metaLine = htmlStart >= 0 ? rawResult.slice(0, htmlStart) : "";
    // Extract each requested field using pattern-based heuristics
    const extracted = {};
    for (const field of fields) {
        extracted[field] = extractField(html, field);
    }
    // Format output as structured text (agent-friendly)
    const lines = [
        metaLine,
        `Extracted ${fields.length} fields from: ${url}`,
        "",
    ];
    for (const [key, value] of Object.entries(extracted)) {
        if (Array.isArray(value)) {
            lines.push(`${key}:`);
            for (const item of value) {
                lines.push(`  - ${item}`);
            }
        }
        else {
            lines.push(`${key}: ${value ?? "(not found)"}`);
        }
    }
    return lines.join("\n");
}
/**
 * Heuristic field extraction from HTML.
 *
 * Uses common patterns: meta tags, Open Graph, Schema.org JSON-LD, headings,
 * and semantic HTML. Falls back to regex scanning for common field names.
 */
function extractField(html, field) {
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
            return decodeEntities(m[1]);
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
    return m?.[1] ? decodeEntities(m[1]).trim() : null;
}
function extractAllTags(html, tag) {
    const re = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "gi");
    const results = [];
    let m;
    while ((m = re.exec(html)) !== null) {
        if (m[1])
            results.push(decodeEntities(m[1]).trim());
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
function deepFind(obj, key) {
    if (obj === null || obj === undefined)
        return undefined;
    if (typeof obj !== "object")
        return undefined;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = deepFind(item, key);
            if (found !== undefined)
                return found;
        }
        return undefined;
    }
    const record = obj;
    if (key in record)
        return record[key];
    for (const v of Object.values(record)) {
        const found = deepFind(v, key);
        if (found !== undefined)
            return found;
    }
    return undefined;
}
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function decodeEntities(s) {
    return s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
}
// --- Validation ---
const SAFE_COUNTRY = /^[a-zA-Z0-9_]+$/;
const SAFE_CITY = /^[a-zA-Z0-9_]+$/;
const SAFE_SESSION_ID = /^[a-zA-Z0-9_]+$/;
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
    };
}
