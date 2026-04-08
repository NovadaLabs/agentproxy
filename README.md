# AgentProxy

Agent-to-agent proxy MCP server — fetch any URL through 2M+ residential IPs, bypass anti-bot systems, render JS-heavy pages, geo-target by country or city, maintain sticky sessions.

[![npm](https://img.shields.io/npm/v/agentproxy?label=npm&color=CB3837)](https://npmjs.com/package/agentproxy)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Powered by **[Novada](https://www.novada.com)** — one account, all tools.

## Get Your Credentials

1. Sign up at **[novada.com](https://www.novada.com)** — 30 seconds, no credit card
2. Go to **Dashboard** and grab your credentials for each product you need:
   - **Search** (`NOVADA_API_KEY`): Dashboard → API Keys
   - **Fetch / Session** (`NOVADA_PROXY_USER` + `NOVADA_PROXY_PASS`): Dashboard → Residential Proxies → Endpoint Generator
   - **Render** (`NOVADA_BROWSER_WS`): Dashboard → Browser API → Playground → copy the Puppeteer/Playwright URL

## Install

```bash
claude mcp add agentproxy \
  -e NOVADA_API_KEY=your_key \
  -e NOVADA_PROXY_USER=your_proxy_username \
  -e NOVADA_PROXY_PASS=your_proxy_password \
  -- npx -y agentproxy
```

For the browser render tool, also add `-e NOVADA_BROWSER_WS=wss://USER-zone-browser:PASS@upg-scbr.novada.com`.

## Why AgentProxy

AI agents get blocked on 60–70% of commercial websites with standard HTTP requests. AgentProxy routes through real home devices — Android phones, Windows PCs, Macs — so your agent looks like a real user.

| Problem | AgentProxy |
|---------|-----------|
| Amazon, LinkedIn block your agent | Residential IPs from real devices |
| Cloudflare / Akamai challenges | Bypassed via real device fingerprints |
| JS-rendered pages show blank | Browser API runs real Chromium |
| Geo-restricted content | 195+ countries, city-level targeting |
| Multi-step workflows need same IP | Sticky sessions — same IP across calls |
| Need structured search results | Built-in Google/Bing via Novada |

## Tools

### `agentproxy_fetch`
Fetch any URL through Novada's residential proxy. Works on Amazon, LinkedIn, Cloudflare-protected pages, and most commercial sites.

**Requires:** `NOVADA_PROXY_USER` + `NOVADA_PROXY_PASS`

```
url        — Target URL (required)
country    — 2-letter code: US, DE, JP, GB, BR, ... (195+ countries)
city       — City-level: newyork, london, tokyo, ...
session_id — Reuse same ID to keep the same IP (letters/numbers/underscores only)
format     — "markdown" (default) | "raw"
timeout    — Seconds, 1-120 (default 60)
```

### `agentproxy_render` [BETA]
Render JavaScript-heavy pages using Novada's Browser API (real Chromium). Use this for SPAs, React/Vue apps, and sites that need JS to load content.

**Requires:** `NOVADA_BROWSER_WS` (WebSocket URL from Dashboard → Browser API → Playground)

```
url       — Target URL (required)
format    — "markdown" (default) | "html" | "text"
wait_for  — CSS selector to wait for before extracting (e.g. ".product-title")
timeout   — Seconds, 5-120 (default 60)
```

### `agentproxy_search`
Structured web search via Novada. Returns clean titles, URLs, descriptions — no HTML parsing needed.

**Requires:** `NOVADA_API_KEY`

```
query    — Search query (required)
engine   — google (default) | bing | duckduckgo | yahoo | yandex
num      — Results count, 1-20 (default 10)
country  — Localize results (e.g. us, uk, de)
language — Language code (e.g. en, zh, de)
```

### `agentproxy_session`
Sticky session fetch — every call with the same `session_id` uses the same residential IP. For login flows, paginated scraping, price monitoring.

**Requires:** `NOVADA_PROXY_USER` + `NOVADA_PROXY_PASS`

```
session_id — Unique session ID, no hyphens (required)
url        — Target URL (required)
country    — 2-letter country code
format     — "markdown" | "raw"
timeout    — Seconds, 1-120
```

### `agentproxy_status`
Check Novada's proxy network health — node count, device breakdown, service status.

## Example: Agent Price Monitor

```
# Check Amazon price from US residential IP
agentproxy_fetch(url="https://amazon.com/dp/B0BSHF7WHW", country="US")

# Same product, three markets
agentproxy_fetch(url=..., country="US")
agentproxy_fetch(url=..., country="DE")
agentproxy_fetch(url=..., country="JP")

# Render a JS-heavy real estate page
agentproxy_render(url="https://zillow.com/homes/NYC_rb/", wait_for=".list-card")

# Multi-page scrape with same IP
agentproxy_session(session_id="job001", url="https://example.com/page/1")
agentproxy_session(session_id="job001", url="https://example.com/page/2")  # same IP

# Web search
agentproxy_search(query="AI proxy tools 2024", engine="google", num=5)
```

## Network

| Metric | Value |
|--------|-------|
| Residential IPs | 2,000,000+ |
| Live nodes | 7,500+ |
| Countries | 195+ |
| Device types | Android, Windows, Mac |
| Avg response | < 2s |

## Confirmed Working

✅ Amazon, LinkedIn, Cloudflare, HackerNews, GitHub, Wikipedia, BBC, CNN, Reddit, IMDB, Steam, Goodreads, and 50+ more.

## Known Limitations

- Sites requiring full JS execution (Zillow, BestBuy, Nike) → use `agentproxy_render`
- DuckDuckGo search → intermittently blocks proxy IPs; use Google or Bing
- Session IDs must not contain hyphens (Novada uses `-` as its username parameter delimiter)

## License

MIT — Powered by [Novada](https://www.novada.com)
