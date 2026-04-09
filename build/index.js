#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { AxiosError } from "axios";
import { agentproxyFetch, validateFetchParams, agentproxySearch, validateSearchParams, agentproxySession, validateSessionParams, agentproxyRender, validateRenderParams, agentproxyStatus, } from "./tools/index.js";
import { resolveAdapter, listAdapters } from "./adapters/index.js";
import { VERSION } from "./config.js";
// ─── Provider Resolution ─────────────────────────────────────────────────────
//
// Reads env vars once at startup. Novada wins if multiple providers are set.
// proxyContext is null if no proxy provider is configured.
const proxyContext = resolveAdapter(process.env);
// ─── Other credentials (not provider-routing) ─────────────────────────────────
const NOVADA_API_KEY = process.env.NOVADA_API_KEY;
const NOVADA_BROWSER_WS = process.env.NOVADA_BROWSER_WS;
// ─── Tool Definitions ────────────────────────────────────────────────────────
const TOOLS = [
    {
        name: "agentproxy_fetch",
        description: "Fetch any URL through a residential proxy network (2M+ IPs, 195 countries, anti-bot bypass). Works on Amazon, LinkedIn, Cloudflare-protected pages, and most commercial sites. Use agentproxy_render instead for JavaScript-heavy pages that need a real browser.",
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
        name: "agentproxy_render",
        description: "[BETA] Render a JavaScript-heavy page using Novada's Browser API (real Chromium, full JS execution). Use this for SPAs, React/Vue apps, and sites that require JavaScript to load content. Requires NOVADA_BROWSER_WS env var. For static/HTML pages, agentproxy_fetch is faster.",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string", description: "The URL to render" },
                format: { type: "string", enum: ["markdown", "html", "text"], default: "markdown" },
                wait_for: { type: "string", description: "CSS selector to wait for before extracting (e.g. '.product-title')" },
                timeout: { type: "number", default: 60, description: "Timeout in seconds (5-120)" },
            },
            required: ["url"],
        },
    },
    {
        name: "agentproxy_search",
        description: "Structured web search via Novada (Google). Returns titles, URLs, and descriptions — no HTML parsing needed. Best for finding pages and factual queries. For reading a specific URL, use agentproxy_fetch instead.",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string", description: "The search query" },
                engine: { type: "string", enum: ["google"], default: "google", description: "Search engine (google)" },
                num: { type: "number", default: 10, minimum: 1, maximum: 20, description: "Number of results (1-20)" },
                country: { type: "string", description: "Country for localized results (e.g. us, uk, de)" },
                language: { type: "string", description: "Language code (e.g. en, zh, de)" },
            },
            required: ["query"],
        },
    },
    {
        name: "agentproxy_session",
        description: "Fetch a URL with a sticky session — the same residential IP is used for every call with the same session_id. Use this for multi-step workflows where IP consistency matters: login flows, paginated scraping, price monitoring.",
        inputSchema: {
            type: "object",
            properties: {
                session_id: { type: "string", description: "Unique session ID — reuse the same value to keep the same IP (letters, numbers, underscores only — no hyphens)" },
                url: { type: "string", description: "The URL to fetch" },
                country: { type: "string", description: "2-letter country code" },
                format: { type: "string", enum: ["markdown", "raw"], default: "markdown" },
                timeout: { type: "number", default: 60, description: "Timeout in seconds" },
            },
            required: ["session_id", "url"],
        },
    },
    {
        name: "agentproxy_status",
        description: "Check proxy network health — live node count, device types, active provider, service status. Use before starting a large scraping workflow to confirm the network is healthy.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
];
// ─── MCP Server ──────────────────────────────────────────────────────────────
class ProxyVeilServer {
    server;
    constructor() {
        this.server = new Server({ name: "proxy-veil", version: VERSION }, { capabilities: { tools: {} } });
        this.setupHandlers();
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
                    case "agentproxy_render": {
                        if (!NOVADA_BROWSER_WS)
                            return this.missingBrowserWsError();
                        result = await agentproxyRender(validateRenderParams(raw), NOVADA_BROWSER_WS);
                        break;
                    }
                    case "agentproxy_search": {
                        if (!NOVADA_API_KEY)
                            return this.missingApiKeyError();
                        result = await agentproxySearch(validateSearchParams(raw), NOVADA_API_KEY);
                        break;
                    }
                    case "agentproxy_session": {
                        if (!proxyContext)
                            return this.missingProxyError();
                        result = await agentproxySession(validateSessionParams(raw), proxyContext.adapter, proxyContext.credentials);
                        break;
                    }
                    case "agentproxy_status": {
                        const networkStatus = await agentproxyStatus();
                        const provider = proxyContext
                            ? `Provider: ${proxyContext.adapter.displayName} (verified ${proxyContext.adapter.lastVerified})`
                            : "Provider: none configured";
                        result = `${provider}\n\n${networkStatus}`;
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
                const rawMsg = error instanceof AxiosError
                    ? `HTTP ${error.response?.status || "error"}: ${String(error.response?.data?.msg || error.message)}`
                    : error instanceof Error
                        ? error.message
                        : String(error);
                // Systematic credential redaction — adapter knows which fields are sensitive
                let message = rawMsg;
                if (proxyContext) {
                    for (const field of proxyContext.adapter.sensitiveFields) {
                        const val = proxyContext.credentials[field];
                        if (val)
                            message = message.replaceAll(val, "***");
                    }
                    // Also redact the raw username (not in sensitiveFields but may appear in proxy error URLs)
                    const user = proxyContext.credentials["user"];
                    if (user)
                        message = message.replaceAll(user, "***");
                }
                if (NOVADA_API_KEY)
                    message = message.replaceAll(NOVADA_API_KEY, "***");
                if (NOVADA_BROWSER_WS)
                    message = message.replaceAll(NOVADA_BROWSER_WS, "[browser-ws-redacted]");
                return {
                    content: [{ type: "text", text: `Error: ${message}` }],
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
        return {
            content: [{
                    type: "text",
                    text: [
                        "Error: No proxy provider is configured.",
                        "",
                        "Set credentials for one of the supported providers:",
                        providers,
                        "",
                        "Recommended — Novada (default):",
                        "  claude mcp add proxy-veil \\",
                        "    -e NOVADA_PROXY_USER=your_username \\",
                        "    -e NOVADA_PROXY_PASS=your_password \\",
                        "    -- npx -y proxy-veil",
                    ].join("\n"),
                }],
            isError: true,
        };
    }
    missingApiKeyError() {
        return {
            content: [{
                    type: "text",
                    text: [
                        "Error: NOVADA_API_KEY is not set (required for agentproxy_search).",
                        "",
                        "Get your API key: novada.com → Dashboard → API Keys",
                        "",
                        "Then restart with:",
                        "  claude mcp add proxy-veil -e NOVADA_API_KEY=your_key -- npx -y proxy-veil",
                    ].join("\n"),
                }],
            isError: true,
        };
    }
    missingBrowserWsError() {
        return {
            content: [{
                    type: "text",
                    text: [
                        "Error: NOVADA_BROWSER_WS is not set (required for agentproxy_render).",
                        "",
                        "Get your Browser API WebSocket URL:",
                        "  novada.com → Dashboard → Browser API → Playground → copy the Puppeteer URL",
                        "  It looks like: wss://USER-zone-browser:PASS@upg-scbr.novada.com",
                        "",
                        "Then restart with:",
                        "  claude mcp add proxy-veil -e NOVADA_BROWSER_WS=your_wss_url -- npx -y proxy-veil",
                    ].join("\n"),
                }],
            isError: true,
        };
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        const provider = proxyContext
            ? `${proxyContext.adapter.displayName} adapter`
            : "no proxy provider";
        console.error(`ProxyVeil MCP v${VERSION} — ${provider}`);
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
    console.log(`proxy-veil v${VERSION} — Residential proxy MCP server for AI agents

Usage:
  npx proxy-veil              Start the MCP server
  npx proxy-veil --list-tools Show available tools
  npx proxy-veil --help       Show this help

Supported providers (set credentials for one):
${adapterDocs}

Environment variables:
  NOVADA_PROXY_USER     Novada proxy username
  NOVADA_PROXY_PASS     Novada proxy password
  NOVADA_PROXY_HOST     Account-specific proxy host (optional; for reliable sticky sessions)
  NOVADA_API_KEY        Novada Scraper API key (for agentproxy_search)
  NOVADA_BROWSER_WS     Novada Browser API WebSocket URL (for agentproxy_render)

Connect to Claude Code (Novada):
  claude mcp add proxy-veil \\
    -e NOVADA_PROXY_USER=your_username \\
    -e NOVADA_PROXY_PASS=your_password \\
    -- npx -y proxy-veil

Tools:
  agentproxy_fetch    Fetch any URL through residential proxy (anti-bot bypass)
  agentproxy_session  Sticky session — same IP across requests
  agentproxy_search   Structured web search via Google
  agentproxy_render   Render JS-heavy pages with real Chromium (Browser API)
  agentproxy_status   Proxy network health + active provider
`);
    process.exit(0);
}
const server = new ProxyVeilServer();
server.run().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
