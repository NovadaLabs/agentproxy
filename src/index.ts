#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AxiosError } from "axios";
import {
  agentproxyFetch, validateFetchParams,
  agentproxySearch, validateSearchParams,
  agentproxySession, validateSessionParams,
  agentproxyRender, validateRenderParams,
  agentproxyExtract, validateExtractParams,
  agentproxyStatus,
} from "./tools/index.js";
import { resolveAdapter, listAdapters } from "./adapters/index.js";
import { VERSION, NPM_PACKAGE } from "./config.js";

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

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "agentproxy_fetch",
    description:
      "Fetch any URL through a residential proxy network (2M+ IPs, 195 countries, anti-bot bypass). Works on Amazon, LinkedIn, Cloudflare-protected pages, and most commercial sites. Use agentproxy_render instead for JavaScript-heavy pages that need a real browser.",
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
    name: "agentproxy_render",
    description:
      "[BETA] Render a JavaScript-heavy page using Novada's Browser API (real Chromium, full JS execution). Use this for SPAs, React/Vue apps, and sites that require JavaScript to load content. Requires NOVADA_BROWSER_WS env var. For static/HTML pages, agentproxy_fetch is faster.",
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
    name: "agentproxy_search",
    description:
      "Structured web search via Novada (Google). Returns titles, URLs, and descriptions — no HTML parsing needed. Best for finding pages and factual queries. For reading a specific URL, use agentproxy_fetch instead.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query:    { type: "string", description: "The search query" },
        engine:   { type: "string", enum: ["google"], default: "google", description: "Search engine (google)" },
        num:      { type: "number", default: 10, minimum: 1, maximum: 20, description: "Number of results (1-20)" },
        country:  { type: "string", description: "Country for localized results (e.g. us, uk, de)" },
        language: { type: "string", description: "Language code (e.g. en, zh, de)" },
      },
      required: ["query"],
    },
  },
  {
    name: "agentproxy_extract",
    description:
      "Extract structured data from any URL through a residential proxy. Fetches the page and extracts named fields (title, price, description, rating, author, date, image, links, headings, etc.) using meta tags, Open Graph, JSON-LD, and HTML patterns. Returns clean key-value output — no HTML parsing needed by the agent.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url:        { type: "string", description: "The URL to extract data from" },
        fields:     { type: "array", items: { type: "string" }, description: "Field names to extract: title, price, currency, description, image, rating, review_count, author, date, url, links, headings, h2, or any JSON-LD/meta field name" },
        country:    { type: "string", description: "2-letter country code for geo-targeting (e.g. US, DE, JP)" },
        city:       { type: "string", description: "City-level targeting (e.g. newyork, london, tokyo)" },
        session_id: { type: "string", description: "Reuse same ID to keep the same IP across calls" },
        timeout:    { type: "number", default: 60, description: "Timeout in seconds (1-120)" },
      },
      required: ["url", "fields"],
    },
  },
  {
    name: "agentproxy_session",
    description:
      "Fetch a URL with a sticky session — the same residential IP is used for every call with the same session_id. Use this for multi-step workflows where IP consistency matters: login flows, paginated scraping, price monitoring.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session_id: { type: "string", description: "Unique session ID — reuse the same value to keep the same IP (letters, numbers, underscores only — no hyphens)" },
        url:        { type: "string", description: "The URL to fetch" },
        country:    { type: "string", description: "2-letter country code" },
        city:       { type: "string", description: "City-level targeting (e.g. newyork, london, tokyo)" },
        format:     { type: "string", enum: ["markdown", "raw"], default: "markdown" },
        timeout:    { type: "number", default: 60, description: "Timeout in seconds (1-120)" },
      },
      required: ["session_id", "url"],
    },
  },
  {
    name: "agentproxy_status",
    description:
      "Check proxy network health — live node count, device types, active provider, service status. Use before starting a large scraping workflow to confirm the network is healthy.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

// ─── MCP Server ──────────────────────────────────────────────────────────────

class Proxy4AgentsServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: "proxy4agents-mcp", version: VERSION },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();
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
          case "agentproxy_fetch": {
            if (!proxyContext) return this.missingProxyError();
            result = await agentproxyFetch(
              validateFetchParams(raw),
              proxyContext.adapter,
              proxyContext.credentials
            );
            break;
          }
          case "agentproxy_render": {
            if (!NOVADA_BROWSER_WS) return this.missingBrowserWsError();
            if (activeRenders >= MAX_CONCURRENT_RENDERS) {
              return {
                content: [{ type: "text" as const, text: `Error: Too many concurrent renders (limit: ${MAX_CONCURRENT_RENDERS}). Wait for an active render to finish before starting another. Override with PROXY4AGENT_MAX_RENDERS env var.` }],
                isError: true,
              };
            }
            activeRenders++;
            try {
              result = await agentproxyRender(validateRenderParams(raw), NOVADA_BROWSER_WS);
            } finally {
              activeRenders--;
            }
            break;
          }
          case "agentproxy_search": {
            if (!NOVADA_API_KEY) return this.missingApiKeyError();
            result = await agentproxySearch(validateSearchParams(raw), NOVADA_API_KEY);
            break;
          }
          case "agentproxy_extract": {
            if (!proxyContext) return this.missingProxyError();
            result = await agentproxyExtract(
              validateExtractParams(raw),
              proxyContext.adapter,
              proxyContext.credentials
            );
            break;
          }
          case "agentproxy_session": {
            if (!proxyContext) return this.missingProxyError();
            result = await agentproxySession(
              validateSessionParams(raw),
              proxyContext.adapter,
              proxyContext.credentials
            );
            break;
          }
          case "agentproxy_status": {
            const networkStatus = await agentproxyStatus();
            const lines: string[] = [];
            if (proxyContext) {
              const { adapter } = proxyContext;
              const caps = [
                adapter.capabilities.country ? "country targeting" : null,
                adapter.capabilities.city    ? "city targeting"    : null,
                adapter.capabilities.sticky  ? "sticky sessions"   : null,
              ].filter(Boolean).join(", ") || "none (use Novada for full targeting)";
              lines.push(`Provider:     ${adapter.displayName}`);
              lines.push(`Verified:     ${adapter.lastVerified}`);
              lines.push(`Capabilities: ${caps}`);
            } else {
              lines.push("Provider: none configured");
            }
            result = `${lines.join("\n")}\n\n${networkStatus}`;
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
        const rawMsg =
          error instanceof AxiosError
            ? `HTTP ${error.response?.status || "error"}: ${String(error.response?.data?.msg || error.message)}`
            : error instanceof Error
              ? error.message
              : String(error);

        // Systematic credential redaction — adapter knows which fields are sensitive
        let message = rawMsg;
        if (proxyContext) {
          for (const field of proxyContext.adapter.sensitiveFields) {
            const val = proxyContext.credentials[field];
            if (val) message = message.replaceAll(val, "***");
          }
          // Also redact the raw username (not in sensitiveFields but may appear in proxy error URLs)
          const user = proxyContext.credentials["user"];
          if (user) message = message.replaceAll(user, "***");
        }
        if (NOVADA_API_KEY)    message = message.replaceAll(NOVADA_API_KEY, "***");
        if (NOVADA_BROWSER_WS) message = message.replaceAll(NOVADA_BROWSER_WS, "***");

        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
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
    return {
      content: [{
        type: "text" as const,
        text: [
          "Error: No proxy provider is configured.",
          "",
          "Set credentials for one of the supported providers:",
          providers,
          "",
          "Recommended — Novada (default):",
          `  claude mcp add ${NPM_PACKAGE} \\`,
          "    -e NOVADA_PROXY_USER=your_username \\",
          "    -e NOVADA_PROXY_PASS=your_password \\",
          `    -- npx -y ${NPM_PACKAGE}`,
        ].join("\n"),
      }],
      isError: true,
    };
  }

  private missingApiKeyError() {
    return {
      content: [{
        type: "text" as const,
        text: [
          "Error: NOVADA_API_KEY is not set (required for agentproxy_search).",
          "",
          "Get your API key: novada.com → Dashboard → API Keys",
          "",
          "Then restart with:",
          `  claude mcp add ${NPM_PACKAGE} -e NOVADA_API_KEY=your_key -- npx -y ${NPM_PACKAGE}`,
        ].join("\n"),
      }],
      isError: true,
    };
  }

  private missingBrowserWsError() {
    return {
      content: [{
        type: "text" as const,
        text: [
          "Error: NOVADA_BROWSER_WS is not set (required for agentproxy_render).",
          "",
          "Get your Browser API WebSocket URL:",
          "  novada.com → Dashboard → Browser API → Playground → copy the Puppeteer URL",
          "  It looks like: wss://USER-zone-browser:PASS@upg-scbr.novada.com",
          "",
          "Then restart with:",
          `  claude mcp add ${NPM_PACKAGE} -e NOVADA_BROWSER_WS=your_wss_url -- npx -y ${NPM_PACKAGE}`,
        ].join("\n"),
      }],
      isError: true,
    };
  }

  async run(): Promise<void> {
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
  console.error("Fatal error:", error);
  process.exit(1);
});
