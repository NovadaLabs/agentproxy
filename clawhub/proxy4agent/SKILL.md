---
name: proxy4agent
description: Residential proxy MCP server for AI agents — 8 tools to fetch, batch, extract, map, search, render through 2M+ real IPs. Bypass Cloudflare/Akamai, geo-target 195+ countries, sticky sessions, response cache.
version: 1.7.1
metadata:
  openclaw:
    requires:
      anyBins: [node, npx]
    primaryEnv: NOVADA_PROXY_USER
    always: false
    homepage: https://github.com/NovadaLabs/proxy4agent
    os: [macos, linux, windows]
    install:
      - kind: node
        formula: bestproxy4agents-mcp@1.7.1
        bins: [bestproxy4agents-mcp]
---

# Proxy4Agents MCP

Residential proxy MCP server for AI agents. Route HTTP requests through 2M+ real home devices to bypass anti-bot systems, geo-target by country or city, maintain sticky sessions, and cache responses to save proxy credits.

**npm:** `bestproxy4agents-mcp` | **GitHub:** [NovadaLabs/proxy4agent](https://github.com/NovadaLabs/proxy4agent)

## Setup

You only need credentials for ONE provider. Novada is the default and recommended provider.

### Novada (recommended)

```bash
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_PROXY_USER=your_username \
  -e NOVADA_PROXY_PASS=your_password \
  -- npx -y bestproxy4agents-mcp
```

Get credentials: [novada.com](https://www.novada.com) → Dashboard → Residential Proxies (free tier, no credit card).

### Any HTTP proxy (BrightData, Smartproxy, Oxylabs, IPRoyal…)

```bash
claude mcp add bestproxy4agents-mcp \
  -e PROXY_URL="http://user:pass@host:port" \
  -- npx -y bestproxy4agents-mcp
```

### BrightData

```bash
claude mcp add bestproxy4agents-mcp \
  -e BRIGHTDATA_USER="brd-customer-abc123-zone-residential" \
  -e BRIGHTDATA_PASS=your_password \
  -- npx -y bestproxy4agents-mcp
```

### Optional credentials

Only set if you need the specific feature:

- `NOVADA_API_KEY` — enables `agentproxy_search` (Google search)
- `NOVADA_BROWSER_WS` — enables `agentproxy_render` (JS rendering via real Chromium)

## When to use which tool

```
Scrape a single URL         → agentproxy_fetch
Need structured fields      → agentproxy_extract
Scrape 2-20 URLs at once    → agentproxy_batch_fetch
Discover URLs on a site     → agentproxy_map → agentproxy_batch_fetch
Login + multi-page flow     → agentproxy_session (same session_id)
Search the web              → agentproxy_search
JS-heavy SPA / blank page   → agentproxy_render
Check proxy health          → agentproxy_status
```

## 8 Tools

### agentproxy_fetch
Fetch any URL through a residential proxy. Returns structured JSON with content, status, and metadata. Responses are cached 300s by default — repeated calls cost zero credits (`meta.cache_hit: true`).

```
agentproxy_fetch(url="https://example.com", country="US", format="markdown")
agentproxy_fetch(url="https://amazon.com/dp/...", country="US", session_id="job001")
```

Parameters: `url` (required), `country`, `city`, `session_id`, `format` (markdown/raw), `timeout` (1-120s)

### agentproxy_batch_fetch
Fetch 2–20 URLs concurrently. Up to 5x faster than sequential calls. Per-item errors are captured individually — the batch succeeds even if some URLs fail. Reuses response cache automatically.

```
agentproxy_batch_fetch(urls=["https://...", "https://..."], concurrency=5, format="markdown")
```

Parameters: `urls` (2-20, required), `concurrency` (1-5, default 3), `country`, `format`, `timeout`

### agentproxy_extract
Extract structured fields from any URL using heuristic pattern matching (meta tags, Open Graph, JSON-LD). Set `render_fallback: true` to auto-retry via real Chromium if the proxy gets blocked.

```
agentproxy_extract(url="https://...", fields=["title", "price", "description", "rating"])
agentproxy_extract(url="https://...", fields=["title", "price"], render_fallback=true)
```

Parameters: `url` (required), `fields` (required array), `render_fallback`, `country`, `timeout`

### agentproxy_map
Crawl a URL and return all internal links as a structured JSON array. Use as the discovery step before `agentproxy_batch_fetch` to crawl an entire site.

```
agentproxy_map(url="https://books.toscrape.com", limit=50)
# → returns 20-50 internal URLs → feed into agentproxy_batch_fetch
```

Parameters: `url` (required), `limit` (10-200, default 50), `include_external`, `country`, `timeout`

### agentproxy_session
Sticky session — same IP across all calls with the same `session_id`. Use for login flows, paginated scraping, price monitoring. Add `verify_sticky: true` to confirm IP consistency before relying on it.

```
agentproxy_session(session_id="job001", url="https://example.com/login")
agentproxy_session(session_id="job001", url="https://example.com/dashboard")
agentproxy_session(session_id="job001", url="https://example.com/data/page/1")
```

Parameters: `session_id` (required), `url` (required), `country`, `city`, `verify_sticky`, `format`, `timeout`

### agentproxy_search
Structured Google search via Novada Scraper API. Returns titles, URLs, and snippets as clean JSON — no HTML parsing.

```
agentproxy_search(query="residential proxy for AI agents", num=5, country="us", language="en")
```

Requires: `NOVADA_API_KEY`

### agentproxy_render [BETA]
Render JavaScript-heavy pages using real Chromium (Novada Browser API). Use for SPAs, React/Vue apps, and pages that return blank with a standard HTTP fetch.

```
agentproxy_render(url="https://react.dev", wait_for=".main-content", format="markdown")
```

Requires: `NOVADA_BROWSER_WS` | ~5 proxy credits per call

### agentproxy_status
Check proxy network connectivity and version. Makes a live proxy call to verify the connection. No credentials required.

## Response cache

All `agentproxy_fetch` and `agentproxy_batch_fetch` calls are cached in-process (default 300s TTL). Repeated fetches within the TTL window cost zero proxy credits.

- `meta.cache_hit: true` = served from cache, no credit used
- `meta.cache_age_seconds` = seconds since cached
- Disable: set `PROXY4AGENT_CACHE_TTL_SECONDS=0`
- Sessions with `session_id` are never cached (sticky routing requires live calls)

## Typed error codes

Every error includes `code`, `recoverable`, and `agent_instruction`:

| Code | Meaning | Action |
|------|---------|--------|
| `BOT_DETECTION_SUSPECTED` | 403 — target blocked | Retry with `agentproxy_render` or different `country` |
| `TLS_ERROR` | TLS/SSL failed | Retry with different `country` |
| `TIMEOUT` | Request timed out | Increase `timeout` or retry |
| `RATE_LIMITED` | HTTP 429 | Wait 5s and retry |
| `NETWORK_ERROR` | DNS failure | Verify URL is correct |
| `INVALID_INPUT` | Bad parameter | Fix parameter and retry |
| `PROVIDER_NOT_CONFIGURED` | Missing env vars | Set credentials and restart |

## Privacy note

All HTTP requests are routed through your chosen proxy provider's residential network. Do not send sensitive internal URLs, API keys, or personally identifiable information through the proxy. Use only for public web content.
