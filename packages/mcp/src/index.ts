#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosError } from "axios";
import {
  novadaProxyFetch, validateFetchParams,
  novadaProxyBatchFetch, validateBatchFetchParams,
  novadaProxySearch, validateSearchParams,
  novadaProxySession, validateSessionParams,
  novadaProxyRender, validateRenderParams,
  novadaProxyExtract, validateExtractParams,
  novadaProxyMap, validateMapParams,
  novadaProxyCrawl, validateCrawlParams,
  novadaProxyResearch, validateResearchParams,
  novadaProxyStatus,
  resolveAdapter, listAdapters,
  VERSION, NPM_PACKAGE,
  classifyError,
} from "@novada/proxy-core";
import type { ProxyErrorResponse } from "@novada/proxy-core";

export { classifyError } from "@novada/proxy-core";

// ─── Provider Resolution ─────────────────────────────────────────────────────
//
// Reads env vars once at startup. Novada wins if multiple providers are set.
// proxyContext is null if no proxy provider is configured.

const proxyContext = resolveAdapter(process.env);

// ─── Other credentials (not provider-routing) ─────────────────────────────────

const NOVADA_API_KEY  = process.env.NOVADA_API_KEY;
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

// classifyError is now in src/errors.ts — imported and re-exported above

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "novada_proxy_fetch",
    description:
      "Fetch any URL through residential proxy (2M+ IPs, 195 countries, anti-bot bypass). Returns JSON: ok, data.content, data.status_code, meta.latency_ms, meta.cache_hit.\n\nWHEN TO USE: Static/HTML pages, Amazon, LinkedIn, news sites, most commercial sites.\nUSE novada_proxy_render INSTEAD IF: Page requires JavaScript to load (SPAs, React/Vue apps, dynamic feeds).\nUSE novada_proxy_extract INSTEAD IF: You need structured fields (title, price, rating) not raw content.\nON FAILURE: If error.code is BOT_DETECTION_SUSPECTED → retry with novada_proxy_render. If TLS_ERROR → retry with a different country parameter.\nCACHING: Same URL+format+country hits in-process cache (TTL 300s). meta.cache_hit=true = no credit used. session_id calls bypass cache.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url:        { type: "string", description: "The URL to fetch" },
        country:    { type: "string", description: "2-letter country code: US, DE, JP, GB, BR, ... (195+ options)" },
        city:       { type: "string", description: "City-level targeting: newyork, london, tokyo, ..." },
        session_id: { type: "string", description: "Use the same ID across calls to stay on the same IP (letters, numbers, underscores only — no hyphens)" },
        format:     { type: "string", enum: ["markdown", "raw"], default: "markdown", description: "markdown strips HTML tags; raw returns full HTML" },
        timeout:    { type: "number", default: 60, description: "Timeout in seconds (1-120)" },
      },
      required: ["url"],
    },
  },
  {
    name: "novada_proxy_batch_fetch",
    description:
      "Fetch multiple URLs concurrently through residential proxy. Returns structured JSON with per-URL results including ok/error status. Up to 20 URLs, up to 5 concurrent.\n\nWHEN TO USE: Scraping lists of URLs from search results, product catalogs, competitor pages.\nUSE novada_proxy_fetch INSTEAD FOR: Single URLs — lower overhead.\nON FAILURE: Individual URL failures are captured in results[].error — the batch itself succeeds even if some URLs fail.",
    inputSchema: {
      type: "object" as const,
      properties: {
        urls:        { type: "array", items: { type: "string" }, description: "2-20 URLs to fetch, each must start with http(s)://" },
        country:     { type: "string", description: "2-letter country code for all requests (e.g. US, DE, JP)" },
        session_id:  { type: "string", description: "Sticky session ID — reuse same IP for all URLs in the batch (letters, numbers, underscores only)" },
        format:      { type: "string", enum: ["markdown", "raw"], default: "markdown", description: "markdown strips HTML; raw returns full HTML" },
        timeout:     { type: "number", default: 60, description: "Per-URL timeout in seconds (1-120)" },
        concurrency: { type: "number", default: 3, minimum: 1, maximum: 5, description: "Max concurrent fetches (1-5, default 3)" },
      },
      required: ["urls"],
    },
  },
  {
    name: "novada_proxy_render",
    description:
      "Render a JavaScript-heavy page with real Chromium [BETA]. Returns structured JSON with ok, data.content. Requires NOVADA_BROWSER_WS env var.\n\nWHEN TO USE: SPAs, React/Vue apps, infinite scroll, pages that require JS to load content.\nUSE novada_proxy_fetch INSTEAD FOR: Static HTML pages — it is 3-5x faster.\nON FAILURE: If error.code is TIMEOUT → increase timeout. If PROVIDER_NOT_CONFIGURED → set NOVADA_BROWSER_WS.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url:      { type: "string", description: "The URL to render" },
        format:   { type: "string", enum: ["markdown", "html", "text"], default: "markdown", description: "markdown strips tags; html returns full HTML; text strips tags + links" },
        wait_for: { type: "string", description: "CSS selector to wait for before extracting (e.g. '.product-title')" },
        timeout:  { type: "number", default: 60, description: "Timeout in seconds (5-120)" },
      },
      required: ["url"],
    },
  },
  {
    name: "novada_proxy_search",
    description:
      "Search Google and return structured results (title, url, snippet) as JSON. No HTML parsing needed — results are pre-structured.\n\nWHEN TO USE: Finding pages by topic, factual queries, discovering URLs to then fetch.\nUSE novada_proxy_fetch INSTEAD FOR: Reading a specific URL you already have.\nON FAILURE: If error.code is PROVIDER_NOT_CONFIGURED → set NOVADA_API_KEY.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query:    { type: "string", description: "The search query" },
        engine:   { type: "string", enum: ["google"], default: "google", description: "Search engine — currently only 'google' is supported. More engines planned." },
        num:      { type: "number", default: 10, minimum: 1, maximum: 20, description: "Number of results (1-20)" },
        country:  { type: "string", description: "Country for localized results (e.g. us, uk, de)" },
        language: { type: "string", description: "Language code (e.g. en, zh, de)" },
      },
      required: ["query"],
    },
  },
  {
    name: "novada_proxy_extract",
    description:
      "Extract structured fields (title, price, rating, author, etc.) from any URL via residential proxy. Returns JSON with ok, data.fields as key-value map. Uses Open Graph, JSON-LD, and HTML heuristics.\n\nWHEN TO USE: Product pages, articles, listings where you need specific fields not raw content.\nUSE novada_proxy_fetch INSTEAD IF: You need full page content, not specific fields.\nAUTO-ESCALATION: Set render_fallback:true to automatically retry via real browser if proxy fetch fails. Costs 5 credits if escalated.\nON FAILURE without render_fallback: If TLS_ERROR or BOT_DETECTION_SUSPECTED → retry with render_fallback:true.\nSCHEMA MODE: Pass schema:{field_name: \"description\"} for LLM-based extraction — returns cleaned content + extraction prompt. See schema property for example.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url:             { type: "string", description: "The URL to extract data from" },
        fields:          { type: "array", items: { type: "string" }, description: "Field names to extract: title, price, currency, description, image, rating, review_count, author, date, url, links, headings, h2, or any JSON-LD/meta field name. Mutually exclusive with schema." },
        schema:          { type: "object", additionalProperties: { type: "string" }, description: "Schema for LLM-based extraction: {field_name: \"description\"}. Example: {\"price\":\"Current price in USD\",\"warranty\":\"Warranty terms\"}. Returns cleaned markdown + extraction prompt. Mutually exclusive with fields. 1-20 fields, keys must be alphanumeric/underscore." },
        country:         { type: "string", description: "2-letter country code for geo-targeting (e.g. US, DE, JP)" },
        city:            { type: "string", description: "City-level targeting (e.g. newyork, london, tokyo)" },
        session_id:      { type: "string", description: "Reuse same ID to keep the same IP across calls" },
        timeout:         { type: "number", default: 60, description: "Timeout in seconds (1-120)" },
        render_fallback: { type: "boolean", default: false, description: "Auto-retry via real browser (novada_proxy_render) if proxy fetch fails with TLS or bot-detection error. Requires NOVADA_BROWSER_WS. Costs 5 credits if triggered." },
      },
      required: ["url"],
    },
  },
  {
    name: "novada_proxy_session",
    description:
      "Fetch a URL with sticky-session IP persistence and optional verification. For basic sticky routing without verification, use novada_proxy_fetch with session_id instead.\n\nReuses the same residential IP across calls with the same session_id. Returns structured JSON. Use verify_sticky:true to confirm the session held.\n\nWHEN TO USE: Multi-step workflows where IP consistency matters: login flows, paginated scraping, price monitoring.\nNOTE: Sticky sessions are best-effort — infrastructure may not guarantee 100% IP consistency. Use verify_sticky:true to confirm.\nNOTE: verify_sticky:true makes 3 sequential proxy calls and adds ~15-25 seconds. Only use it when you need to confirm IP consistency before a multi-step workflow.\nON FAILURE: If SESSION_STICKINESS_FAILED → regenerate session_id or accept best-effort behavior.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session_id:    { type: "string", description: "Unique session ID — reuse the same value to keep the same IP (letters, numbers, underscores only — no hyphens)" },
        url:           { type: "string", description: "The URL to fetch" },
        country:       { type: "string", description: "2-letter country code" },
        city:          { type: "string", description: "City-level targeting (e.g. newyork, london, tokyo)" },
        format:        { type: "string", enum: ["markdown", "raw"], default: "markdown", description: "markdown strips HTML tags; raw returns full HTML" },
        timeout:       { type: "number", default: 60, description: "Timeout in seconds (1-120)" },
        verify_sticky: { type: "boolean", default: false, description: "Make a second httpbin.org/ip call with same session to verify IP consistency" },
      },
      required: ["session_id", "url"],
    },
  },
  {
    name: "novada_proxy_map",
    description:
      "Crawl a URL and return all internal links found on the page. Returns structured JSON with data.internal_urls array. Useful for discovering pages before batch-fetching them.\n\nWHEN TO USE: Before a batch scraping job — call novada_proxy_map first to discover URLs, then novada_proxy_batch_fetch to scrape them.\nUSE novada_proxy_fetch INSTEAD IF: You only need the content of a single specific URL.\nNOTE: This is a shallow map (single page). For deep crawls, call novada_proxy_map iteratively on discovered URLs.\nON FAILURE: If too few links found, the page may use JavaScript to load navigation — retry the URL with novada_proxy_render first, then extract links from rendered content.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url:              { type: "string", description: "The URL to crawl (domain root recommended for broadest coverage)" },
        limit:            { type: "number", default: 50, description: "Max internal URLs to return (10-200)" },
        include_external: { type: "boolean", default: false, description: "Include off-domain links in the response" },
        country:          { type: "string", description: "2-letter country code for geo-targeting" },
        timeout:          { type: "number", default: 60, description: "Timeout in seconds (1-120)" },
      },
      required: ["url"],
    },
  },
  {
    name: "novada_proxy_crawl",
    description:
      "Crawl a website recursively via BFS from a starting URL to configurable depth. Returns all discovered URLs with metadata, page titles, and optionally page content + extracted fields inline.\n\nWHEN TO USE: Full-site scraping, sitemap generation, content indexing, competitive analysis — when you need MORE than a single page.\nUSE novada_proxy_map INSTEAD IF: You only need links from ONE page.\nUSE novada_proxy_batch_fetch INSTEAD IF: You already have the URLs and just need content.\nWORKFLOW: crawl(url, max_pages=20, max_depth=3, include_content=true) → get full site content in one call.\nFILTERING: Use include_patterns/exclude_patterns to control which URLs are followed (e.g. include_patterns:['/blog/'] to crawl only blog posts).\nJS-HEAVY SITES: Set render='render' to use Chromium for SPAs — costs 5 credits/page instead of 1.\nEXTRACTION: Pass extract_fields=['title','description','author'] to get structured fields from every page.\nRATE LIMITING: Default 2 req/sec. Increase rate_limit for faster crawls on permissive sites.\nCACHING: Pages already in cache from prior fetch/map/crawl calls cost 0 credits.\nON FAILURE: If few pages found, the site may block crawling — try a different country or render='render'. If timeout, reduce max_depth or max_pages.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url:              { type: "string", description: "Starting URL (domain root recommended for broadest coverage)" },
        max_pages:        { type: "number", default: 10, minimum: 1, maximum: 100, description: "Max pages to crawl (1-100). Default 10." },
        max_depth:        { type: "number", default: 3, minimum: 1, maximum: 5, description: "Max link-follow depth from start URL (1-5). Default 3." },
        include_patterns: { type: "array", items: { type: "string" }, description: "Regex patterns — only follow URLs matching at least one pattern. Example: ['/blog/', '/docs/'] to crawl only blog and docs sections." },
        exclude_patterns: { type: "array", items: { type: "string" }, description: "Regex patterns — skip URLs matching any pattern. Example: ['/tag/', '/author/', '\\\\?page='] to skip taxonomy and pagination pages." },
        render:           { type: "string", enum: ["none", "render", "browser"], default: "none", description: "Render mode: 'none' = proxy fetch (fast, 1 credit/page), 'render'/'browser' = Chromium JS rendering (5 credits/page). Use for SPAs." },
        output_format:    { type: "string", enum: ["markdown", "html", "text"], default: "markdown", description: "Content format: markdown (clean, default), html (full HTML), text (plain text, no links/markup)." },
        extract_fields:   { type: "array", items: { type: "string" }, description: "Fields to extract from each page: title, description, author, image, date, etc. Returns structured key-value map per page." },
        include_content:  { type: "boolean", default: false, description: "Include full page content in response (default: false = URLs + metadata only). Set true for inline content." },
        rate_limit:       { type: "number", default: 2, minimum: 0.5, maximum: 10, description: "Max requests per second (0.5-10). Default 2. Increase for faster crawls on permissive sites." },
        country:          { type: "string", description: "2-letter country code for geo-targeting (e.g. US, DE, JP)" },
        timeout:          { type: "number", default: 60, description: "Per-page timeout in seconds (1-120)" },
        depth:            { type: "number", description: "[Legacy] Alias for max_depth. Use max_depth instead." },
        limit:            { type: "number", description: "[Legacy] Alias for max_pages. Use max_pages instead." },
        format:           { type: "string", enum: ["markdown", "raw"], description: "[Legacy] Alias for output_format. Use output_format instead." },
      },
      required: ["url"],
    },
  },
  {
    name: "novada_proxy_research",
    description:
      "Research a topic by searching the web, fetching top results, and returning structured findings with sources. The findings_summary concatenates source previews — your agent should analyze findings[] for deeper synthesis.\n\nWHEN TO USE: Research questions, topic investigation, competitive analysis, fact-finding.\nUSE novada_proxy_search INSTEAD IF: You just need search results (titles + URLs), not full content.\nUSE novada_proxy_fetch INSTEAD IF: You already know which URL to read.\nCHAIN WITH: The findings_summary is a starting point — use novada_proxy_fetch on specific urls[] for deeper reading.\nON FAILURE: If PROVIDER_NOT_CONFIGURED → set NOVADA_API_KEY (required for search step).",
    inputSchema: {
      type: "object" as const,
      properties: {
        query:   { type: "string", description: "Research question or topic to investigate" },
        depth:   { type: "string", enum: ["quick", "standard", "deep"], default: "standard", description: "Research depth: quick (3 sources), standard (5 sources), deep (10 sources)" },
        country: { type: "string", description: "2-letter country code for geo-targeted results (e.g. US, DE, JP)" },
        timeout: { type: "number", default: 60, description: "Per-source timeout in seconds (1-120)" },
      },
      required: ["query"],
    },
  },
  {
    name: "novada_proxy_status",
    description:
      "Check proxy connectivity and provider health. Returns structured JSON with ok, data.connectivity.status (HEALTHY/DEGRADED/UNAVAILABLE) and data.connectivity.proxy_ip (verified via live proxy call).\n\nWHEN TO USE: Before starting a large scraping workflow, or to diagnose proxy failures.\nNOTE: Live connectivity check — makes one proxy request to httpbin.org/ip on every call.\nUSE novada_proxy_fetch INSTEAD IF: You need to test fetching a specific URL, not general proxy health.\nON FAILURE: If PROVIDER_NOT_CONFIGURED → set proxy credentials env vars. If UNAVAILABLE → check provider dashboard.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

// ─── MCP Server ──────────────────────────────────────────────────────────────

class NovadaProxyServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: "novada-proxy-mcp", version: VERSION },
      { capabilities: { tools: {}, prompts: {}, resources: {} } }
    );
    this.setupHandlers();
    this.registerPrompts();
    this.registerResources();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const raw = (args || {}) as Record<string, unknown>;

      try {
        let result: string;

        switch (name) {
          case "novada_proxy_fetch": {
            if (!proxyContext) return this.missingProxyError();
            result = await novadaProxyFetch(
              validateFetchParams(raw),
              proxyContext.adapter,
              proxyContext.credentials
            );
            break;
          }
          case "novada_proxy_batch_fetch": {
            if (!proxyContext) return this.missingProxyError();
            result = await novadaProxyBatchFetch(
              validateBatchFetchParams(raw),
              proxyContext.adapter,
              proxyContext.credentials
            );
            break;
          }
          case "novada_proxy_render": {
            if (!NOVADA_BROWSER_WS) return this.missingBrowserWsError();
            if (activeRenders >= MAX_CONCURRENT_RENDERS) {
              const errResp: ProxyErrorResponse = {
                ok: false,
                error: {
                  code: "RATE_LIMITED",
                  message: `Too many concurrent renders (limit: ${MAX_CONCURRENT_RENDERS})`,
                  recoverable: true,
                  agent_instruction: `Wait for an active render to finish before starting another. Override limit with PROXY4AGENT_MAX_RENDERS env var.`,
                },
              };
              return {
                content: [{ type: "text" as const, text: JSON.stringify(errResp, null, 2) }],
                isError: true,
              };
            }
            activeRenders++;
            try {
              result = await novadaProxyRender(validateRenderParams(raw), NOVADA_BROWSER_WS);
            } finally {
              activeRenders--;
            }
            break;
          }
          case "novada_proxy_search": {
            if (!NOVADA_API_KEY) return this.missingApiKeyError();
            result = await novadaProxySearch(validateSearchParams(raw), NOVADA_API_KEY);
            break;
          }
          case "novada_proxy_extract": {
            if (!proxyContext) return this.missingProxyError();
            result = await novadaProxyExtract(
              validateExtractParams(raw),
              proxyContext.adapter,
              proxyContext.credentials,
              NOVADA_BROWSER_WS  // passed for render_fallback escalation
            );
            break;
          }
          case "novada_proxy_session": {
            if (!proxyContext) return this.missingProxyError();
            result = await novadaProxySession(
              validateSessionParams(raw),
              proxyContext.adapter,
              proxyContext.credentials
            );
            break;
          }
          case "novada_proxy_map": {
            if (!proxyContext) return this.missingProxyError();
            result = await novadaProxyMap(
              validateMapParams(raw),
              proxyContext.adapter,
              proxyContext.credentials
            );
            break;
          }
          case "novada_proxy_crawl": {
            if (!proxyContext) return this.missingProxyError();
            const crawlParams = validateCrawlParams(raw);
            // Inject browser_ws if render mode is requested
            if (crawlParams.render && crawlParams.render !== "none") {
              if (!NOVADA_BROWSER_WS) return this.missingBrowserWsError();
              crawlParams.browser_ws = NOVADA_BROWSER_WS;
            }
            result = await novadaProxyCrawl(
              crawlParams,
              proxyContext.adapter,
              proxyContext.credentials
            );
            break;
          }
          case "novada_proxy_research": {
            if (!NOVADA_API_KEY) return this.missingApiKeyError();
            if (!proxyContext) return this.missingProxyError();
            result = await novadaProxyResearch(
              validateResearchParams(raw),
              proxyContext.adapter,
              proxyContext.credentials,
              NOVADA_API_KEY
            );
            break;
          }
          case "novada_proxy_status": {
            result = await novadaProxyStatus(
              proxyContext?.adapter,
              proxyContext?.credentials
            );
            break;
          }
          default:
            return {
              content: [{
                type: "text" as const,
                text: `Unknown tool: ${name}. Available: ${TOOLS.map(t => t.name).join(", ")}`,
              }],
              isError: true,
            };
        }

        return { content: [{ type: "text" as const, text: result }] };
      } catch (error) {
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
          content: [{ type: "text" as const, text: JSON.stringify(errResponse, null, 2) }],
          isError: true,
        };
      }
    });
  }

  private missingProxyError() {
    const adapters = listAdapters();
    const providers = adapters
      .map(a => `  ${a.displayName}: ${a.credentialDocs}`)
      .join("\n");
    const errResp: ProxyErrorResponse = {
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
      content: [{ type: "text" as const, text: JSON.stringify(errResp, null, 2) }],
      isError: true,
    };
  }

  private missingApiKeyError() {
    const errResp: ProxyErrorResponse = {
      ok: false,
      error: {
        code: "PROVIDER_NOT_CONFIGURED",
        message: "NOVADA_API_KEY is not set (required for novada_proxy_search).",
        recoverable: false,
        agent_instruction: `Get your API key at novada.com → Dashboard → API Keys. Then restart with: claude mcp add ${NPM_PACKAGE} -e NOVADA_API_KEY=your_key -- npx -y ${NPM_PACKAGE}`,
      },
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(errResp, null, 2) }],
      isError: true,
    };
  }

  // ─── Prompts ─────────────────────────────────────────────────────────────────

  private registerPrompts(): void {
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
        description: "Search the web for a topic and read the top results. Uses novada_proxy_search to find URLs, then novada_proxy_batch_fetch to read them in parallel.",
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
        const url     = (args.url as string)     || "https://example.com";
        const country = (args.country as string) || "US";
        const format  = (args.format as string)  || "markdown";
        return {
          description: "Fetch a URL through residential proxy",
          messages: [{
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Use the novada_proxy_fetch tool to fetch this URL through a residential proxy:\n\nurl: ${url}\ncountry: ${country}\nformat: ${format}\n\nReturn the page content. If you get a BOT_DETECTION_SUSPECTED error, retry with novada_proxy_render instead.`,
            },
          }],
        };
      }

      if (name === "research_topic") {
        const query      = (args.query as string)       || "AI agent tools 2024";
        const numResults = (args.num_results as string) || "5";
        const country    = (args.country as string)     || "us";
        return {
          description: "Search + batch read workflow",
          messages: [{
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Research this topic using the proxy tools:\n\n1. Use novada_proxy_search with query="${query}", num=${numResults}, country="${country}" to find relevant URLs\n2. Use novada_proxy_batch_fetch with the URLs from step 1 (concurrency=3, format="markdown")\n3. Summarize the key findings from all pages\n\nReturn a structured summary with source URLs.`,
            },
          }],
        };
      }

      if (name === "extract_product") {
        const url    = (args.url as string)    || "https://example.com/product";
        const fields = (args.fields as string) || "title,price,description,rating";
        return {
          description: "Extract product data from URL",
          messages: [{
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Extract product data from this URL using novada_proxy_extract:\n\nurl: ${url}\nfields: [${fields.split(",").map(f => `"${f.trim()}"`).join(", ")}]\nrender_fallback: true\n\nReturn the extracted fields as a JSON object. If a field is null, note that it was not found on the page.`,
            },
          }],
        };
      }

      if (name === "crawl_site") {
        const url     = (args.url as string)    || "https://example.com";
        const limit   = (args.limit as string)  || "20";
        const country = (args.country as string) || "US";
        return {
          description: "Discover + batch crawl a site",
          messages: [{
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Crawl this site using the map→batch pipeline:\n\n1. Use novada_proxy_map with url="${url}", limit=${limit}, country="${country}" to discover all internal URLs\n2. Use novada_proxy_batch_fetch with the internal_urls array from step 1 (concurrency=5, format="markdown")\n3. Return a summary of all pages found with their titles and key content\n\nNote: Check meta.cache_hit on each result — cached pages cost zero proxy credits.`,
            },
          }],
        };
      }

      if (name === "troubleshoot") {
        const errorMsg = (args.error_message as string) || "";
        const errorContext = errorMsg ? `\nThe last error was: "${errorMsg}"\n` : "";
        return {
          description: "Diagnose proxy issues",
          messages: [{
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Diagnose why proxy calls are failing using these steps:${errorContext}
1. Call novada_proxy_status to check connectivity and provider health
2. If status is HEALTHY, try novada_proxy_fetch with url="https://httpbin.org/ip" to verify a simple fetch works
3. If fetch fails, check the error code:
   - TIMEOUT → increase timeout parameter or try a different country
   - TLS_ERROR → try novada_proxy_render instead, or a different country
   - BOT_DETECTION_SUSPECTED → use novada_proxy_render for this site
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

  private registerResources(): void {
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
        description: "All field names that novada_proxy_extract can extract, with aliases and extraction strategies.",
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
            { code: "BOT_DETECTION_SUSPECTED", recoverable: true, http_status: "4xx (except 429)", action: "Retry with novada_proxy_render or different country parameter" },
            { code: "TLS_ERROR", recoverable: true, cause: "TLS/SSL handshake failed through proxy", action: "Retry with different country parameter" },
            { code: "TIMEOUT", recoverable: true, cause: "Request exceeded timeout limit", action: "Increase timeout parameter (max 120s) or retry" },
            { code: "RATE_LIMITED", recoverable: true, http_status: "429", action: "Wait 5 seconds and retry. Reduce request frequency." },
            { code: "NETWORK_ERROR", recoverable: false, cause: "DNS resolution failed — hostname not found", action: "Verify the URL is correct and the domain exists" },
            { code: "SESSION_STICKINESS_FAILED", recoverable: true, cause: "Same IP not maintained across session calls", action: "Retry with verify_sticky:true to confirm before relying on it" },
            { code: "INVALID_INPUT", recoverable: false, cause: "Bad parameter value (validation failed)", action: "Fix the parameter and retry. Check inputSchema for valid values." },
            { code: "PROVIDER_NOT_CONFIGURED", recoverable: false, cause: "Required environment variable not set", action: "Set credentials and restart the MCP server" },
            { code: "UNKNOWN_ERROR", recoverable: true, cause: "Unexpected error", action: "Check novada_proxy_status for network health, then retry" },
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
              "=== Novada Proxy — Common Workflow Patterns ===",
              "",
              "--- 1. Site Crawl Pipeline (map → batch) ---",
              "Goal: read all pages on a site",
              "  novada_proxy_map(url, limit=50)",
              "    → returns internal_urls[] (1 credit, ~4s)",
              "  novada_proxy_batch_fetch(urls=internal_urls, concurrency=5)",
              "    → fetches all pages in parallel (N credits, ~4s wall time)",
              "",
              "--- 2. Research Pipeline (search → batch) ---",
              "Goal: find and read top pages on a topic",
              "  novada_proxy_search(query, num=5)",
              "    → structured JSON: titles + URLs + snippets",
              "  novada_proxy_batch_fetch(urls=result_urls, format='markdown')",
              "    → full content of all pages in parallel",
              "",
              "--- 3. Sticky Session (login + multi-page) ---",
              "Goal: scrape authenticated pages with same IP",
              "  novada_proxy_session(session_id='job001', url='/login')",
              "  novada_proxy_session(session_id='job001', url='/dashboard')",
              "  novada_proxy_session(session_id='job001', url='/data/page/1')",
              "  # Same IP guaranteed across all calls",
              "",
              "--- 4. Price Monitoring (geo comparison) ---",
              "Goal: same product, different markets",
              "  novada_proxy_fetch(url=product_url, country='US')",
              "  novada_proxy_fetch(url=product_url, country='DE')",
              "  novada_proxy_fetch(url=product_url, country='JP')",
              "  # 2nd+ calls per URL are cache hits (0ms, 0 credits)",
              "",
              "--- 5. Structured Extraction (with JS fallback) ---",
              "Goal: get product fields without HTML parsing",
              "  novada_proxy_extract(",
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
          note: "For any field name not listed above, novada_proxy_extract tries JSON-LD then meta tags as a generic fallback. For complex extraction needs, use novada_proxy_fetch(format='raw') and parse the HTML yourself.",
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
              "=== Novada Proxy — Credit Cost Guide ===",
              "",
              "Credits per tool call:",
              "  novada_proxy_fetch     → 1 credit (0 if cache_hit=true)",
              "  novada_proxy_batch_fetch → 1 per URL (minus cache hits)",
              "  novada_proxy_extract   → 1 credit (5 if render_fallback triggered)",
              "  novada_proxy_map       → 1 credit",
              "  novada_proxy_crawl    → 1 credit per page (0 if cache_hit=true)",
              "  NOTE: with include_content=true and format=markdown, crawl makes 2 fetches per page",
              "  (one for content, one for link extraction). Budget up to 2 credits per page in that mode.",
              "  novada_proxy_session   → 1 credit (3 if verify_sticky=true)",
              "  novada_proxy_search    → 1 credit",
              "  novada_proxy_render    → 5 credits (Browser API metered separately)",
              "  novada_proxy_status    → 1 credit (makes a live proxy call)",
              "",
              "Cost optimization tips:",
              "  1. Use novada_proxy_fetch before novada_proxy_render — fetch is 5x cheaper",
              "  2. Repeated calls to the same URL are cached (meta.cache_hit=true = 0 credits)",
              "  3. Cache TTL is 300s by default. Set PROXY4AGENT_CACHE_TTL_SECONDS to adjust.",
              "  4. session_id requests bypass cache (sticky routing requires live calls)",
              "  5. Use novada_proxy_extract with render_fallback:true only when needed (auto-escalation costs 5 credits)",
              "  6. batch_fetch with concurrency=3 is the sweet spot for speed vs. cost",
              "  7. Check meta.quota.credits_estimated on every response for actual cost",
            ].join("\n"),
          }],
        };
      }

      throw new Error(`Resource not found: ${uri}`);
    });
  }

  private missingBrowserWsError() {
    const errResp: ProxyErrorResponse = {
      ok: false,
      error: {
        code: "PROVIDER_NOT_CONFIGURED",
        message: "NOVADA_BROWSER_WS is not set (required for novada_proxy_render).",
        recoverable: false,
        agent_instruction: `Get your Browser API WebSocket URL at novada.com → Dashboard → Browser API → Playground → copy the Puppeteer URL (looks like wss://USER-zone-browser:PASS@upg-scbr.novada.com). Then restart with: claude mcp add ${NPM_PACKAGE} -e NOVADA_BROWSER_WS=your_wss_url -- npx -y ${NPM_PACKAGE}`,
      },
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(errResp, null, 2) }],
      isError: true,
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    const provider = proxyContext
      ? `${proxyContext.adapter.displayName} adapter`
      : "no proxy provider";
    console.error(`Novada Proxy v${VERSION} — ${provider}`);
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

  console.log(`Novada Proxy v${VERSION} — Residential proxy MCP server for AI agents

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
  NOVADA_API_KEY        Novada Scraper API key (for novada_proxy_search)
  NOVADA_BROWSER_WS     Novada Browser API WebSocket URL (for novada_proxy_render)

Connect to Claude Code (Novada):
  claude mcp add ${NPM_PACKAGE} \\
    -e NOVADA_PROXY_USER=your_username \\
    -e NOVADA_PROXY_PASS=your_password \\
    -- npx -y ${NPM_PACKAGE}

Tools (10):
  novada_proxy_fetch       Fetch any URL through residential proxy
  novada_proxy_batch_fetch Fetch multiple URLs concurrently
  novada_proxy_extract     Extract structured fields (heuristic or schema mode)
  novada_proxy_map         Scan a page for all links
  novada_proxy_crawl       Recursively crawl a website (BFS)
  novada_proxy_search      Google search → structured JSON
  novada_proxy_research    One-shot research (search + fetch + findings)
  novada_proxy_render      Render JS-heavy pages with Chromium [BETA]
  novada_proxy_session     Sticky session — same IP across calls
  novada_proxy_status      Check proxy health
`);
  process.exit(0);
}

const server = new NovadaProxyServer();
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
