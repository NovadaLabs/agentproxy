<h1 align="center">Proxy4Agents MCP</h1>

<p align="center"><strong>The agent-first residential proxy MCP — works with any provider.</strong></p>

<p align="center">
Route any HTTP request through 2M+ real home devices — Android phones, Windows PCs, Macs — to bypass anti-bot systems, geo-target by country or city, and maintain sticky sessions across multi-step workflows. Powered by <a href="https://www.novada.com">Novada</a>.
</p>

<p align="center">
  <a href="https://npmjs.com/package/bestproxy4agents-mcp"><img src="https://img.shields.io/npm/v/bestproxy4agents-mcp?label=npm&color=CB3837&style=flat-square" alt="npm version"></a>
  <a href="https://npmjs.com/package/bestproxy4agents-mcp"><img src="https://img.shields.io/npm/dw/bestproxy4agents-mcp?label=downloads&color=blue&style=flat-square" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License: MIT"></a>
  <a href="https://github.com/NovadaLabs/proxy4agent/actions"><img src="https://github.com/NovadaLabs/proxy4agent/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square" alt="Node.js"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/tools-8-orange?style=flat-square" alt="8 tools">
  <img src="https://img.shields.io/badge/prompts-5-blue?style=flat-square" alt="5 prompts">
  <img src="https://img.shields.io/badge/resources-5-green?style=flat-square" alt="5 resources">
  <img src="https://img.shields.io/badge/tests-241-brightgreen?style=flat-square" alt="241 tests">
  <img src="https://img.shields.io/badge/providers-5-purple?style=flat-square" alt="5 providers">
</p>

<p align="center">
  <a href="https://lobehub.com/mcp/novadalabs-proxy4agent"><img src="https://lobehub.com/badge/mcp/novadalabs-proxy4agent" alt="LobeHub"></a>
  <a href="https://smithery.ai/server/proxy4agent"><img src="https://smithery.ai/badge/proxy4agent" alt="Smithery"></a>
  <a href="https://mcp.run"><img src="https://img.shields.io/badge/MCP-Registry-blueviolet?style=flat-square" alt="MCP Registry"></a>
</p>

<p align="center">
  <a href="#proxy4agents-mcp"><img src="https://img.shields.io/badge/lang-English-blue?style=flat-square" alt="English"></a>
  <a href="#proxy4agents-mcp中文文档"><img src="https://img.shields.io/badge/lang-中文文档-red?style=flat-square" alt="中文文档"></a>
</p>

<p align="center">
  <a href="#why-proxy4agents-mcp">Why</a> &middot;
  <a href="#quick-install">Install</a> &middot;
  <a href="#8-tools-at-a-glance">Tools</a> &middot;
  <a href="#5-prompts">Prompts</a> &middot;
  <a href="#5-resources">Resources</a> &middot;
  <a href="#providers">Providers</a> &middot;
  <a href="#agent-first-design">Agent-First</a>
</p>

---

Works with **Claude Code**, **Cursor**, **Windsurf**, **Cline**, **Continue**, and any MCP-compatible AI agent.

> [!TIP]
> **Free tier available** — sign up at [novada.com](https://www.novada.com), no credit card required. Get free access to Scraper API, Web Unblocker, and residential proxies to start building immediately.

---

## Why Proxy4Agents MCP

AI agents get blocked on 60–70% of commercial websites. Standard HTTP requests are detected and rejected by Cloudflare, Akamai, DataDome, and PerimeterX. Proxy4Agents MCP routes your agent through real residential IPs — indistinguishable from a human browser.

| Problem | Solution |
|---------|----------|
| Amazon, LinkedIn, Cloudflare block your agent | 2M+ residential IPs from real home devices |
| Bot challenges return 403 / CAPTCHA | Real device fingerprints bypass detection |
| JS-rendered pages return blank content | `agentproxy_render` runs real Chromium |
| Geo-restricted or localized content | 195+ countries, city-level targeting |
| Multi-step workflows need the same IP | Sticky sessions — consistent IP across calls |
| Scraping 10+ URLs wastes time | `agentproxy_batch_fetch` — concurrent, parallel |
| Need structured fields, not raw HTML | `agentproxy_extract` — title, price, rating, etc. |
| Finding URLs before scraping | `agentproxy_map` — discover all internal links |
| Need clean search results | `agentproxy_search` — Google results as JSON |

---

## 8 Tools at a Glance

| Tool | What It Does | Requires |
|------|-------------|---------|
| `agentproxy_fetch` | Fetch any URL through residential proxy | Proxy credentials |
| `agentproxy_batch_fetch` | Fetch 2–20 URLs concurrently (up to 5x parallel) | Proxy credentials |
| `agentproxy_extract` | Extract structured fields (title, price, rating...) from any URL | Proxy credentials |
| `agentproxy_map` | Crawl a URL and return all internal links as JSON array | Proxy credentials |
| `agentproxy_session` | Sticky session — same IP across every call | Proxy credentials |
| `agentproxy_search` | Google search -> structured JSON (title, url, snippet) | `NOVADA_API_KEY` |
| `agentproxy_render` | Render JS-heavy pages with real Chromium [BETA] | `NOVADA_BROWSER_WS` |
| `agentproxy_status` | Check proxy network health + version | _(none)_ |

---

## When To Use Which Tool

```
Goal: "Scrape a single URL"
  └─ Static HTML page?          → agentproxy_fetch
  └─ Need specific fields?      → agentproxy_extract
  └─ React/Vue SPA / blank page? → agentproxy_render

Goal: "Scrape multiple URLs"
  └─ You have the URLs already  → agentproxy_batch_fetch
  └─ You need to discover URLs  → agentproxy_map → agentproxy_batch_fetch

Goal: "Search the web"          → agentproxy_search → agentproxy_batch_fetch

Goal: "Login + multi-page flow" → agentproxy_session (same session_id)

Goal: "Check if proxy works"    → agentproxy_status
```

---

## 5 Prompts

Pre-built agent workflows that chain multiple tools together. Call these from any MCP client to execute common patterns in one step.

| Prompt | Description | Key Arguments |
|--------|-------------|---------------|
| `fetch_url` | Fetch a URL through residential proxy with anti-bot bypass | `url`, `country`, `format` |
| `research_topic` | Search + batch read workflow — find and read top pages on a topic | `query`, `num_results`, `country` |
| `extract_product` | Extract structured product data from any e-commerce URL | `url`, `fields` |
| `crawl_site` | Discover all pages on a site, then fetch them in parallel | `url`, `limit`, `country` |
| `troubleshoot` | Step-by-step proxy diagnosis when things go wrong | `error_message` |

> [!NOTE]
> Prompts orchestrate multi-tool workflows automatically. For example, `research_topic` runs `agentproxy_search` then `agentproxy_batch_fetch` in sequence — the agent doesn't need to figure out the pipeline.

---

## 5 Resources

Always-accessible reference data that agents can read at any time, without making proxy calls.

| Resource URI | Description |
|-------------|-------------|
| `proxy://countries` | Complete list of 195+ country codes with city-level targeting |
| `proxy://error-codes` | All typed error codes with recovery instructions |
| `proxy://workflows` | Common agent workflow patterns (crawl, research, monitoring) |
| `proxy://supported-fields` | All fields `agentproxy_extract` can extract with strategies |
| `proxy://cost-guide` | Credits per tool, caching behavior, cost optimization tips |

---

## Quick Install

**Core — fetch any URL through residential proxy:**
```bash
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_PROXY_USER=your_username \
  -e NOVADA_PROXY_PASS=your_password \
  -- npx -y bestproxy4agents-mcp
```

**Search only:**
```bash
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_API_KEY=your_key \
  -- npx -y bestproxy4agents-mcp
```

**All tools (proxy + search + browser render):**
```bash
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_PROXY_USER=your_username \
  -e NOVADA_PROXY_PASS=your_password \
  -e NOVADA_API_KEY=your_key \
  -e NOVADA_BROWSER_WS=your_browser_ws_url \
  -- npx -y bestproxy4agents-mcp
```

**Cursor / Windsurf / Cline — add to MCP config:**
```json
{
  "mcpServers": {
    "bestproxy4agents-mcp": {
      "command": "npx",
      "args": ["-y", "bestproxy4agents-mcp"],
      "env": {
        "NOVADA_PROXY_USER": "your_username",
        "NOVADA_PROXY_PASS": "your_password"
      }
    }
  }
}
```

Get credentials: **[novada.com](https://www.novada.com)** -> Dashboard -> Residential Proxies -> Endpoint Generator

---

## Providers

Proxy4Agents MCP works with **any HTTP proxy provider**. Novada is the built-in default with the deepest integration.

**Priority:** Novada -> BrightData -> Smartproxy -> Oxylabs -> Generic. First configured provider wins.

| Feature | Novada | BrightData | Smartproxy | Oxylabs | Generic HTTP |
|---------|--------|------------|------------|---------|-------------|
| Auto country targeting | ✓ | ✓ | ✓ | ✓ | manual |
| Auto city targeting | ✓ | ✓ | ✓ | ✓ | manual |
| Sticky sessions | ✓ | ✓ | ✓ | ✓ | manual |
| Built-in search API | ✓ | — | — | — | — |
| Browser API (JS render) | ✓ | — | — | — | — |

<details>
<summary>BrightData setup</summary>

```bash
claude mcp add bestproxy4agents-mcp \
  -e BRIGHTDATA_USER="brd-customer-abc123-zone-residential" \
  -e BRIGHTDATA_PASS=your_password \
  -- npx -y bestproxy4agents-mcp
```
`BRIGHTDATA_USER` is your full username including zone. Optional: `BRIGHTDATA_HOST`, `BRIGHTDATA_PORT` (default `zproxy.lum-superproxy.io:22225`).
</details>

<details>
<summary>Smartproxy setup</summary>

```bash
claude mcp add bestproxy4agents-mcp \
  -e SMARTPROXY_USER=your_username \
  -e SMARTPROXY_PASS=your_password \
  -- npx -y bestproxy4agents-mcp
```
Optional: `SMARTPROXY_HOST`, `SMARTPROXY_PORT` (default `gate.smartproxy.com:10001`).
</details>

<details>
<summary>Oxylabs setup</summary>

```bash
claude mcp add bestproxy4agents-mcp \
  -e OXYLABS_USER=your_username \
  -e OXYLABS_PASS=your_password \
  -- npx -y bestproxy4agents-mcp
```
Optional: `OXYLABS_HOST`, `OXYLABS_PORT` (default `pr.oxylabs.io:7777`).
</details>

<details>
<summary>Generic HTTP proxy (IPRoyal, any provider)</summary>

```bash
claude mcp add bestproxy4agents-mcp \
  -e PROXY_URL="http://username:password@geo.iproyal.com:12321" \
  -- npx -y bestproxy4agents-mcp
```
`country`, `city`, `session_id` params are ignored with Generic — encode targeting directly in your proxy URL.
</details>

---

## Agent-First Design

> [!NOTE]
> Proxy4Agents is the only proxy MCP designed specifically for autonomous AI agents. Every response, error, and description is optimized for machine consumption.

| Feature | What It Means |
|---------|--------------|
| `agent_instruction` in errors | Every error tells the agent exactly what to do next |
| Decision trees in descriptions | WHEN TO USE / USE INSTEAD guides in every tool |
| `cache_hit` metadata | Agent knows when 0 credits were used (cached response) |
| `credits_estimated` per call | Cost tracking built into every response |
| Typed error codes | Machine-readable: `BOT_DETECTION_SUSPECTED`, `PAGE_NOT_FOUND`, etc. |
| 5 workflow prompts | Pre-built agent workflows: research, crawl, extract, diagnose |
| 5 reference resources | Countries, error codes, cost guide — always accessible |

---

## Tools

### `agentproxy_fetch`
Fetch any URL through a residential proxy. Returns structured JSON with content, status code, and metadata. Auto-retry on network errors. Caches repeated calls (default 300s TTL — `meta.cache_hit: true` means no proxy credit used).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Target URL (`http://` or `https://`) |
| `country` | string | — | 2-letter ISO code: `US`, `DE`, `JP`, `GB`, `BR`... (195+ options) |
| `city` | string | — | City: `newyork`, `london`, `tokyo`, `paris`, `berlin`... |
| `session_id` | string | — | Reuse same ID for same IP across calls (no hyphens, max 64 chars) |
| `format` | string | `markdown` | `markdown` strips HTML / `raw` returns full HTML |
| `timeout` | number | `60` | Timeout in seconds (1–120) |

**Response:**
```json
{
  "ok": true,
  "tool": "agentproxy_fetch",
  "data": { "url": "...", "status_code": 200, "content": "...", "size_bytes": 34000 },
  "meta": { "latency_ms": 1800, "cache_hit": false, "quota": { "credits_estimated": 1 } }
}
```

---

### `agentproxy_batch_fetch`
Fetch 2–20 URLs concurrently through residential proxy. Up to 5x faster than sequential fetches. Per-URL errors are captured individually — the batch itself succeeds even if some URLs fail. Reuses response cache for URLs already fetched.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `urls` | string[] | required | 2–20 URLs to fetch |
| `concurrency` | number | `3` | Parallel requests (1–5) |
| `country` | string | — | Same country for all URLs |
| `format` | string | `markdown` | `markdown` or `raw` |
| `timeout` | number | `60` | Per-URL timeout in seconds |

**Response:**
```json
{
  "ok": true,
  "tool": "agentproxy_batch_fetch",
  "data": {
    "requested": 3,
    "succeeded": 3,
    "failed": 0,
    "results": [
      { "url": "https://...", "ok": true, "content": "...", "cache_hit": false, "latency_ms": 1200 },
      { "url": "https://...", "ok": true, "content": "...", "cache_hit": true,  "latency_ms": 0 },
      { "url": "https://...", "ok": false, "error": { "code": "TLS_ERROR", "message": "..." } }
    ]
  },
  "meta": { "latency_ms": 4100, "quota": { "credits_estimated": 3 } }
}
```

---

### `agentproxy_extract`
Extract structured fields from any URL using heuristic pattern matching (meta tags, Open Graph, JSON-LD, Schema.org). Lightweight — no LLM needed. Set `render_fallback: true` to automatically retry via real Chromium if the proxy fetch fails.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Target URL |
| `fields` | string[] | required | Fields to extract: `title`, `price`, `description`, `rating`, `image`, `author`, `date`... |
| `render_fallback` | boolean | `false` | Auto-retry via `agentproxy_render` on TLS/bot block |
| `country` | string | — | Geo-target the fetch |
| `timeout` | number | `60` | Timeout in seconds |

**Response:**
```json
{
  "ok": true,
  "tool": "agentproxy_extract",
  "data": {
    "url": "https://books.toscrape.com/...",
    "fields": { "title": "A Light in the Attic", "price": "£51.77", "description": null },
    "extracted_via": "proxy_fetch"
  },
  "meta": { "latency_ms": 2100, "quota": { "credits_estimated": 1 } }
}
```

---

### `agentproxy_map`
Crawl a URL and return all internal links as a structured JSON array. Use as the discovery step before `agentproxy_batch_fetch` to crawl an entire site without guessing URLs.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Starting URL to crawl |
| `limit` | number | `50` | Max URLs to return (10–200) |
| `include_external` | boolean | `false` | Include off-domain links |
| `country` | string | — | Geo-target the fetch |
| `timeout` | number | `60` | Timeout in seconds |

**Response:**
```json
{
  "ok": true,
  "tool": "agentproxy_map",
  "data": {
    "domain": "books.toscrape.com",
    "internal_url_count": 20,
    "internal_urls": ["https://books.toscrape.com/catalogue/...", "..."],
    "sitemap_hint": "https://books.toscrape.com/sitemap.xml (check manually)"
  },
  "meta": { "latency_ms": 3800, "quota": { "credits_estimated": 1 } }
}
```

---

### `agentproxy_session`
Sticky session fetch — every call with the same `session_id` uses the same residential IP. Essential for login flows, paginated scraping, and price monitoring. Supports `verify_sticky: true` to confirm IP consistency before relying on it.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `session_id` | string | required | Unique ID — reuse to keep same IP (no hyphens, max 64 chars) |
| `url` | string | required | Target URL |
| `country` | string | — | 2-letter country code |
| `city` | string | — | City-level targeting |
| `verify_sticky` | boolean | `false` | Make 3 proxy calls to confirm IP consistency (adds ~15–25s) |
| `format` | string | `markdown` | `markdown` or `raw` |
| `timeout` | number | `60` | Timeout in seconds |

---

### `agentproxy_search`
Structured Google search via Novada Scraper API. Returns titles, URLs, and snippets as clean JSON — no HTML parsing needed.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Search query |
| `num` | number | `10` | Results (1–20) |
| `country` | string | — | Localize: `us`, `uk`, `de`, `jp`... |
| `language` | string | — | Language: `en`, `zh`, `de`, `ja`... |

---

### `agentproxy_render` [BETA]
Render JavaScript-heavy pages using Novada's Browser API (real Chromium, full JS execution). Use for SPAs, React/Vue apps, and pages that return blank with a standard HTTP fetch.

**Requires:** `NOVADA_BROWSER_WS` — copy the Puppeteer URL from Dashboard -> Browser API -> Playground

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Target URL |
| `format` | string | `markdown` | `markdown` / `html` / `text` |
| `wait_for` | string | — | CSS selector to wait for before extracting (e.g. `.product-title`) |
| `timeout` | number | `60` | Timeout in seconds (5–120) |

> Costs ~5 proxy credits per call vs 1 for `agentproxy_fetch`. Use `agentproxy_extract` with `render_fallback: true` for automatic escalation when needed.

---

### `agentproxy_status`
Check proxy network connectivity and version. Makes a live proxy call to verify the connection is working. No credentials required.

---

## Agent Workflows

### Site crawl pipeline (map -> batch)
```
# Agent task: "Read all products on this catalogue"
1. agentproxy_map(url="https://books.toscrape.com", limit=50)
   → returns 20–50 internal URLs in 4s, 1 credit

2. agentproxy_batch_fetch(urls=[...20 URLs], concurrency=5)
   → fetches all 20 pages in parallel, ~4s wall time, 20 credits
   (vs ~60s sequential = 15x speedup)
```

### Research pipeline (search -> batch)
```
# Agent task: "Find and read top 5 pages about X"
1. agentproxy_search(query="residential proxy MCP", num=5)
   → structured JSON: titles, URLs, snippets

2. agentproxy_batch_fetch(urls=[...5 URLs], format="markdown")
   → full content of all 5 pages in parallel
```

### Sticky session — login + multi-page scrape
```
# Same IP across all calls
agentproxy_session(session_id="job_001", url="https://example.com/login")
agentproxy_session(session_id="job_001", url="https://example.com/dashboard")
agentproxy_session(session_id="job_001", url="https://example.com/data/page/1")
agentproxy_session(session_id="job_001", url="https://example.com/data/page/2")
```

### Price monitoring — same product, three markets
```
agentproxy_fetch(url="https://amazon.com/dp/B0BSHF7WHW", country="US")
agentproxy_fetch(url="https://amazon.com/dp/B0BSHF7WHW", country="DE")
agentproxy_fetch(url="https://amazon.com/dp/B0BSHF7WHW", country="JP")
# Second call per URL is a cache hit (0ms, 0 credits) if within 300s TTL
```

### Extract structured data
```
# Agent task: "Get product details without parsing HTML"
agentproxy_extract(
  url="https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  fields=["title", "price", "description", "rating"],
  render_fallback=true  # auto-retry via Chromium if proxy gets blocked
)
```

---

## Response Cache

All `agentproxy_fetch` and `agentproxy_batch_fetch` calls are cached in-process. Repeated fetches to the same URL within the TTL window consume **zero proxy credits**.

| Behavior | Detail |
|----------|--------|
| Default TTL | 300 seconds (5 minutes) |
| Cache key | `url + format + country` |
| Session bypass | `session_id` present -> never cached (sticky routing requires live calls) |
| Disable | Set `PROXY4AGENT_CACHE_TTL_SECONDS=0` |
| Max entries | 200 (oldest evicted when full) |

**Reading cache status from response:**
```json
"meta": {
  "cache_hit": true,          // served from cache — no proxy credit used
  "cache_age_seconds": 12,    // seconds since the entry was stored
  "latency_ms": 0             // ~0ms for cache hits
}
```

---

## Typed Error Codes

Every error response includes a typed `error.code`, `recoverable` flag, and `agent_instruction` with the correct next step. Agents never need to parse error messages.

| Code | Meaning | Recoverable | Agent Action |
|------|---------|-------------|--------------|
| `BOT_DETECTION_SUSPECTED` | HTTP 4xx — target blocked the request | ✓ | Retry with `agentproxy_render` or different `country` |
| `TLS_ERROR` | TLS/SSL connection failed through proxy | ✓ | Retry with a different `country` parameter |
| `TIMEOUT` | Request exceeded timeout limit | ✓ | Increase `timeout` or retry |
| `RATE_LIMITED` | HTTP 429 — too many requests | ✓ | Wait 5s and retry |
| `NETWORK_ERROR` | DNS failure — hostname not found | ✗ | Verify the URL is correct |
| `SESSION_STICKINESS_FAILED` | Same IP not maintained | ✓ | Retry `verify_sticky: true` to confirm |
| `INVALID_INPUT` | Bad parameter value | ✗ | Fix the parameter and retry |
| `PROVIDER_NOT_CONFIGURED` | Missing env vars | ✗ | Set credentials and restart MCP |
| `UNKNOWN_ERROR` | Unexpected error | ✓ | Check `agentproxy_status`, retry |

**Error response format:**
```json
{
  "ok": false,
  "error": {
    "code": "BOT_DETECTION_SUSPECTED",
    "message": "HTTP 403 — request blocked by target",
    "recoverable": true,
    "agent_instruction": "Try agentproxy_render (real browser). Or retry with a different country/session_id."
  }
}
```

---

## Geo Coverage

**195+ countries** including:

`US` `GB` `DE` `FR` `JP` `CA` `AU` `BR` `IN` `KR` `SG` `NL` `IT` `ES` `MX` `RU` `PL` `SE` `NO` `DK` `FI` `CH` `AT` `BE` `PT` `CZ` `HU` `RO` `UA` `TR` `IL` `ZA` `NG` `EG` `AR` `CL` `CO` `PE` `VN` `TH` `ID` `MY` `PH` `TW` `HK` `NZ` + [148 more](https://www.novada.com)

**City-level targeting:** `newyork` · `losangeles` · `chicago` · `london` · `paris` · `berlin` · `tokyo` · `seoul` · `sydney` · `toronto` · `singapore` · `dubai` · `mumbai` · `saopaulo`

---

## Compatible With

| Client | Install method |
|--------|---------------|
| **Claude Code** | `claude mcp add bestproxy4agents-mcp -e ... -- npx -y bestproxy4agents-mcp` |
| **Cursor** | Settings -> MCP -> Add server -> `npx -y bestproxy4agents-mcp` |
| **Windsurf** | MCP config -> `npx -y bestproxy4agents-mcp` |
| **Cline** | MCP settings -> command: `npx`, args: `["-y", "bestproxy4agents-mcp"]` |
| **Continue** | `.continue/config.json` -> mcpServers |
| **Smithery** | [smithery.ai/server/proxy4agent](https://smithery.ai/server/proxy4agent) |
| **Any MCP client** | stdio transport / `npx -y bestproxy4agents-mcp` |

---

## Network

| Metric | Value |
|--------|-------|
| Residential IPs | 2,000,000+ |
| Live nodes | 7,000+ |
| Countries | 195+ |
| Device types | Android, Windows, Mac |
| Uptime | 99.9% |

---

## Confirmed Working

**E-commerce:** Amazon, eBay, Walmart, Etsy, Shopify stores  
**Professional:** LinkedIn  
**Anti-bot protected:** Cloudflare, Akamai, DataDome  
**News & content:** HackerNews, Reddit, BBC, CNN, NYTimes  
**Tech:** GitHub, Wikipedia, Stack Overflow, IMDB

---

## Known Limitations

- Sites requiring full JS execution -> use `agentproxy_render`
- `agentproxy_render` requires `NOVADA_BROWSER_WS` (separate Novada Browser API subscription)
- Session IDs must not contain hyphens (Novada uses `-` as its auth delimiter)
- Sticky sessions are best-effort infrastructure — use `verify_sticky: true` to confirm before relying on them
- API-protected sites (ip-api.com, similar) block proxy IP ranges — `agentproxy_render` may help

---

## Feedback & Support

- **Email:** [tong.wu@novada.com](mailto:tong.wu@novada.com)
- **GitHub Issues:** [github.com/NovadaLabs/proxy4agent/issues](https://github.com/NovadaLabs/proxy4agent/issues)
- **Website:** [novada.com](https://www.novada.com)

---

## License

MIT © [Novada](https://www.novada.com) — see [LICENSE](LICENSE)

---

---

# Proxy4Agents MCP（中文文档）

<p align="center"><strong>AI 智能体专属住宅代理 MCP — 支持任意供应商。</strong></p>

<p align="center">
通过 200 万+ 真实家庭设备（Android 手机、Windows 电脑、Mac）路由 HTTP 请求，绕过反机器人系统，按国家/城市精准定位，跨请求保持同一 IP。
</p>

<p align="center">
  <a href="#proxy4agents-mcp"><img src="https://img.shields.io/badge/lang-English-blue?style=flat-square" alt="返回英文"></a>
  <img src="https://img.shields.io/badge/工具-8个-orange?style=flat-square" alt="8 个工具">
  <img src="https://img.shields.io/badge/提示词-5个-blue?style=flat-square" alt="5 个提示词">
  <img src="https://img.shields.io/badge/资源-5个-green?style=flat-square" alt="5 个资源">
  <img src="https://img.shields.io/badge/测试-241个-brightgreen?style=flat-square" alt="241 个测试">
</p>

<p align="center">
  <a href="#8-个工具">工具</a> &middot;
  <a href="#5-个提示词">提示词</a> &middot;
  <a href="#5-个资源">资源</a> &middot;
  <a href="#快速安装">安装</a> &middot;
  <a href="#智能体优先设计">智能体优先</a> &middot;
  <a href="#多供应商支持">供应商</a>
</p>

---

支持 **Claude Code**、**Cursor**、**Windsurf**、**Cline**、**Continue** 及所有 MCP 兼容智能体。由 **[Novada](https://www.novada.com)** 提供支持。

> [!TIP]
> **免费套餐** — 在 [novada.com](https://www.novada.com) 注册，无需信用卡。免费使用 Scraper API、Web Unblocker 和住宅代理。

---

## 8 个工具

```
agentproxy_fetch       → 通过住宅代理抓取任意 URL
agentproxy_batch_fetch → 并发抓取 2-20 个 URL（最高 5 倍加速）
agentproxy_extract     → 从页面提取结构化字段（标题、价格、评分…）
agentproxy_map         → 爬取页面，返回所有内部链接 JSON 数组
agentproxy_session     → 粘性会话 — 同一 session_id 始终同一 IP
agentproxy_search      → Google 搜索，返回结构化 JSON（无需解析 HTML）
agentproxy_render      → 真实 Chromium 渲染 JS 页面 [BETA]
agentproxy_status      → 检查代理网络健康状态
```

---

## 5 个提示词

预构建的智能体工作流，将多个工具链式组合。

| 提示词 | 描述 | 主要参数 |
|--------|------|---------|
| `fetch_url` | 通过住宅代理抓取 URL，自动绕过反机器人 | `url`, `country`, `format` |
| `research_topic` | 搜索 + 批量阅读工作流 — 搜索主题并阅读排名靠前的页面 | `query`, `num_results`, `country` |
| `extract_product` | 从任意电商 URL 提取结构化产品数据 | `url`, `fields` |
| `crawl_site` | 发现站点所有页面，然后并行抓取 | `url`, `limit`, `country` |
| `troubleshoot` | 代理故障逐步诊断 | `error_message` |

---

## 5 个资源

智能体可随时读取的参考数据，无需消耗代理额度。

| 资源 URI | 描述 |
|----------|------|
| `proxy://countries` | 195+ 国家代码完整列表，含城市级定位 |
| `proxy://error-codes` | 所有类型化错误码及恢复指令 |
| `proxy://workflows` | 常用智能体工作流模式（爬取、研究、监控） |
| `proxy://supported-fields` | `agentproxy_extract` 支持的所有提取字段及策略 |
| `proxy://cost-guide` | 每个工具的额度消耗、缓存行为、成本优化技巧 |

---

## 工具选择决策树

```
目标：抓取单个 URL
  ├─ 静态 HTML 页面？            → agentproxy_fetch
  ├─ 需要特定字段（价格/标题）？  → agentproxy_extract
  └─ React/Vue SPA / 内容为空？  → agentproxy_render

目标：批量抓取多个 URL
  ├─ 已有 URL 列表？             → agentproxy_batch_fetch
  └─ 需要先发现 URL？            → agentproxy_map → agentproxy_batch_fetch

目标：网页搜索                   → agentproxy_search → agentproxy_batch_fetch

目标：登录 + 多步骤流程           → agentproxy_session（相同 session_id）

目标：验证代理是否正常工作        → agentproxy_status
```

---

## 三大流水线模式

### 全站爬取流水线（推荐）

```
agentproxy_map(url, limit=50)
        │
        ▼
  返回 20-50 个内部链接（1 credit，4 秒）
        │
        ▼
agentproxy_batch_fetch(urls, concurrency=5)
        │
        ▼
  并发抓取所有页面（N credits，~4 秒，比串行快 15x）
```

### 搜索研究流水线

```
agentproxy_search(query, num=10)
        │
        ▼
  结构化 JSON：标题 + URL + 摘要
        │
        ▼
agentproxy_batch_fetch(urls, format="markdown")
        │
        ▼
  全部页面内容并行返回
```

### 粘性会话 — 登录 + 多页抓取

```
session_id = "job_001"

agentproxy_session(session_id, url="/login")    → 同一 IP
agentproxy_session(session_id, url="/dashboard") → 同一 IP
agentproxy_session(session_id, url="/data/1")    → 同一 IP
agentproxy_session(session_id, url="/data/2")    → 同一 IP
```

---

## 智能体优先设计

> [!NOTE]
> Proxy4Agents 是唯一专为自主 AI 智能体设计的代理 MCP。每个响应、错误和描述都为机器消费而优化。

| 特性 | 含义 |
|------|------|
| 错误中的 `agent_instruction` | 每个错误都告诉智能体下一步该做什么 |
| 描述中的决策树 | 每个工具都有 WHEN TO USE / USE INSTEAD 指引 |
| `cache_hit` 元数据 | 智能体知道是否消耗了 0 额度（缓存命中） |
| `credits_estimated` | 每个响应都内置成本追踪 |
| 类型化错误码 | 机器可读：`BOT_DETECTION_SUSPECTED`、`PAGE_NOT_FOUND` 等 |
| 5 个工作流提示词 | 预构建工作流：研究、爬取、提取、诊断 |
| 5 个参考资源 | 国家、错误码、成本指南 — 随时可访问 |

---

## 核心特性

### 1. 住宅 IP 网络
- **200 万+ 真实设备**：Android 手机、Windows 电脑、Mac
- **7,000+ 活跃节点**，99.9% 在线率
- 真实家庭 IP 指纹，绕过 Cloudflare、Akamai、DataDome 检测

### 2. 地理定向
- **195+ 国家**，两字母 ISO 代码（`US`、`DE`、`JP`、`BR`...）
- **城市级定位**：`newyork`、`london`、`tokyo`、`singapore`...
- 同一 URL 不同国家 = 独立缓存键，互不干扰

### 3. 响应缓存
重复抓取相同 URL 不消耗代理额度：

```json
// 第一次调用（live fetch）
"meta": { "cache_hit": false, "latency_ms": 1800, "quota": { "credits_estimated": 1 } }

// 第二次调用（cache hit）
"meta": { "cache_hit": true, "cache_age_seconds": 5, "latency_ms": 0 }
```

| 配置项 | 说明 |
|--------|------|
| 默认 TTL | 300 秒（5 分钟） |
| 缓存键 | `url + format + country` |
| 禁用缓存 | `PROXY4AGENT_CACHE_TTL_SECONDS=0` |
| session_id | 有 session_id 的请求永不缓存（粘性路由需要实时调用） |

### 4. 智能体优先的 JSON 输出
所有工具返回统一结构：

```json
{
  "ok": true / false,
  "tool": "工具名称",
  "data": { ... },
  "meta": {
    "latency_ms": 1800,
    "cache_hit": false,
    "quota": { "credits_estimated": 1 }
  }
}
```

### 5. 类型化错误码 + 恢复指令
每个错误都包含 `code`（枚举）、`recoverable`（布尔）、`agent_instruction`（下一步操作）：

```json
{
  "ok": false,
  "error": {
    "code": "BOT_DETECTION_SUSPECTED",
    "recoverable": true,
    "agent_instruction": "Try agentproxy_render (real browser). Or retry with a different country/session_id."
  }
}
```

| 错误码 | 含义 | 可恢复 |
|--------|------|--------|
| `BOT_DETECTION_SUSPECTED` | 被目标站点封锁（403） | ✓ |
| `TLS_ERROR` | TLS/SSL 连接失败 | ✓ |
| `TIMEOUT` | 请求超时 | ✓ |
| `RATE_LIMITED` | HTTP 429 限速 | ✓ |
| `NETWORK_ERROR` | DNS 解析失败 | ✗ |
| `INVALID_INPUT` | 参数错误 | ✗ |
| `PROVIDER_NOT_CONFIGURED` | 缺少凭证 | ✗ |

### 6. 批量并发抓取
`agentproxy_batch_fetch` 内置信号量并发控制：

```json
// 10 个 URL，concurrency=5，wall time = ~8.8s（串行估计 ~50s）
{
  "data": {
    "results": [
      { "url": "...", "ok": true, "cache_hit": false, "latency_ms": 1200 },
      { "url": "...", "ok": true, "cache_hit": true,  "latency_ms": 0 },
      { "url": "...", "ok": false, "error": { "code": "TLS_ERROR" } }
    ]
  },
  "meta": { "latency_ms": 8800, "quota": { "credits_estimated": 10 } }
}
```

### 7. 多供应商支持

| 供应商 | 环境变量 | 说明 |
|--------|---------|------|
| **Novada**（推荐） | `NOVADA_PROXY_USER` + `NOVADA_PROXY_PASS` | 最深度集成，含搜索 + 浏览器 API |
| BrightData | `BRIGHTDATA_USER` + `BRIGHTDATA_PASS` | 完整自动定位 |
| Smartproxy | `SMARTPROXY_USER` + `SMARTPROXY_PASS` | 完整自动定位 |
| Oxylabs | `OXYLABS_USER` + `OXYLABS_PASS` | 完整自动定位 |
| 通用 HTTP | `PROXY_URL=http://user:pass@host:port` | 任意代理服务商 |

### 8. 渐进式降级（render_fallback）
`agentproxy_extract` 支持自动升级到浏览器渲染：

```
代理抓取失败（TLS / Bot检测）
        │
        ▼ render_fallback=true
agentproxy_render（真实 Chromium）
        │
        ▼
data.extracted_via = "render"  （agent 知道走了哪条路径）
data.fetch_warning = "Proxy fetch failed... escalated to render"
```

---

## 快速安装

```bash
# 核心（住宅代理抓取）
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_PROXY_USER=你的用户名 \
  -e NOVADA_PROXY_PASS=你的密码 \
  -- npx -y bestproxy4agents-mcp

# 仅搜索
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_API_KEY=你的_API_Key \
  -- npx -y bestproxy4agents-mcp

# 全功能（代理 + 搜索 + 浏览器渲染）
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_PROXY_USER=你的用户名 \
  -e NOVADA_PROXY_PASS=你的密码 \
  -e NOVADA_API_KEY=你的_API_Key \
  -e NOVADA_BROWSER_WS=你的_Browser_WS_URL \
  -- npx -y bestproxy4agents-mcp
```

获取凭证：**[novada.com](https://www.novada.com)** -> 仪表盘 -> 住宅代理 -> 端点生成器

**Cursor / Windsurf / Cline** 配置：
```json
{
  "mcpServers": {
    "bestproxy4agents-mcp": {
      "command": "npx",
      "args": ["-y", "bestproxy4agents-mcp"],
      "env": {
        "NOVADA_PROXY_USER": "你的用户名",
        "NOVADA_PROXY_PASS": "你的密码"
      }
    }
  }
}
```

---

## 工具参数速查

### agentproxy_fetch
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `url` | string | 必填 | 目标 URL |
| `country` | string | — | 国家代码（`US`、`DE`、`JP`...） |
| `city` | string | — | 城市（`newyork`、`london`...） |
| `session_id` | string | — | 复用同一 IP（不含连字符，最多 64 字符） |
| `format` | string | `markdown` | `markdown`（去 HTML）或 `raw`（原始 HTML） |
| `timeout` | number | `60` | 超时秒数（1-120） |

### agentproxy_batch_fetch
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `urls` | string[] | 必填 | 2-20 个 URL |
| `concurrency` | number | `3` | 并发数（1-5） |
| `country` | string | — | 对所有 URL 使用相同国家 |
| `format` | string | `markdown` | `markdown` 或 `raw` |

### agentproxy_extract
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `url` | string | 必填 | 目标 URL |
| `fields` | string[] | 必填 | 要提取的字段（`title`、`price`、`description`、`rating`...） |
| `render_fallback` | boolean | `false` | 代理失败时自动切换到浏览器渲染 |
| `country` | string | — | 地理定向 |

### agentproxy_map
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `url` | string | 必填 | 起始 URL |
| `limit` | number | `50` | 最多返回 URL 数（10-200） |
| `include_external` | boolean | `false` | 包含站外链接 |

### agentproxy_session
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `session_id` | string | 必填 | 会话 ID（不含连字符，最多 64 字符） |
| `url` | string | 必填 | 目标 URL |
| `verify_sticky` | boolean | `false` | 验证 IP 一致性（需额外 15-25 秒） |
| `country` | string | — | 国家代码 |

### agentproxy_search
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `query` | string | 必填 | 搜索关键词 |
| `num` | number | `10` | 结果数量（1-20） |
| `country` | string | — | 本地化结果（`us`、`de`、`jp`...） |
| `language` | string | — | 语言（`en`、`zh`、`de`...） |

### agentproxy_render [BETA]
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `url` | string | 必填 | 目标 URL |
| `format` | string | `markdown` | `markdown` · `html` · `text` |
| `wait_for` | string | — | 等待 CSS 选择器后再提取（如 `.product-title`） |
| `timeout` | number | `60` | 超时秒数（5-120） |

---

## 使用场景

**AI 智能体需要：**
- 抓取电商网站（Amazon、eBay、Walmart）不被封锁
- 跨国家监控价格变动
- 访问 195+ 国家的地区限制内容
- 对 Cloudflare/Akamai 保护站点进行竞争情报收集
- 执行多步登录流程并保持同一 IP
- 渲染无真实浏览器就返回空白的 JS 页面
- Google 搜索返回结构化 JSON 结果

**开发者构建：**
- AI 驱动的网页研究工具
- 价格比较智能体
- 全站内容爬取管道
- SEO 监控仪表盘
- 市场调研自动化

---

## 已验证可用

**电商：** Amazon、eBay、Walmart、Etsy、Shopify  
**职业网络：** LinkedIn  
**反机器人保护：** Cloudflare 站点、Akamai、DataDome  
**新闻内容：** HackerNews、Reddit、BBC、CNN、NYTimes  
**科技：** GitHub、Wikipedia、Stack Overflow、IMDB

---

## 反馈与支持

- **邮箱：** [tong.wu@novada.com](mailto:tong.wu@novada.com)
- **GitHub Issues：** [github.com/NovadaLabs/proxy4agent/issues](https://github.com/NovadaLabs/proxy4agent/issues)
- **官网：** [novada.com](https://www.novada.com)

---

## 许可证

MIT © [Novada](https://www.novada.com)
