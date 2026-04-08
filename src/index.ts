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
  agentproxyStatus,
} from "./tools/index.js";
import { VERSION } from "./config.js";

// ─── API Keys — all available at novada.com ───────────────────────────────────
//
// NOVADA_API_KEY      → Novada Scraper API (search)
// NOVADA_PROXY_USER   → Residential proxy username (from Dashboard → Residential → Endpoint Generator)
// NOVADA_PROXY_PASS   → Residential proxy password
// NOVADA_BROWSER_WS   → Browser API WebSocket URL (from Dashboard → Browser API → Playground)
//                       Example: wss://USER-zone-browser:PASS@upg-scbr.novada.com

const NOVADA_API_KEY = process.env.NOVADA_API_KEY;
const NOVADA_PROXY_USER = process.env.NOVADA_PROXY_USER;
const NOVADA_PROXY_PASS = process.env.NOVADA_PROXY_PASS;
const NOVADA_BROWSER_WS = process.env.NOVADA_BROWSER_WS;

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "agentproxy_fetch",
    description:
      "Fetch any URL through Novada's residential proxy network (2M+ IPs, 195 countries, anti-bot bypass). Works on Amazon, LinkedIn, Cloudflare-protected pages, and most commercial sites. Use agentproxy_render instead for JavaScript-heavy pages that need a real browser.",
    inputSchema: {
      type: "object" as const,
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
    description:
      "[BETA] Render a JavaScript-heavy page using Novada's Browser API (real Chromium, full JS execution). Use this for SPAs, React/Vue apps, and sites that require JavaScript to load content — like Zillow, BestBuy, or any page that shows blank without a browser. Requires NOVADA_BROWSER_WS env var (get from Dashboard → Browser API → Playground). For static/HTML pages, agentproxy_fetch is faster and more reliable.",
    inputSchema: {
      type: "object" as const,
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
    description:
      "Structured web search via Novada (Google). Returns titles, URLs, and descriptions — no HTML parsing needed. Best for finding pages and factual queries. For reading a specific URL, use agentproxy_fetch instead.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "The search query" },
        engine: {
          type: "string",
          enum: ["google"],
          default: "google",
          description: "Search engine (google only — other engines have known quality issues with proxy IPs)",
        },
        num: { type: "number", default: 10, minimum: 1, maximum: 20, description: "Number of results (1-20)" },
        country: { type: "string", description: "Country for localized results (e.g. us, uk, de)" },
        language: { type: "string", description: "Language code (e.g. en, zh, de)" },
      },
      required: ["query"],
    },
  },
  {
    name: "agentproxy_session",
    description:
      "Fetch a URL with a sticky session — the same residential IP is used for every call with the same session_id. Use this for multi-step workflows where IP consistency matters: login flows, paginated scraping, price monitoring across pages.",
    inputSchema: {
      type: "object" as const,
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
    description:
      "Check Novada's proxy network health — live node count, device types, service status. Use before starting a large scraping workflow to confirm the network is healthy.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

// ─── MCP Server ──────────────────────────────────────────────────────────────

class AgentProxyServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: "agentproxy", version: VERSION },
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
            if (!NOVADA_PROXY_USER || !NOVADA_PROXY_PASS) {
              return this.missingProxyKeyError();
            }
            result = await agentproxyFetch(validateFetchParams(raw), NOVADA_PROXY_USER, NOVADA_PROXY_PASS);
            break;
          }
          case "agentproxy_render": {
            if (!NOVADA_BROWSER_WS) {
              return this.missingBrowserWsError();
            }
            result = await agentproxyRender(validateRenderParams(raw), NOVADA_BROWSER_WS);
            break;
          }
          case "agentproxy_search": {
            if (!NOVADA_API_KEY) {
              return this.missingApiKeyError("search tool (Novada Scraper API)");
            }
            result = await agentproxySearch(validateSearchParams(raw), NOVADA_API_KEY);
            break;
          }
          case "agentproxy_session": {
            if (!NOVADA_PROXY_USER || !NOVADA_PROXY_PASS) {
              return this.missingProxyKeyError();
            }
            result = await agentproxySession(validateSessionParams(raw), NOVADA_PROXY_USER, NOVADA_PROXY_PASS);
            break;
          }
          case "agentproxy_status":
            result = await agentproxyStatus();
            break;
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
        // Redact credentials from any error message before surfacing to agent
        let message = rawMsg;
        if (NOVADA_API_KEY) message = message.replaceAll(NOVADA_API_KEY, "***");
        if (NOVADA_PROXY_PASS) message = message.replaceAll(NOVADA_PROXY_PASS, "***");
        if (NOVADA_BROWSER_WS) message = message.replaceAll(NOVADA_BROWSER_WS, "[browser-ws-redacted]");
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    });
  }

  private missingApiKeyError(forWhat: string) {
    return {
      content: [{
        type: "text" as const,
        text: `Error: NOVADA_API_KEY is not set (required for ${forWhat}).\n\nGet your API key at https://www.novada.com — sign up is free.\n\nThen restart with:\n  claude mcp add agentproxy -e NOVADA_API_KEY=your_key -- npx -y agentproxy`,
      }],
      isError: true,
    };
  }

  private missingProxyKeyError() {
    return {
      content: [{
        type: "text" as const,
        text: `Error: NOVADA_PROXY_USER and NOVADA_PROXY_PASS are not set (required for fetch/session tools).\n\nGet your proxy credentials at https://www.novada.com:\n  Dashboard → Residential Proxies → Endpoint Generator\n\nThen restart with:\n  claude mcp add agentproxy \\\n    -e NOVADA_PROXY_USER=your_username \\\n    -e NOVADA_PROXY_PASS=your_password \\\n    -- npx -y agentproxy`,
      }],
      isError: true,
    };
  }

  private missingBrowserWsError() {
    return {
      content: [{
        type: "text" as const,
        text: `Error: NOVADA_BROWSER_WS is not set (required for the render tool).\n\nGet your Browser API WebSocket URL at https://www.novada.com:\n  Dashboard → Browser API → Playground → copy the Puppeteer/Playwright URL\n\nIt looks like: wss://USER-zone-browser:PASS@upg-scbr.novada.com\n\nThen restart with:\n  claude mcp add agentproxy -e NOVADA_BROWSER_WS=your_wss_url -- npx -y agentproxy`,
      }],
      isError: true,
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`AgentProxy MCP v${VERSION} running on stdio`);
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const cliArgs = process.argv.slice(2);

if (cliArgs.includes("--list-tools")) {
  for (const tool of TOOLS) {
    console.log(`  ${tool.name} — ${tool.description.split(".")[0]}`);
  }
  process.exit(0);
}

if (cliArgs.includes("--help") || cliArgs.includes("-h")) {
  console.log(`agentproxy v${VERSION} — Agent-to-agent proxy MCP server by Novada

Usage:
  npx agentproxy              Start the MCP server
  npx agentproxy --list-tools Show available tools
  npx agentproxy --help       Show this help

Environment Variables:
  NOVADA_API_KEY        Novada Scraper API key (for agentproxy_search)
  NOVADA_PROXY_USER     Residential proxy username (for agentproxy_fetch, agentproxy_session)
  NOVADA_PROXY_PASS     Residential proxy password
  NOVADA_BROWSER_WS     Browser API WebSocket URL (for agentproxy_render)

Get your credentials:
  1. Sign up at https://www.novada.com (free, 30 seconds)
  2. Scraper API key: Dashboard → API Keys
  3. Proxy credentials: Dashboard → Residential Proxies → Endpoint Generator
  4. Browser API: Dashboard → Browser API → Playground

Connect to Claude Code:
  claude mcp add agentproxy \\
    -e NOVADA_API_KEY=your_key \\
    -e NOVADA_PROXY_USER=your_username \\
    -e NOVADA_PROXY_PASS=your_password \\
    -- npx -y agentproxy

Tools:
  agentproxy_fetch    Fetch any URL through residential proxy (anti-bot bypass)
  agentproxy_render   Render JS-heavy pages with real browser (Novada Browser API)
  agentproxy_search   Structured web search via Google/Bing
  agentproxy_session  Sticky session — same IP across requests
  agentproxy_status   Proxy network health check
`);
  process.exit(0);
}

const server = new AgentProxyServer();
server.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
