# AgentProxy

Residential proxy MCP server for AI agents — fetch any URL through 2M+ residential IPs, bypass anti-bot systems, geo-target by country or city, maintain sticky sessions across requests.

[![npm](https://img.shields.io/npm/v/agentproxy?label=npm&color=CB3837)](https://npmjs.com/package/agentproxy)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Built for **agent-to-agent** workflows: your AI agent calls AgentProxy tools to access the web — no human in the loop.

## Why AgentProxy

Without a proxy, AI agents get blocked by 60-70% of commercial websites. AgentProxy routes requests through real Android, Windows, and Mac devices — the same IPs your target sites see from real home users.

| Problem | AgentProxy |
|---------|-----------|
| Amazon, LinkedIn block your agent | Residential IPs — looks like a real user |
| Cloudflare / Akamai challenges | Bypass via real device fingerprints |
| Geo-restricted content | 195+ countries, city-level targeting |
| Multi-step workflows need same IP | Sticky sessions — same IP across requests |
| Need structured search results | Built-in Google/Bing web search via Novada |

## Install

```bash
# Add to Claude Code (60 seconds)
claude mcp add agentproxy \
  -e PROXY_API_KEY=your_proxy_key \
  -e NOVADA_API_KEY=your_novada_key \
  -- npx -y agentproxy
```

Get your API keys at **[novada.com](https://www.novada.com)** or contact Novada for enterprise access.

## Tools

### `agentproxy_fetch`
Fetch any URL through a residential proxy.

```
url        — Target URL (required)
country    — 2-letter ISO code: US, DE, JP, GB, BR, ... (195+ countries)
city       — City-level: newyork, london, tokyo, ...
session_id — Reuse same ID to keep the same IP (sticky session)
asn        — Target specific ISP/ASN
format     — "markdown" (default, strips HTML) or "raw"
timeout    — Seconds, 1-120 (default 60)
```

### `agentproxy_search`
Structured web search via Novada.

```
query    — Search query (required)
engine   — google (default) | bing | duckduckgo | yahoo | yandex
num      — Results count, 1-20 (default 10)
country  — Localize results (e.g. us, uk, de)
language — Language code (e.g. en, zh, de)
```

### `agentproxy_session`
Fetch a URL with a guaranteed sticky IP — every call with the same `session_id` hits the same residential IP.

```
session_id — Unique ID for this session (required)
url        — Target URL (required)
country    — Country for initial IP selection
format     — "markdown" or "raw"
timeout    — Seconds, 1-120
```

### `agentproxy_status`
Check the proxy network health — node count, device types, service status.

## Quick Start

```bash
# Install and run MCP server
npx agentproxy --help

# List tools
npx agentproxy --list-tools
```

## Example Agent Usage

Your agent needs current data from Amazon:
```
Tool: agentproxy_fetch
url: https://www.amazon.com/dp/B0BSHF7WHW
country: US
format: markdown
```

Your agent monitors prices across 3 countries:
```
agentproxy_fetch(url, country="US")
agentproxy_fetch(url, country="DE")
agentproxy_fetch(url, country="JP")
```

Your agent needs consistent IP for a login flow:
```
agentproxy_session(session_id="checkout-flow-001", url=..., country="US")
agentproxy_session(session_id="checkout-flow-001", url=..., country="US")  // same IP
```

## Network Stats

| Metric | Value |
|--------|-------|
| Residential IP pool | 2,000,000+ |
| Live nodes | 7,500+ |
| Countries | 195+ |
| Device types | Android, Windows, Mac |
| Avg response | < 2s |

## Known Limitations

Some sites require JavaScript rendering beyond what residential proxies alone provide:
- Zillow, BestBuy, Nike — need browser-level JS execution
- DuckDuckGo search — intermittently blocks proxy IPs (use Google or Bing instead)

Novada's Browser API (coming soon) will handle JavaScript-rendered pages.

## Tested Sites

✅ Confirmed working: Amazon, LinkedIn, Cloudflare (nowsecure.nl), HackerNews, GitHub, Wikipedia, BBC, CNN, Reddit, IMDB, Steam, and 50+ more.

## License

MIT — Powered by [Novada](https://www.novada.com)
