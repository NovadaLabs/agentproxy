#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { agentproxyFetch, validateFetchParams, agentproxyBatchFetch, validateBatchFetchParams, agentproxySearch, validateSearchParams, agentproxySession, validateSessionParams, agentproxyRender, validateRenderParams, agentproxyExtract, validateExtractParams, agentproxyMap, validateMapParams, agentproxyStatus, } from "./tools/index.js";
import { resolveAdapter, listAdapters } from "./adapters/index.js";
import { VERSION, NPM_PACKAGE } from "./config.js";
// ─── Provider Resolution ─────────────────────────────────────────────────────
//
// Reads env vars once at startup. Novada wins if multiple providers are set.
// proxyContext is null if no proxy provider is configured.
const proxyContext = resolveAdapter(process.env);
// ─── Other credentials (not provider-routing) ─────────────────────────────────
const NOVADA_API_KEY = process.env.NOVADA_API_KEY;
const NOVADA_BROWSER_WS = process.env.NOVADA_BROWSER_WS;
// ─── Render concurrency limiter ─────────────────────────────────────────────
// Prevents runaway Browser API costs from concurrent render calls.
// Default max 3 — override with PROXY4AGENT_MAX_RENDERS env var.
const MAX_CONCURRENT_RENDERS = (() => {
    const raw = Number(process.env.PROXY4AGENT_MAX_RENDERS);
    return Number.isInteger(raw) && raw > 0 && raw <= 20 ? raw : 3;
})();
let activeRenders = 0;
// ─── Error Classification ─────────────────────────────────────────────────────
export function classifyError(err) {
    const ax = axios.isAxiosError(err);
    const status = ax ? err.response?.status : undefined;
    const msg = err instanceof Error ? err.message : String(err);
    if (ax && status === 429)
        return { ok: false, error: {
                code: "RATE_LIMITED", message: "HTTP 429 — rate limited",
                recoverable: true,
                agent_instruction: "Wait 5 seconds and retry. Consider reducing request frequency.",
                retry_after_seconds: 5
            } };
    if (ax && status === 404)
        return { ok: false, error: {
                code: "PAGE_NOT_FOUND",
                message: "HTTP 404 — page not found",
                recoverable: false,
                agent_instruction: "The page does not exist at this URL. Verify the URL is correct. Do not retry."
            } };
    if (ax && status && status >= 400 && status < 500)
        return { ok: false, error: {
                code: "BOT_DETECTION_SUSPECTED",
                message: `HTTP ${status} — request blocked by target`,
                recoverable: true,
                agent_instruction: "Try agentproxy_render (real browser). Or retry with a different country/session_id."
            } };
    if (msg.includes("timeout") || msg.includes("ECONNABORTED"))
        return { ok: false, error: {
                code: "TIMEOUT", message: "Request timed out",
                recoverable: true,
                agent_instruction: "Increase the timeout parameter or retry. For JS-heavy pages, use agentproxy_render.",
                retry_after_seconds: 2
            } };
    // DNS failure — hostname not found. Check BEFORE TLS patterns (some proxies wrap DNS errors in SSL messages).
    if (msg.includes("ENOTFOUND") || msg.includes("EAI_AGAIN") || msg.includes("getaddrinfo"))
        return { ok: false, error: {
                code: "NETWORK_ERROR", message: "DNS resolution failed — hostname not found",
                recoverable: false,
                agent_instruction: "The hostname could not be resolved. Verify the URL is correct and the domain exists.",
            } };
    if (msg.includes("TLS") || msg.includes("SSL") || msg.includes("socket disconnect") || msg.includes("secure TLS") || msg.includes("certificate") || msg.includes("issuer cert"))
        return { ok: false, error: {
                code: "TLS_ERROR", message: "TLS/SSL connection failed",
                recoverable: true,
                agent_instruction: "The target rejected the proxy connection. Retry with a different country parameter or use agentproxy_render.",
                retry_after_seconds: 2
            } };
    if (msg.includes("No proxy provider") || msg.includes("not configured"))
        return { ok: false, error: {
                code: "PROVIDER_NOT_CONFIGURED", message: msg,
                recoverable: false,
                agent_instruction: "Set NOVADA_PROXY_USER and NOVADA_PROXY_PASS env vars and restart the MCP server."
            } };
    // Input validation errors — these come from validateXxxParams before any network call
    const INPUT_ERROR_PHRASES = ["is required", "must be", "must start with", "must contain", "letters, numbers", "max 64", "max 50", "between 1 and"];
    if (INPUT_ERROR_PHRASES.some(p => msg.includes(p)))
        return { ok: false, error: {
                code: "INVALID_INPUT", message: msg,
                recoverable: false,
                agent_instruction: "Fix the input parameters and retry. Check the tool's inputSchema for valid values."
            } };
    return { ok: false, error: {
            code: "UNKNOWN_ERROR", message: msg,
            recoverable: true,
            agent_instruction: "Retry the request. Check agentproxy_status for network health."
        } };
}
// ─── Tool Definitions ────────────────────────────────────────────────────────
const TOOLS = [
    {
        name: "agentproxy_fetch",
        description: "Fetch any URL through residential proxy (2M+ IPs, 195 countries, anti-bot bypass). Returns structured JSON with ok, data.content, data.status_code, meta.latency_ms, and meta.cache_hit.\n\nWHEN TO USE: Static/HTML pages, Amazon, LinkedIn, news sites, most commercial sites.\nUSE agentproxy_render INSTEAD IF: Page requires JavaScript to load (SPAs, React/Vue apps, dynamic feeds).\nUSE agentproxy_extract INSTEAD IF: You need structured fields (title, price, rating) not raw content.\nON FAILURE: If error.code is BOT_DETECTION_SUSPECTED → retry with agentproxy_render. If TLS_ERROR → retry with a different country parameter.\nCACHING: Repeated calls to the same URL+format+country are served from in-process cache (default TTL 300s). meta.cache_hit=true means no proxy credit was used. Sessions with session_id are never cached.",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string", description: "The URL to fetch" },
                country: { type: "string", description: "2-letter country code: US, DE, JP, GB, BR, ... (195+ options)" },
                city: { type: "string", description: "City-level targeting: newyork, london, tokyo, ..." },
                session_id: { type: "string", description: "Use the same ID across calls to stay on the same IP (letters, numbers, underscores only — no hyphens)" },
                format: { type: "string", enum: ["markdown", "raw"], default: "markdown", description: "markdown strips HTML tags; raw returns full HTML" },
                timeout: { type: "number", default: 60, description: "Timeout in seconds (1-120)" },
            },
            required: ["url"],
        },
    },
    {
        name: "agentproxy_batch_fetch",
        description: "Fetch multiple URLs concurrently through residential proxy. Returns structured JSON with per-URL results including ok/error status. Up to 20 URLs, up to 5 concurrent.\n\nWHEN TO USE: Scraping lists of URLs from search results, product catalogs, competitor pages.\nUSE agentproxy_fetch INSTEAD FOR: Single URLs — lower overhead.\nON FAILURE: Individual URL failures are captured in results[].error — the batch itself succeeds even if some URLs fail.",
        inputSchema: {
            type: "object",
            properties: {
                urls: { type: "array", items: { type: "string" }, description: "2-20 URLs to fetch, each must start with http(s)://" },
                country: { type: "string", description: "2-letter country code for all requests (e.g. US, DE, JP)" },
                session_id: { type: "string", description: "Sticky session ID — reuse same IP for all URLs in the batch (letters, numbers, underscores only)" },
                format: { type: "string", enum: ["markdown", "raw"], default: "markdown", description: "markdown strips HTML; raw returns full HTML" },
                timeout: { type: "number", default: 60, description: "Per-URL timeout in seconds (1-120)" },
                concurrency: { type: "number", default: 3, minimum: 1, maximum: 5, description: "Max concurrent fetches (1-5, default 3)" },
            },
            required: ["urls"],
        },
    },
    {
        name: "agentproxy_render",
        description: "[BETA] Render a JavaScript-heavy page using real Chromium (Novada Browser API). Returns structured JSON with ok, data.content. Requires NOVADA_BROWSER_WS env var.\n\nWHEN TO USE: SPAs, React/Vue apps, infinite scroll, pages that require JS to load content.\nUSE agentproxy_fetch INSTEAD FOR: Static HTML pages — it is 3-5x faster.\nON FAILURE: If error.code is TIMEOUT → increase timeout. If PROVIDER_NOT_CONFIGURED → set NOVADA_BROWSER_WS.",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string", description: "The URL to render" },
                format: { type: "string", enum: ["markdown", "html", "text"], default: "markdown", description: "markdown strips tags; html returns full HTML; text strips tags + links" },
                wait_for: { type: "string", description: "CSS selector to wait for before extracting (e.g. '.product-title')" },
                timeout: { type: "number", default: 60, description: "Timeout in seconds (5-120)" },
            },
            required: ["url"],
        },
    },
    {
        name: "agentproxy_search",
        description: "Structured web search via Google (Novada). Returns JSON with ok, data.results as array of {title, url, snippet}. No HTML parsing needed — results are pre-structured.\n\nWHEN TO USE: Finding pages by topic, factual queries, discovering URLs to then fetch.\nUSE agentproxy_fetch INSTEAD FOR: Reading a specific URL you already have.\nON FAILURE: If error.code is PROVIDER_NOT_CONFIGURED → set NOVADA_API_KEY.",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string", description: "The search query" },
                engine: { type: "string", enum: ["google"], default: "google", description: "Search engine — currently only 'google' is supported. More engines planned." },
                num: { type: "number", default: 10, minimum: 1, maximum: 20, description: "Number of results (1-20)" },
                country: { type: "string", description: "Country for localized results (e.g. us, uk, de)" },
                language: { type: "string", description: "Language code (e.g. en, zh, de)" },
            },
            required: ["query"],
        },
    },
    {
        name: "agentproxy_extract",
        description: "Extract structured fields (title, price, rating, author, etc.) from any URL via residential proxy. Returns JSON with ok, data.fields as key-value map. Uses Open Graph, JSON-LD, and HTML heuristics.\n\nWHEN TO USE: Product pages, articles, listings where you need specific fields not raw content.\nUSE agentproxy_fetch INSTEAD IF: You need full page content, not specific fields.\nAUTO-ESCALATION: Set render_fallback:true to automatically retry via real browser (agentproxy_render) if the proxy fetch fails with TLS_ERROR or bot detection. Costs 5 credits if escalated.\nON FAILURE without render_fallback: If TLS_ERROR or BOT_DETECTION_SUSPECTED → retry with render_fallback:true.",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string", description: "The URL to extract data from" },
                fields: { type: "array", items: { type: "string" }, description: "Field names to extract: title, price, currency, description, image, rating, review_count, author, date, url, links, headings, h2, or any JSON-LD/meta field name" },
                country: { type: "string", description: "2-letter country code for geo-targeting (e.g. US, DE, JP)" },
                city: { type: "string", description: "City-level targeting (e.g. newyork, london, tokyo)" },
                session_id: { type: "string", description: "Reuse same ID to keep the same IP across calls" },
                timeout: { type: "number", default: 60, description: "Timeout in seconds (1-120)" },
                render_fallback: { type: "boolean", default: false, description: "Auto-retry via real browser (agentproxy_render) if proxy fetch fails with TLS or bot-detection error. Requires NOVADA_BROWSER_WS. Costs 5 credits if triggered." },
            },
            required: ["url", "fields"],
        },
    },
    {
        name: "agentproxy_session",
        description: "Specialized wrapper around agentproxy_fetch with session verification. For basic sticky routing without verification, use agentproxy_fetch with a session_id parameter instead.\n\nFetch a URL with a sticky session — same residential IP reused across calls with the same session_id. Returns structured JSON. Use verify_sticky:true to confirm the session held.\n\nWHEN TO USE: Multi-step workflows where IP consistency matters: login flows, paginated scraping, price monitoring.\nNOTE: Sticky sessions are best-effort — infrastructure may not guarantee 100% IP consistency. Use verify_sticky:true to confirm.\nNOTE: verify_sticky:true makes 3 sequential proxy calls and adds ~15-25 seconds. Only use it when you need to confirm IP consistency before a multi-step workflow.\nON FAILURE: If SESSION_STICKINESS_FAILED → regenerate session_id or accept best-effort behavior.",
        inputSchema: {
            type: "object",
            properties: {
                session_id: { type: "string", description: "Unique session ID — reuse the same value to keep the same IP (letters, numbers, underscores only — no hyphens)" },
                url: { type: "string", description: "The URL to fetch" },
                country: { type: "string", description: "2-letter country code" },
                city: { type: "string", description: "City-level targeting (e.g. newyork, london, tokyo)" },
                format: { type: "string", enum: ["markdown", "raw"], default: "markdown" },
                timeout: { type: "number", default: 60, description: "Timeout in seconds (1-120)" },
                verify_sticky: { type: "boolean", default: false, description: "Make a second httpbin.org/ip call with same session to verify IP consistency" },
            },
            required: ["session_id", "url"],
        },
    },
    {
        name: "agentproxy_map",
        description: "Crawl a URL and return all internal links found on the page. Returns structured JSON with data.internal_urls array. Useful for discovering pages before batch-fetching them.\n\nWHEN TO USE: Before a batch scraping job — call agentproxy_map first to discover URLs, then agentproxy_batch_fetch to scrape them.\nUSE agentproxy_fetch INSTEAD IF: You only need the content of a single specific URL.\nNOTE: This is a shallow map (single page). For deep crawls, call agentproxy_map iteratively on discovered URLs.",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string", description: "The URL to crawl (domain root recommended for broadest coverage)" },
                limit: { type: "number", default: 50, description: "Max internal URLs to return (10-200)" },
                include_external: { type: "boolean", default: false, description: "Include off-domain links in the response" },
                country: { type: "string", description: "2-letter country code for geo-targeting" },
                timeout: { type: "number", default: 60, description: "Timeout in seconds (1-120)" },
            },
            required: ["url"],
        },
    },
    {
        name: "agentproxy_status",
        description: "Check proxy connectivity and provider health. Returns structured JSON with ok, data.connectivity.status (HEALTHY/DEGRADED/UNAVAILABLE) and data.connectivity.proxy_ip (verified via live proxy call).\n\nWHEN TO USE: Before starting a large scraping workflow, or to diagnose proxy failures.\nNOTE: Live connectivity check — makes one proxy request to httpbin.org/ip on every call.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
];
// ─── MCP Server ──────────────────────────────────────────────────────────────
class Proxy4AgentsServer {
    server;
    constructor() {
        this.server = new Server({ name: "proxy4agents-mcp", version: VERSION }, { capabilities: { tools: {}, prompts: {}, resources: {} } });
        this.setupHandlers();
        this.registerPrompts();
        this.registerResources();
    }
    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: TOOLS,
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const raw = (args || {});
            try {
                let result;
                switch (name) {
                    case "agentproxy_fetch": {
                        if (!proxyContext)
                            return this.missingProxyError();
                        result = await agentproxyFetch(validateFetchParams(raw), proxyContext.adapter, proxyContext.credentials);
                        break;
                    }
                    case "agentproxy_batch_fetch": {
                        if (!proxyContext)
                            return this.missingProxyError();
                        result = await agentproxyBatchFetch(validateBatchFetchParams(raw), proxyContext.adapter, proxyContext.credentials);
                        break;
                    }
                    case "agentproxy_render": {
                        if (!NOVADA_BROWSER_WS)
                            return this.missingBrowserWsError();
                        if (activeRenders >= MAX_CONCURRENT_RENDERS) {
                            const errResp = {
                                ok: false,
                                error: {
                                    code: "RATE_LIMITED",
                                    message: `Too many concurrent renders (limit: ${MAX_CONCURRENT_RENDERS})`,
                                    recoverable: true,
                                    agent_instruction: `Wait for an active render to finish before starting another. Override limit with PROXY4AGENT_MAX_RENDERS env var.`,
                                },
                            };
                            return {
                                content: [{ type: "text", text: JSON.stringify(errResp, null, 2) }],
                                isError: true,
                            };
                        }
                        activeRenders++;
                        try {
                            result = await agentproxyRender(validateRenderParams(raw), NOVADA_BROWSER_WS);
                        }
                        finally {
                            activeRenders--;
                        }
                        break;
                    }
                    case "agentproxy_search": {
                        if (!NOVADA_API_KEY)
                            return this.missingApiKeyError();
                        result = await agentproxySearch(validateSearchParams(raw), NOVADA_API_KEY);
                        break;
                    }
                    case "agentproxy_extract": {
                        if (!proxyContext)
                            return this.missingProxyError();
                        result = await agentproxyExtract(validateExtractParams(raw), proxyContext.adapter, proxyContext.credentials, NOVADA_BROWSER_WS // passed for render_fallback escalation
                        );
                        break;
                    }
                    case "agentproxy_session": {
                        if (!proxyContext)
                            return this.missingProxyError();
                        result = await agentproxySession(validateSessionParams(raw), proxyContext.adapter, proxyContext.credentials);
                        break;
                    }
                    case "agentproxy_map": {
                        if (!proxyContext)
                            return this.missingProxyError();
                        result = await agentproxyMap(validateMapParams(raw), proxyContext.adapter, proxyContext.credentials);
                        break;
                    }
                    case "agentproxy_status": {
                        result = await agentproxyStatus(proxyContext?.adapter, proxyContext?.credentials);
                        break;
                    }
                    default:
                        return {
                            content: [{
                                    type: "text",
                                    text: `Unknown tool: ${name}. Available: ${TOOLS.map(t => t.name).join(", ")}`,
                                }],
                            isError: true,
                        };
                }
                return { content: [{ type: "text", text: result }] };
            }
            catch (error) {
                const errResponse = classifyError(error);
                // Systematic credential redaction — adapter knows which fields are sensitive
                let message = errResponse.error.message;
                if (proxyContext) {
                    for (const field of proxyContext.adapter.sensitiveFields) {
                        const val = proxyContext.credentials[field];
                        if (val) {
                            message = message.replaceAll(val, "***");
                            message = message.replaceAll(encodeURIComponent(val), "***");
                        }
                    }
                    // Also redact the raw username (not in sensitiveFields but may appear in proxy error URLs)
                    const user = proxyContext.credentials["user"];
                    if (user) {
                        message = message.replaceAll(user, "***");
                        message = message.replaceAll(encodeURIComponent(user), "***");
                    }
                }
                if (NOVADA_API_KEY) {
                    message = message.replaceAll(NOVADA_API_KEY, "***");
                    message = message.replaceAll(encodeURIComponent(NOVADA_API_KEY), "***");
                }
                if (NOVADA_BROWSER_WS) {
                    message = message.replaceAll(NOVADA_BROWSER_WS, "***");
                    message = message.replaceAll(encodeURIComponent(NOVADA_BROWSER_WS), "***");
                }
                errResponse.error.message = message;
                return {
                    content: [{ type: "text", text: JSON.stringify(errResponse, null, 2) }],
                    isError: true,
                };
            }
        });
    }
    missingProxyError() {
        const adapters = listAdapters();
        const providers = adapters
            .map(a => `  ${a.displayName}: ${a.credentialDocs}`)
            .join("\n");
        const errResp = {
            ok: false,
            error: {
                code: "PROVIDER_NOT_CONFIGURED",
                message: "No proxy provider is configured.",
                recoverable: false,
                agent_instruction: [
                    "Set credentials for one of the supported providers:",
                    providers,
                    "",
                    `Recommended — Novada: claude mcp add ${NPM_PACKAGE} -e NOVADA_PROXY_USER=your_username -e NOVADA_PROXY_PASS=your_password -- npx -y ${NPM_PACKAGE}`,
                ].join("\n"),
            },
        };
        return {
            content: [{ type: "text", text: JSON.stringify(errResp, null, 2) }],
            isError: true,
        };
    }
    missingApiKeyError() {
        const errResp = {
            ok: false,
            error: {
                code: "PROVIDER_NOT_CONFIGURED",
                message: "NOVADA_API_KEY is not set (required for agentproxy_search).",
                recoverable: false,
                agent_instruction: `Get your API key at novada.com → Dashboard → API Keys. Then restart with: claude mcp add ${NPM_PACKAGE} -e NOVADA_API_KEY=your_key -- npx -y ${NPM_PACKAGE}`,
            },
        };
        return {
            content: [{ type: "text", text: JSON.stringify(errResp, null, 2) }],
            isError: true,
        };
    }
    // ─── Prompts ─────────────────────────────────────────────────────────────────
    registerPrompts() {
        const PROMPTS = [
            {
                name: "fetch_url",
                description: "Fetch a URL through a residential proxy and return the content. Bypasses Cloudflare, Akamai, and most anti-bot systems.",
                arguments: [
                    { name: "url", description: "The URL to fetch (must start with http:// or https://)", required: true },
                    { name: "country", description: "2-letter country code for geo-targeting (e.g. US, DE, JP)", required: false },
                    { name: "format", description: "Output format: 'markdown' (default) strips HTML tags, 'raw' returns full HTML", required: false },
                ],
            },
            {
                name: "research_topic",
                description: "Search the web for a topic and read the top results. Uses agentproxy_search to find URLs, then agentproxy_batch_fetch to read them in parallel.",
                arguments: [
                    { name: "query", description: "Search query (e.g. 'residential proxy for AI agents 2024')", required: true },
                    { name: "num_results", description: "Number of results to fetch (1-10, default 5)", required: false },
                    { name: "country", description: "Localize search results (e.g. us, de, jp)", required: false },
                ],
            },
            {
                name: "extract_product",
                description: "Extract structured product data (title, price, description, rating) from any e-commerce URL. Works on Amazon, eBay, Shopify stores, and more.",
                arguments: [
                    { name: "url", description: "Product page URL", required: true },
                    { name: "fields", description: "Comma-separated fields to extract: title, price, description, rating, image, currency (default: title,price,description,rating)", required: false },
                ],
            },
            {
                name: "crawl_site",
                description: "Discover all internal links on a website, then fetch them in parallel. Use for full-site content extraction or sitemap generation.",
                arguments: [
                    { name: "url", description: "Starting URL (e.g. https://example.com)", required: true },
                    { name: "limit", description: "Max pages to crawl (10-100, default 20)", required: false },
                    { name: "country", description: "2-letter country code for geo-targeting", required: false },
                ],
            },
            {
                name: "troubleshoot",
                description: "Diagnose proxy failures step by step. Checks connectivity, tests a simple fetch, and suggests fixes based on error codes.",
                arguments: [
                    { name: "error_message", description: "The error message you received (optional — if provided, diagnosis starts from this error)", required: false },
                ],
            },
        ];
        this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
            prompts: PROMPTS,
        }));
        this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
            const { name, arguments: args = {} } = request.params;
            if (name === "fetch_url") {
                const url = args.url || "https://example.com";
                const country = args.country || "US";
                const format = args.format || "markdown";
                return {
                    description: "Fetch a URL through residential proxy",
                    messages: [{
                            role: "user",
                            content: {
                                type: "text",
                                text: `Use the agentproxy_fetch tool to fetch this URL through a residential proxy:\n\nurl: ${url}\ncountry: ${country}\nformat: ${format}\n\nReturn the page content. If you get a BOT_DETECTION_SUSPECTED error, retry with agentproxy_render instead.`,
                            },
                        }],
                };
            }
            if (name === "research_topic") {
                const query = args.query || "AI agent tools 2024";
                const numResults = args.num_results || "5";
                const country = args.country || "us";
                return {
                    description: "Search + batch read workflow",
                    messages: [{
                            role: "user",
                            content: {
                                type: "text",
                                text: `Research this topic using the proxy tools:\n\n1. Use agentproxy_search with query="${query}", num=${numResults}, country="${country}" to find relevant URLs\n2. Use agentproxy_batch_fetch with the URLs from step 1 (concurrency=3, format="markdown")\n3. Summarize the key findings from all pages\n\nReturn a structured summary with source URLs.`,
                            },
                        }],
                };
            }
            if (name === "extract_product") {
                const url = args.url || "https://example.com/product";
                const fields = args.fields || "title,price,description,rating";
                return {
                    description: "Extract product data from URL",
                    messages: [{
                            role: "user",
                            content: {
                                type: "text",
                                text: `Extract product data from this URL using agentproxy_extract:\n\nurl: ${url}\nfields: [${fields.split(",").map(f => `"${f.trim()}"`).join(", ")}]\nrender_fallback: true\n\nReturn the extracted fields as a JSON object. If a field is null, note that it was not found on the page.`,
                            },
                        }],
                };
            }
            if (name === "crawl_site") {
                const url = args.url || "https://example.com";
                const limit = args.limit || "20";
                const country = args.country || "US";
                return {
                    description: "Discover + batch crawl a site",
                    messages: [{
                            role: "user",
                            content: {
                                type: "text",
                                text: `Crawl this site using the map→batch pipeline:\n\n1. Use agentproxy_map with url="${url}", limit=${limit}, country="${country}" to discover all internal URLs\n2. Use agentproxy_batch_fetch with the internal_urls array from step 1 (concurrency=5, format="markdown")\n3. Return a summary of all pages found with their titles and key content\n\nNote: Check meta.cache_hit on each result — cached pages cost zero proxy credits.`,
                            },
                        }],
                };
            }
            if (name === "troubleshoot") {
                const errorMsg = args.error_message || "";
                const errorContext = errorMsg ? `\nThe last error was: "${errorMsg}"\n` : "";
                return {
                    description: "Diagnose proxy issues",
                    messages: [{
                            role: "user",
                            content: {
                                type: "text",
                                text: `Diagnose why proxy calls are failing using these steps:${errorContext}
1. Call agentproxy_status to check connectivity and provider health
2. If status is HEALTHY, try agentproxy_fetch with url="https://httpbin.org/ip" to verify a simple fetch works
3. If fetch fails, check the error code:
   - TIMEOUT → increase timeout parameter or try a different country
   - TLS_ERROR → try agentproxy_render instead, or a different country
   - BOT_DETECTION_SUSPECTED → use agentproxy_render for this site
   - PAGE_NOT_FOUND → verify the URL is correct
   - RATE_LIMITED → wait 5 seconds and retry
   - PROVIDER_NOT_CONFIGURED → credentials are missing, check env vars
4. Report: what worked, what failed, and recommended next action.`,
                            },
                        }],
                };
            }
            throw new Error(`Prompt not found: ${name}`);
        });
    }
    // ─── Resources ───────────────────────────────────────────────────────────────
    registerResources() {
        const RESOURCES = [
            {
                uri: "proxy://countries",
                name: "Supported Countries",
                description: "Complete list of 195+ country codes supported for geo-targeting. Use these with the country parameter in any tool.",
                mimeType: "text/plain",
            },
            {
                uri: "proxy://error-codes",
                name: "Error Code Reference",
                description: "All typed error codes returned by proxy tools, with recovery instructions for each.",
                mimeType: "application/json",
            },
            {
                uri: "proxy://workflows",
                name: "Workflow Templates",
                description: "Common agent workflow patterns: site crawl, research pipeline, price monitoring, sticky session scraping.",
                mimeType: "text/plain",
            },
            {
                uri: "proxy://supported-fields",
                name: "Supported Extract Fields",
                description: "All field names that agentproxy_extract can extract, with aliases and extraction strategies.",
                mimeType: "application/json",
            },
            {
                uri: "proxy://cost-guide",
                name: "Credit Cost Guide",
                description: "Credits consumed per tool, caching behavior, and cost optimization tips.",
                mimeType: "text/plain",
            },
        ];
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
            resources: RESOURCES,
        }));
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const { uri } = request.params;
            if (uri === "proxy://countries") {
                return {
                    contents: [{
                            uri,
                            mimeType: "text/plain",
                            text: [
                                "Supported country codes for geo-targeting (use 2-letter ISO codes):",
                                "",
                                "Americas: US CA MX BR AR CL CO PE VE",
                                "Europe:   GB DE FR IT ES NL PL SE NO DK FI CH AT BE PT CZ HU RO UA TR",
                                "Asia:     JP KR CN HK TW SG IN PK BD TH VN ID MY PH",
                                "Middle East & Africa: IL SA AE ZA NG EG MA KE",
                                "Oceania: AU NZ",
                                "",
                                "City-level targeting (use with city= parameter):",
                                "US: newyork losangeles chicago houston phoenix",
                                "UK: london manchester birmingham",
                                "EU: paris berlin amsterdam madrid rome stockholm",
                                "Asia: tokyo seoul singapore tokyo beijing shanghai mumbai",
                                "Other: sydney toronto dubai saopaulo",
                                "",
                                "Total: 195+ countries supported. See novada.com for full list.",
                            ].join("\n"),
                        }],
                };
            }
            if (uri === "proxy://error-codes") {
                const errorCodes = {
                    error_codes: [
                        { code: "BOT_DETECTION_SUSPECTED", recoverable: true, http_status: "4xx (except 404, 429)", action: "Retry with agentproxy_render or different country parameter" },
                        { code: "PAGE_NOT_FOUND", recoverable: false, http_status: "404", action: "Verify the URL is correct. Do not retry." },
                        { code: "TLS_ERROR", recoverable: true, cause: "TLS/SSL handshake failed through proxy", action: "Retry with different country parameter" },
                        { code: "TIMEOUT", recoverable: true, cause: "Request exceeded timeout limit", action: "Increase timeout parameter (max 120s) or retry" },
                        { code: "RATE_LIMITED", recoverable: true, http_status: "429", action: "Wait 5 seconds and retry. Reduce request frequency." },
                        { code: "NETWORK_ERROR", recoverable: false, cause: "DNS resolution failed — hostname not found", action: "Verify the URL is correct and the domain exists" },
                        { code: "SESSION_STICKINESS_FAILED", recoverable: true, cause: "Same IP not maintained across session calls", action: "Retry with verify_sticky:true to confirm before relying on it" },
                        { code: "INVALID_INPUT", recoverable: false, cause: "Bad parameter value (validation failed)", action: "Fix the parameter and retry. Check inputSchema for valid values." },
                        { code: "PROVIDER_NOT_CONFIGURED", recoverable: false, cause: "Required environment variable not set", action: "Set credentials and restart the MCP server" },
                        { code: "UNKNOWN_ERROR", recoverable: true, cause: "Unexpected error", action: "Check agentproxy_status for network health, then retry" },
                    ],
                    response_format: {
                        ok: false,
                        error: {
                            code: "ERROR_CODE",
                            message: "Human-readable description",
                            recoverable: "boolean — whether retrying may succeed",
                            agent_instruction: "Exact next step for the agent to take",
                            retry_after_seconds: "optional — minimum wait before retry",
                        },
                    },
                };
                return {
                    contents: [{
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify(errorCodes, null, 2),
                        }],
                };
            }
            if (uri === "proxy://workflows") {
                return {
                    contents: [{
                            uri,
                            mimeType: "text/plain",
                            text: [
                                "=== Proxy4Agents MCP — Common Workflow Patterns ===",
                                "",
                                "--- 1. Site Crawl Pipeline (map → batch) ---",
                                "Goal: read all pages on a site",
                                "  agentproxy_map(url, limit=50)",
                                "    → returns internal_urls[] (1 credit, ~4s)",
                                "  agentproxy_batch_fetch(urls=internal_urls, concurrency=5)",
                                "    → fetches all pages in parallel (N credits, ~4s wall time)",
                                "",
                                "--- 2. Research Pipeline (search → batch) ---",
                                "Goal: find and read top pages on a topic",
                                "  agentproxy_search(query, num=5)",
                                "    → structured JSON: titles + URLs + snippets",
                                "  agentproxy_batch_fetch(urls=result_urls, format='markdown')",
                                "    → full content of all pages in parallel",
                                "",
                                "--- 3. Sticky Session (login + multi-page) ---",
                                "Goal: scrape authenticated pages with same IP",
                                "  agentproxy_session(session_id='job001', url='/login')",
                                "  agentproxy_session(session_id='job001', url='/dashboard')",
                                "  agentproxy_session(session_id='job001', url='/data/page/1')",
                                "  # Same IP guaranteed across all calls",
                                "",
                                "--- 4. Price Monitoring (geo comparison) ---",
                                "Goal: same product, different markets",
                                "  agentproxy_fetch(url=product_url, country='US')",
                                "  agentproxy_fetch(url=product_url, country='DE')",
                                "  agentproxy_fetch(url=product_url, country='JP')",
                                "  # 2nd+ calls per URL are cache hits (0ms, 0 credits)",
                                "",
                                "--- 5. Structured Extraction (with JS fallback) ---",
                                "Goal: get product fields without HTML parsing",
                                "  agentproxy_extract(",
                                "    url=product_url,",
                                "    fields=['title', 'price', 'description', 'rating'],",
                                "    render_fallback=true  # auto-escalates to Chromium if blocked",
                                "  )",
                                "",
                                "--- Response Cache Notes ---",
                                "  cache_hit=true  → served from cache, 0 proxy credits used",
                                "  cache_hit=false → live proxy fetch, 1 credit used",
                                "  TTL: 300s default. Disable: PROXY4AGENT_CACHE_TTL_SECONDS=0",
                                "  Sessions with session_id are never cached.",
                            ].join("\n"),
                        }],
                };
            }
            if (uri === "proxy://supported-fields") {
                const fields = {
                    supported_fields: [
                        { field: "title", aliases: ["name", "product_name"], strategy: "og:title → JSON-LD name → <title> → <h1>" },
                        { field: "price", aliases: ["cost"], strategy: "JSON-LD price/lowPrice → product:price:amount meta → HTML price class regex" },
                        { field: "currency", aliases: [], strategy: "JSON-LD priceCurrency → product:price:currency meta" },
                        { field: "description", aliases: ["summary"], strategy: "og:description → description meta → JSON-LD description" },
                        { field: "image", aliases: ["thumbnail", "photo"], strategy: "og:image → JSON-LD image" },
                        { field: "rating", aliases: ["score"], strategy: "JSON-LD ratingValue" },
                        { field: "review_count", aliases: ["reviews", "rating_count"], strategy: "JSON-LD reviewCount/ratingCount" },
                        { field: "author", aliases: ["creator"], strategy: "JSON-LD author → author meta → article:author meta" },
                        { field: "date", aliases: ["published", "publish_date"], strategy: "JSON-LD datePublished → article:published_time → date meta" },
                        { field: "url", aliases: ["canonical"], strategy: "og:url → <link rel='canonical'>" },
                        { field: "links", aliases: ["urls"], strategy: "All <a href> with absolute http URLs (max 50)" },
                        { field: "headings", aliases: ["h1"], strategy: "All <h1> tag contents" },
                        { field: "h2", aliases: [], strategy: "All <h2> tag contents" },
                    ],
                    note: "For any field name not listed above, agentproxy_extract tries JSON-LD then meta tags as a generic fallback. For complex extraction needs, use agentproxy_fetch(format='raw') and parse the HTML yourself.",
                };
                return {
                    contents: [{
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify(fields, null, 2),
                        }],
                };
            }
            if (uri === "proxy://cost-guide") {
                return {
                    contents: [{
                            uri,
                            mimeType: "text/plain",
                            text: [
                                "=== Proxy4Agents MCP — Credit Cost Guide ===",
                                "",
                                "Credits per tool call:",
                                "  agentproxy_fetch     → 1 credit (0 if cache_hit=true)",
                                "  agentproxy_batch_fetch → 1 per URL (minus cache hits)",
                                "  agentproxy_extract   → 1 credit (5 if render_fallback triggered)",
                                "  agentproxy_map       → 1 credit",
                                "  agentproxy_session   → 1 credit (3 if verify_sticky=true)",
                                "  agentproxy_search    → 1 credit",
                                "  agentproxy_render    → 5 credits (Browser API metered separately)",
                                "  agentproxy_status    → 1 credit (makes a live proxy call)",
                                "",
                                "Cost optimization tips:",
                                "  1. Use agentproxy_fetch before agentproxy_render — fetch is 5x cheaper",
                                "  2. Repeated calls to the same URL are cached (meta.cache_hit=true = 0 credits)",
                                "  3. Cache TTL is 300s by default. Set PROXY4AGENT_CACHE_TTL_SECONDS to adjust.",
                                "  4. session_id requests bypass cache (sticky routing requires live calls)",
                                "  5. Use agentproxy_extract with render_fallback:true only when needed (auto-escalation costs 5 credits)",
                                "  6. batch_fetch with concurrency=3 is the sweet spot for speed vs. cost",
                                "  7. Check meta.quota.credits_estimated on every response for actual cost",
                            ].join("\n"),
                        }],
                };
            }
            throw new Error(`Resource not found: ${uri}`);
        });
    }
    missingBrowserWsError() {
        const errResp = {
            ok: false,
            error: {
                code: "PROVIDER_NOT_CONFIGURED",
                message: "NOVADA_BROWSER_WS is not set (required for agentproxy_render).",
                recoverable: false,
                agent_instruction: `Get your Browser API WebSocket URL at novada.com → Dashboard → Browser API → Playground → copy the Puppeteer URL (looks like wss://USER-zone-browser:PASS@upg-scbr.novada.com). Then restart with: claude mcp add ${NPM_PACKAGE} -e NOVADA_BROWSER_WS=your_wss_url -- npx -y ${NPM_PACKAGE}`,
            },
        };
        return {
            content: [{ type: "text", text: JSON.stringify(errResp, null, 2) }],
            isError: true,
        };
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        const provider = proxyContext
            ? `${proxyContext.adapter.displayName} adapter`
            : "no proxy provider";
        console.error(`Proxy4Agents MCP v${VERSION} — ${provider}`);
    }
}
// ─── CLI ─────────────────────────────────────────────────────────────────────
const cliArgs = process.argv.slice(2);
if (cliArgs.includes("--list-tools")) {
    for (const tool of TOOLS) {
        console.log(`  ${tool.name} — ${tool.description.split(/\.\s/)[0]}`);
    }
    process.exit(0);
}
if (cliArgs.includes("--help") || cliArgs.includes("-h")) {
    const adapterDocs = listAdapters()
        .map(a => `  ${a.displayName.padEnd(12)} ${a.credentialDocs}`)
        .join("\n");
    console.log(`Proxy4Agents MCP v${VERSION} — Residential proxy MCP server for AI agents

Usage:
  npx ${NPM_PACKAGE}              Start the MCP server
  npx ${NPM_PACKAGE} --list-tools Show available tools
  npx ${NPM_PACKAGE} --help       Show this help

Supported providers (set credentials for one):
${adapterDocs}

Environment variables:
  NOVADA_PROXY_USER     Novada proxy username
  NOVADA_PROXY_PASS     Novada proxy password
  NOVADA_PROXY_HOST     Account-specific proxy host (optional; for reliable sticky sessions)
  NOVADA_API_KEY        Novada Scraper API key (for agentproxy_search)
  NOVADA_BROWSER_WS     Novada Browser API WebSocket URL (for agentproxy_render)

Connect to Claude Code (Novada):
  claude mcp add ${NPM_PACKAGE} \\
    -e NOVADA_PROXY_USER=your_username \\
    -e NOVADA_PROXY_PASS=your_password \\
    -- npx -y ${NPM_PACKAGE}

Tools:
  agentproxy_fetch    Fetch any URL through residential proxy (anti-bot bypass)
  agentproxy_extract  Extract structured data (title, price, etc.) from any URL
  agentproxy_session  Sticky session — same IP across requests
  agentproxy_search   Structured web search via Google
  agentproxy_render   Render JS-heavy pages with real Chromium (Browser API)
  agentproxy_status   Proxy network health + active provider
`);
    process.exit(0);
}
const server = new Proxy4AgentsServer();
server.run().catch((error) => {
    let msg = error instanceof Error ? error.message : String(error);
    // Redact any credentials that might appear in startup errors
    if (NOVADA_API_KEY) {
        msg = msg.replaceAll(NOVADA_API_KEY, "***");
        msg = msg.replaceAll(encodeURIComponent(NOVADA_API_KEY), "***");
    }
    if (NOVADA_BROWSER_WS) {
        msg = msg.replaceAll(NOVADA_BROWSER_WS, "***");
        msg = msg.replaceAll(encodeURIComponent(NOVADA_BROWSER_WS), "***");
    }
    if (proxyContext) {
        for (const field of proxyContext.adapter.sensitiveFields) {
            const val = proxyContext.credentials[field];
            if (val) {
                msg = msg.replaceAll(val, "***");
                msg = msg.replaceAll(encodeURIComponent(val), "***");
            }
        }
        const user = proxyContext.credentials["user"];
        if (user) {
            msg = msg.replaceAll(user, "***");
            msg = msg.replaceAll(encodeURIComponent(user), "***");
        }
    }
    console.error("Fatal error:", msg);
    process.exit(1);
});
