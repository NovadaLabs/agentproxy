#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AxiosError } from "axios";
import {
  agentproxyFetch,
  validateFetchParams,
  agentproxySearch,
  validateSearchParams,
  agentproxySession,
  validateSessionParams,
  agentproxyStatus,
} from "./tools/index.js";
import { VERSION } from "./config.js";

// ─── Keys ────────────────────────────────────────────────────────────────────

const NOVADA_API_KEY = process.env.NOVADA_API_KEY;
const PROXY_API_KEY = process.env.PROXY_API_KEY; // IPLoop key for proxy fetch

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "agentproxy_fetch",
    description:
      "Fetch any URL through a residential proxy network (2M+ IPs, 195 countries, anti-bot bypass). Use this when you need raw page content from anti-bot sites (Amazon, LinkedIn, Cloudflare-protected pages). Supports geo-targeting and sticky sessions. Requires PROXY_API_KEY.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "The URL to fetch" },
        country: { type: "string", description: "2-letter country code for geo-targeting (e.g. US, DE, GB, JP)" },
        city: { type: "string", description: "City name for city-level targeting (e.g. newyork, london)" },
        session_id: { type: "string", description: "Reuse this ID across calls to stay on the same IP (sticky session)" },
        asn: { type: "string", description: "ISP/ASN number for targeting a specific network" },
        format: { type: "string", enum: ["raw", "markdown"], default: "markdown", description: "Output format — markdown strips HTML tags for readability" },
        timeout: { type: "number", default: 30, description: "Request timeout in seconds (1-120)" },
      },
      required: ["url"],
    },
  },
  {
    name: "agentproxy_search",
    description:
      "Structured web search (Google, Bing, DuckDuckGo) via Novada's proxy infrastructure. Returns titles, URLs, and descriptions. Best for: finding pages, factual queries, current events. For reading a specific URL, use agentproxy_fetch instead. Requires NOVADA_API_KEY.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "The search query" },
        engine: {
          type: "string",
          enum: ["google", "bing", "duckduckgo", "yahoo", "yandex"],
          default: "google",
          description: "Search engine — google recommended for best relevance",
        },
        num: { type: "number", default: 10, minimum: 1, maximum: 20, description: "Number of results (1-20)" },
        country: { type: "string", description: "Country code for localized results (e.g. us, uk, de)" },
        language: { type: "string", description: "Language code (e.g. en, zh, de)" },
      },
      required: ["query"],
    },
  },
  {
    name: "agentproxy_session",
    description:
      "Fetch a URL with a sticky session — guarantees the same residential IP is used every time you pass the same session_id. Use this for multi-step workflows where IP consistency matters (login flows, paginated scraping, price monitoring). Requires PROXY_API_KEY.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session_id: { type: "string", description: "Unique session identifier — reuse the same ID to keep the same IP" },
        url: { type: "string", description: "The URL to fetch" },
        country: { type: "string", description: "2-letter country code (e.g. US, DE)" },
        format: { type: "string", enum: ["raw", "markdown"], default: "markdown" },
        timeout: { type: "number", default: 30, description: "Timeout in seconds (1-120)" },
      },
      required: ["session_id", "url"],
    },
  },
  {
    name: "agentproxy_status",
    description:
      "Check the proxy network health — returns number of online nodes, device breakdown, and service status. Use this to verify the proxy network is available before starting a scraping workflow.",
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
            if (!PROXY_API_KEY) {
              return this.keyError("PROXY_API_KEY", "agentproxy_fetch");
            }
            result = await agentproxyFetch(validateFetchParams(raw), PROXY_API_KEY);
            break;
          }
          case "agentproxy_search": {
            if (!NOVADA_API_KEY) {
              return this.keyError("NOVADA_API_KEY", "agentproxy_search");
            }
            result = await agentproxySearch(validateSearchParams(raw), NOVADA_API_KEY);
            break;
          }
          case "agentproxy_session": {
            if (!PROXY_API_KEY) {
              return this.keyError("PROXY_API_KEY", "agentproxy_session");
            }
            result = await agentproxySession(validateSessionParams(raw), PROXY_API_KEY);
            break;
          }
          case "agentproxy_status": {
            result = await agentproxyStatus();
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
        const message =
          error instanceof AxiosError
            ? `HTTP ${error.response?.status || "error"}: ${error.response?.data?.msg || error.message}`
            : error instanceof Error
              ? error.message
              : String(error);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    });
  }

  private keyError(envVar: string, tool: string) {
    return {
      content: [{
        type: "text" as const,
        text: `Error: ${envVar} is not set. ${tool} requires it.\nGet your key and add it:\n  claude mcp add agentproxy -e ${envVar}=your_key -- npx -y agentproxy`,
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
  console.log(`agentproxy v${VERSION} — Agent-to-agent proxy MCP server

Usage:
  npx agentproxy              Start the MCP server (stdio transport)
  npx agentproxy --list-tools Show available tools
  npx agentproxy --help       Show this help

Environment:
  PROXY_API_KEY   Residential proxy API key (for fetch/session tools)
  NOVADA_API_KEY  Novada Scraper API key (for search tool)

Connect to Claude Code:
  claude mcp add agentproxy \\
    -e PROXY_API_KEY=your_proxy_key \\
    -e NOVADA_API_KEY=your_novada_key \\
    -- npx -y agentproxy

Tools:
  agentproxy_fetch    Fetch any URL through residential proxy (geo, anti-bot)
  agentproxy_search   Structured web search via Novada
  agentproxy_session  Sticky session fetch (same IP across requests)
  agentproxy_status   Proxy network health check
`);
  process.exit(0);
}

const server = new AgentProxyServer();
server.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
