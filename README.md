<h1 align="center">Novada Proxy</h1>

<p align="center"><strong>The agent-first residential proxy MCP — works with any provider.</strong></p>

<p align="center">
Route any HTTP request through 2M+ real home devices — Android phones, Windows PCs, Macs — to bypass anti-bot systems, geo-target by country or city, and maintain sticky sessions across multi-step workflows. Powered by <a href="https://www.novada.com">Novada</a>.
</p>

<p align="center">
  <a href="https://npmjs.com/package/novada-proxy-mcp"><img src="https://img.shields.io/npm/v/novada-proxy-mcp?label=npm&color=CB3837&style=flat-square" alt="npm version"></a>
  <a href="https://npmjs.com/package/novada-proxy-mcp"><img src="https://img.shields.io/npm/dw/novada-proxy-mcp?label=downloads&color=blue&style=flat-square" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License: MIT"></a>
  <a href="https://github.com/NovadaLabs/Novada-proxy/actions"><img src="https://github.com/NovadaLabs/Novada-proxy/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square" alt="Node.js"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/tools-10-orange?style=flat-square" alt="10 tools">
  <img src="https://img.shields.io/badge/prompts-5-blue?style=flat-square" alt="5 prompts">
  <img src="https://img.shields.io/badge/resources-5-green?style=flat-square" alt="5 resources">
  <img src="https://img.shields.io/badge/tests-430-brightgreen?style=flat-square" alt="430 tests">
  <img src="https://img.shields.io/badge/providers-5-purple?style=flat-square" alt="5 providers">
</p>

<p align="center">
  <a href="https://lobehub.com/mcp/novadalabs-novada-proxy"><img src="https://lobehub.com/badge/mcp/novadalabs-novada-proxy" alt="LobeHub MCP"></a>
  <a href="https://lobehub.com/mcp/novadalabs-novada-proxy"><img src="https://lobehub.com/badge/mcp-full/novadalabs-novada-proxy?theme=light" alt="LobeHub MCP Full"></a>
  <a href="https://smithery.ai/server/novada-proxy-mcp"><img src="https://smithery.ai/badge/novada-proxy-mcp" alt="Smithery"></a>
  <a href="https://mcp.run"><img src="https://img.shields.io/badge/MCP-Registry-blueviolet?style=flat-square" alt="MCP Registry"></a>
</p>

<p align="center">
  <a href="#novada-proxy"><img src="https://img.shields.io/badge/lang-English-blue?style=flat-square" alt="English"></a>
  <a href="#novada-proxy中文文档"><img src="https://img.shields.io/badge/lang-中文文档-red?style=flat-square" alt="中文文档"></a>
</p>

<p align="center">
  <a href="#why-novada-proxy">Why</a> &middot;
  <a href="#quick-install">Install</a> &middot;
  <a href="#10-tools-at-a-glance">Tools</a> &middot;
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

## Getting Started

<p align="center">
  <a href="https://www.novada.com"><img src="https://img.shields.io/badge/1-Sign_Up_at_novada.com-5D34F2?style=for-the-badge" alt="Step 1"></a>
  <a href="https://dashboard.novada.com/overview/res/endpoint-generator/"><img src="https://img.shields.io/badge/2-Get_Proxy_Credentials-0EA5E9?style=for-the-badge" alt="Step 2"></a>
  <a href="#quick-install"><img src="https://img.shields.io/badge/3-Install_&_Run-10B981?style=for-the-badge" alt="Step 3"></a>
</p>

### For Humans

1. **Create a free account** at [novada.com](https://www.novada.com) — no credit card required
2. **Get your credentials** at [Dashboard → Residential Proxies → Endpoint Generator](https://dashboard.novada.com/overview/res/endpoint-generator/) — copy your username and password
3. **Install and run:**

```bash
# Claude Code
claude mcp add novada-proxy-mcp \
  -e NOVADA_PROXY_USER=your_username \
  -e NOVADA_PROXY_PASS=your_password \
  -- npx -y novada-proxy-mcp

# Or use the CLI directly
npx novada-proxy-mcp status
npx novada-proxy fetch https://example.com
```

### For Agents

> [!NOTE]
> **Agents:** Tell your human to complete steps 1-2 above. Once credentials are set as environment variables, all 10 tools are available immediately. No API key rotation, no token refresh — proxy credentials are persistent.

```
Required env vars:
  NOVADA_PROXY_USER   — from novada.com dashboard
  NOVADA_PROXY_PASS   — from novada.com dashboard

Optional (for extra features):
  NOVADA_API_KEY      — enables novada_proxy_search (Google search)
  NOVADA_BROWSER_WS   — enables novada_proxy_render (JS rendering)
  NOVADA_PROXY_ZONE   — "res" (default), "isp", or "dcp"
```

**Need help?** Contact [support@novada.com](mailto:support@novada.com)

---

## Why Novada Proxy

AI agents get blocked on 60–70% of commercial websites. Standard HTTP requests are detected and rejected by Cloudflare, Akamai, DataDome, and PerimeterX. Novada Proxy routes your agent through real residential IPs — indistinguishable from a human browser.

| Problem | Solution |
|---------|----------|
| Amazon, LinkedIn, Cloudflare block your agent | 2M+ residential IPs from real home devices |
| Bot challenges return 403 / CAPTCHA | Real device fingerprints bypass detection |
| JS-rendered pages return blank content | `novada_proxy_render` runs real Chromium |
| Geo-restricted or localized content | 195+ countries, city-level targeting |
| Multi-step workflows need the same IP | Sticky sessions — consistent IP across calls |
| Scraping 10+ URLs wastes time | `novada_proxy_batch_fetch` — concurrent, parallel |
| Need structured fields, not raw HTML | `novada_proxy_extract` — title, price, rating, etc. |
| Finding URLs before scraping | `novada_proxy_map` — discover all internal links |
| Need clean search results | `novada_proxy_search` — Google results as JSON |

---

## 10 Tools at a Glance

| Tool | What It Does | Requires |
|------|-------------|---------|
| `novada_proxy_fetch` | Fetch any URL through residential proxy | Proxy credentials |
| `novada_proxy_batch_fetch` | Fetch 2–20 URLs concurrently (up to 5x parallel) | Proxy credentials |
| `novada_proxy_extract` | Extract structured fields — heuristic mode (fields) or LLM mode (schema) | Proxy credentials |
| `novada_proxy_map` | Crawl a URL and return all internal links as JSON array | Proxy credentials |
| `novada_proxy_crawl` | Recursively crawl a site (BFS, depth 1-5) with URL discovery | Proxy credentials |
| `novada_proxy_session` | Sticky session — same IP across every call | Proxy credentials |
| `novada_proxy_search` | Google search -> structured JSON (title, url, snippet) | `NOVADA_API_KEY` |
| `novada_proxy_render` | Render JS-heavy pages with real Chromium [BETA] | `NOVADA_BROWSER_WS` |
| `novada_proxy_research` | One-shot deep research — search + fetch + synthesize | `NOVADA_API_KEY` + Proxy |
| `novada_proxy_status` | Check proxy network health + version | _(none)_ |

---

## Quick Decision Guide

| I want to... | Use this tool |
|--------------|---------------|
| Fetch a single URL | `novada_proxy_fetch` |
| Fetch 2–20 URLs at once | `novada_proxy_batch_fetch` |
| Extract specific fields (title, price...) | `novada_proxy_extract` with `fields` |
| Extract ANY field via schema | `novada_proxy_extract` with `schema` |
| Find all links on a page | `novada_proxy_map` |
| Crawl an entire site | `novada_proxy_crawl` |
| Research a topic | `novada_proxy_research` |
| Search Google | `novada_proxy_search` |
| Render a JS-heavy page | `novada_proxy_render` |
| Keep same IP across calls | `novada_proxy_session` |
| Check if proxy works | `novada_proxy_status` |

## When To Use Which Tool

```
Goal: "Scrape a single URL"
  └─ Static HTML page?          → novada_proxy_fetch
  └─ Need specific fields?      → novada_proxy_extract (fields or schema mode)
  └─ React/Vue SPA / blank page? → novada_proxy_render

Goal: "Scrape multiple URLs"
  └─ You have the URLs already  → novada_proxy_batch_fetch
  └─ You need links from one page → novada_proxy_map → novada_proxy_batch_fetch
  └─ You need to crawl a whole site → novada_proxy_crawl → novada_proxy_batch_fetch

Goal: "Research a topic"        → novada_proxy_research (search + fetch + findings in one call)

Goal: "Search the web"          → novada_proxy_search → novada_proxy_batch_fetch

Goal: "Login + multi-page flow" → novada_proxy_session (same session_id)

Goal: "Check if proxy works"    → novada_proxy_status
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
> Prompts orchestrate multi-tool workflows automatically. For example, `research_topic` runs `novada_proxy_search` then `novada_proxy_batch_fetch` in sequence — the agent doesn't need to figure out the pipeline.

---

## 5 Resources

Always-accessible reference data that agents can read at any time, without making proxy calls.

| Resource URI | Description |
|-------------|-------------|
| `proxy://countries` | Complete list of 195+ country codes with city-level targeting |
| `proxy://error-codes` | All typed error codes with recovery instructions |
| `proxy://workflows` | Common agent workflow patterns (crawl, research, monitoring) |
| `proxy://supported-fields` | All fields `novada_proxy_extract` can extract with strategies |
| `proxy://cost-guide` | Credits per tool, caching behavior, cost optimization tips |

---

## Quick Install

**Core — fetch any URL through residential proxy:**
```bash
claude mcp add novada-proxy-mcp \
  -e NOVADA_PROXY_USER=your_username \
  -e NOVADA_PROXY_PASS=your_password \
  -- npx -y novada-proxy-mcp
```

**Search only:**
```bash
claude mcp add novada-proxy-mcp \
  -e NOVADA_API_KEY=your_key \
  -- npx -y novada-proxy-mcp
```

**All tools (proxy + search + browser render):**
```bash
claude mcp add novada-proxy-mcp \
  -e NOVADA_PROXY_USER=your_username \
  -e NOVADA_PROXY_PASS=your_password \
  -e NOVADA_API_KEY=your_key \
  -e NOVADA_BROWSER_WS=your_browser_ws_url \
  -- npx -y novada-proxy-mcp
```

**Cursor / Windsurf / Cline — add to MCP config:**
```json
{
  "mcpServers": {
    "novada-proxy-mcp": {
      "command": "npx",
      "args": ["-y", "novada-proxy-mcp"],
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

Novada Proxy works with **any HTTP proxy provider**. Novada is the built-in default with the deepest integration.

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
claude mcp add novada-proxy-mcp \
  -e BRIGHTDATA_USER="brd-customer-abc123-zone-residential" \
  -e BRIGHTDATA_PASS=your_password \
  -- npx -y novada-proxy-mcp
```
`BRIGHTDATA_USER` is your full username including zone. Optional: `BRIGHTDATA_HOST`, `BRIGHTDATA_PORT` (default `zproxy.lum-superproxy.io:22225`).
</details>

<details>
<summary>Smartproxy setup</summary>

```bash
claude mcp add novada-proxy-mcp \
  -e SMARTPROXY_USER=your_username \
  -e SMARTPROXY_PASS=your_password \
  -- npx -y novada-proxy-mcp
```
Optional: `SMARTPROXY_HOST`, `SMARTPROXY_PORT` (default `gate.smartproxy.com:10001`).
</details>

<details>
<summary>Oxylabs setup</summary>

```bash
claude mcp add novada-proxy-mcp \
  -e OXYLABS_USER=your_username \
  -e OXYLABS_PASS=your_password \
  -- npx -y novada-proxy-mcp
```
Optional: `OXYLABS_HOST`, `OXYLABS_PORT` (default `pr.oxylabs.io:7777`).
</details>

<details>
<summary>Generic HTTP proxy (IPRoyal, any provider)</summary>

```bash
claude mcp add novada-proxy-mcp \
  -e PROXY_URL="http://username:password@geo.iproyal.com:12321" \
  -- npx -y novada-proxy-mcp
```
`country`, `city`, `session_id` params are ignored with Generic — encode targeting directly in your proxy URL.
</details>

---

## Agent-First Design

> [!NOTE]
> Novada Proxy is the only proxy MCP designed specifically for autonomous AI agents. Every response, error, and description is optimized for machine consumption.

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

### `novada_proxy_fetch`
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
  "tool": "novada_proxy_fetch",
  "data": { "url": "...", "status_code": 200, "content": "...", "size_bytes": 34000 },
  "meta": { "latency_ms": 1800, "cache_hit": false, "quota": { "credits_estimated": 1 } }
}
```

---

### `novada_proxy_batch_fetch`
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
  "tool": "novada_proxy_batch_fetch",
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

### `novada_proxy_extract`
Extract structured fields from any URL using heuristic pattern matching (meta tags, Open Graph, JSON-LD, Schema.org). Lightweight — no LLM needed. Set `render_fallback: true` to automatically retry via real Chromium if the proxy fetch fails.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Target URL |
| `fields` | string[] | required | Fields to extract: `title`, `price`, `description`, `rating`, `image`, `author`, `date`... |
| `render_fallback` | boolean | `false` | Auto-retry via `novada_proxy_render` on TLS/bot block |
| `country` | string | — | Geo-target the fetch |
| `timeout` | number | `60` | Timeout in seconds |

**Response:**
```json
{
  "ok": true,
  "tool": "novada_proxy_extract",
  "data": {
    "url": "https://books.toscrape.com/...",
    "fields": { "title": "A Light in the Attic", "price": "£51.77", "description": null },
    "extracted_via": "proxy_fetch"
  },
  "meta": { "latency_ms": 2100, "quota": { "credits_estimated": 1 } }
}
```

---

### `novada_proxy_map`
Crawl a URL and return all internal links as a structured JSON array. Use as the discovery step before `novada_proxy_batch_fetch` to crawl an entire site without guessing URLs.

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
  "tool": "novada_proxy_map",
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

### `novada_proxy_session`
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

### `novada_proxy_search`
Structured Google search via Novada Scraper API. Returns titles, URLs, and snippets as clean JSON — no HTML parsing needed.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Search query |
| `num` | number | `10` | Results (1–20) |
| `country` | string | — | Localize: `us`, `uk`, `de`, `jp`... |
| `language` | string | — | Language: `en`, `zh`, `de`, `ja`... |

---

### `novada_proxy_render` [BETA]
Render JavaScript-heavy pages using Novada's Browser API (real Chromium, full JS execution). Use for SPAs, React/Vue apps, and pages that return blank with a standard HTTP fetch.

**Requires:** `NOVADA_BROWSER_WS` — copy the Puppeteer URL from Dashboard -> Browser API -> Playground

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Target URL |
| `format` | string | `markdown` | `markdown` / `html` / `text` |
| `wait_for` | string | — | CSS selector to wait for before extracting (e.g. `.product-title`) |
| `timeout` | number | `60` | Timeout in seconds (5–120) |

> Costs ~5 proxy credits per call vs 1 for `novada_proxy_fetch`. Use `novada_proxy_extract` with `render_fallback: true` for automatic escalation when needed.

---

### `novada_proxy_crawl`
Recursively crawl a website via BFS traversal. Starts from a URL, discovers links at each depth level, and returns the full URL tree with metadata.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Starting URL to crawl |
| `depth` | number | `2` | BFS depth (1–5) |
| `limit` | number | `50` | Max pages to crawl (10–200) |
| `include_content` | boolean | `false` | Also return page content for each URL |
| `country` | string | — | Geo-target all fetches |
| `format` | string | `markdown` | Content format when `include_content: true` |
| `timeout` | number | `60` | Per-page timeout in seconds |

**When to use:** Full-site scraping, sitemap generation, content indexing — when you need MORE than a single page.

**Use `novada_proxy_map` instead if:** You only need links from ONE page (one level deep). Map is faster and cheaper for single-page link discovery.

**Chain with:** `novada_proxy_batch_fetch` to scrape specific pages from the URL tree.

**Example:**
```json
{
  "url": "https://example.com",
  "depth": 2,
  "limit": 50,
  "include_content": false
}
```

**Response:** `data.pages[]` (url, depth, status_code, total_links), `data.urls[]` (flat array for chaining into `novada_proxy_batch_fetch`)

---

### `novada_proxy_research`
One-shot research tool — searches the web, fetches top results, and returns structured findings with source previews. The agent can analyze the findings for deeper synthesis.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Research question or topic |
| `depth` | string | `"standard"` | `"quick"` (3 sources), `"standard"` (5 sources), `"deep"` (10 sources) |
| `country` | string | — | Localize search results |
| `timeout` | number | `60` | Timeout in seconds |

**Requires:** `NOVADA_API_KEY` (for Google search) + Proxy credentials (for fetching sources)

**When to use:** Research questions, topic investigation, competitive analysis, fact-finding — when you need content from multiple sources in one call.

**Use `novada_proxy_search` instead if:** You just need search result URLs, not full page content.

**Chain with:** `novada_proxy_fetch` on specific `urls[]` for deeper reading of individual sources.

**Note:** `findings_summary` is a concatenated preview of sources — your agent should analyze `findings[]` for actual synthesis.

**Example:**
```json
{
  "query": "best residential proxy providers 2026",
  "depth": "standard"
}
```

**Response:** `data.findings[]` (title, url, snippet, content_preview), `data.urls[]` (for chaining), `data.findings_summary`

---

### `novada_proxy_extract` — Schema Mode

In addition to `fields` (heuristic extraction), `novada_proxy_extract` supports a `schema` parameter for extracting any arbitrary field via your agent's LLM — zero additional API cost.

#### Schema Mode (LLM Extraction)
Pass `schema` instead of `fields` for arbitrary field extraction. The tool returns cleaned page content + an extraction prompt — your agent does the extraction (zero additional API cost).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Target URL |
| `schema` | object | — | Keys = field names, values = field descriptions. Use instead of `fields`. |
| `render_fallback` | boolean | `false` | Auto-retry via `novada_proxy_render` on TLS/bot block |
| `country` | string | — | Geo-target the fetch |
| `timeout` | number | `60` | Timeout in seconds |

**Example:**
```json
{
  "url": "https://example.com/product",
  "schema": {
    "product_name": "The full product name",
    "price": "Current price with currency",
    "warranty": "Warranty terms and duration",
    "return_policy": "Return policy summary"
  }
}
```

**Response:** `data.mode = "llm_extract"`, `data.content` (cleaned markdown), `data.extraction_prompt` (instructions for your agent to follow and extract the fields)

**Security:** Schema keys must be alphanumeric/underscore (a-z, 0-9, _), max 50 chars. Values max 200 chars.

---

### `novada_proxy_status`
Check proxy network connectivity and version. Makes a live proxy call to verify the connection is working. No credentials required.

---

## Agent Workflows

### Site crawl pipeline (map -> batch)
```
# Agent task: "Read all products on this catalogue"
1. novada_proxy_map(url="https://books.toscrape.com", limit=50)
   → returns 20–50 internal URLs in 4s, 1 credit

2. novada_proxy_batch_fetch(urls=[...20 URLs], concurrency=5)
   → fetches all 20 pages in parallel, ~4s wall time, 20 credits
   (vs ~60s sequential = 15x speedup)
```

### Research pipeline (search -> batch)
```
# Agent task: "Find and read top 5 pages about X"
1. novada_proxy_search(query="residential proxy MCP", num=5)
   → structured JSON: titles, URLs, snippets

2. novada_proxy_batch_fetch(urls=[...5 URLs], format="markdown")
   → full content of all 5 pages in parallel
```

### Sticky session — login + multi-page scrape
```
# Same IP across all calls
novada_proxy_session(session_id="job_001", url="https://example.com/login")
novada_proxy_session(session_id="job_001", url="https://example.com/dashboard")
novada_proxy_session(session_id="job_001", url="https://example.com/data/page/1")
novada_proxy_session(session_id="job_001", url="https://example.com/data/page/2")
```

### Price monitoring — same product, three markets
```
novada_proxy_fetch(url="https://amazon.com/dp/B0BSHF7WHW", country="US")
novada_proxy_fetch(url="https://amazon.com/dp/B0BSHF7WHW", country="DE")
novada_proxy_fetch(url="https://amazon.com/dp/B0BSHF7WHW", country="JP")
# Second call per URL is a cache hit (0ms, 0 credits) if within 300s TTL
```

### Extract structured data
```
# Agent task: "Get product details without parsing HTML"
novada_proxy_extract(
  url="https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  fields=["title", "price", "description", "rating"],
  render_fallback=true  # auto-retry via Chromium if proxy gets blocked
)
```

---

## Response Cache

All `novada_proxy_fetch` and `novada_proxy_batch_fetch` calls are cached in-process. Repeated fetches to the same URL within the TTL window consume **zero proxy credits**.

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
| `BOT_DETECTION_SUSPECTED` | HTTP 4xx — target blocked the request | ✓ | Retry with `novada_proxy_render` or different `country` |
| `TLS_ERROR` | TLS/SSL connection failed through proxy | ✓ | Retry with a different `country` parameter |
| `TIMEOUT` | Request exceeded timeout limit | ✓ | Increase `timeout` or retry |
| `RATE_LIMITED` | HTTP 429 — too many requests | ✓ | Wait 5s and retry |
| `NETWORK_ERROR` | DNS failure — hostname not found | ✗ | Verify the URL is correct |
| `SESSION_STICKINESS_FAILED` | Same IP not maintained | ✓ | Retry `verify_sticky: true` to confirm |
| `INVALID_INPUT` | Bad parameter value | ✗ | Fix the parameter and retry |
| `PROVIDER_NOT_CONFIGURED` | Missing env vars | ✗ | Set credentials and restart MCP |
| `UNKNOWN_ERROR` | Unexpected error | ✓ | Check `novada_proxy_status`, retry |

**Error response format:**
```json
{
  "ok": false,
  "error": {
    "code": "BOT_DETECTION_SUSPECTED",
    "message": "HTTP 403 — request blocked by target",
    "recoverable": true,
    "agent_instruction": "Try novada_proxy_render (real browser). Or retry with a different country/session_id."
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
| **Claude Code** | `claude mcp add novada-proxy-mcp -e ... -- npx -y novada-proxy-mcp` |
| **Cursor** | Settings -> MCP -> Add server -> `npx -y novada-proxy-mcp` |
| **Windsurf** | MCP config -> `npx -y novada-proxy-mcp` |
| **Cline** | MCP settings -> command: `npx`, args: `["-y", "novada-proxy-mcp"]` |
| **Continue** | `.continue/config.json` -> mcpServers |
| **Smithery** | [smithery.ai/server/novada-proxy-mcp](https://smithery.ai/server/novada-proxy-mcp) |
| **Any MCP client** | stdio transport / `npx -y novada-proxy-mcp` |

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

## Real-World Test Results

Tested across 3 Novada proxy types with 33 real-world tests (2026-04-28):

| Proxy Type | Tests | Pass | Notes |
|-----------|:-----:|:----:|-------|
| Residential | 11 | 9 | Wikipedia, Shopify, HackerNews, geo-targeting work. Sticky sessions require endpoint config. |
| ISP | 7 | 7 | All tools work including sticky sessions (`session_verified: true`). |
| Datacenter | 8 | 8 | Fast, cost-effective. Anti-bot sites (Amazon, CNN) may block datacenter IPs — use residential for those. |
| Error handling | 7 | 7 | All error codes return structured JSON with `agent_instruction`. |

**Success rate: 94% (31/33 pass)**. Failures are proxy-type limitations (datacenter on anti-bot sites), not code bugs.

### Proxy Type Guide

| Use Case | Recommended Proxy | Why |
|----------|------------------|-----|
| Anti-bot sites (Amazon, LinkedIn, CNN) | Residential | Real home IPs, hardest to detect |
| Fast bulk scraping | Datacenter | Lowest latency, cheapest per GB |
| Sticky sessions (login flows) | ISP | 6-hour sticky, stable IPs |
| General scraping | Any | All types handle most sites |

---

## Known Limitations

| Limitation | Workaround |
|-----------|-----------|
| Datacenter IPs blocked on anti-bot sites | Use residential or ISP proxy type (`NOVADA_PROXY_ZONE=res`) |
| Proxy-side DNS errors surface as `TLS_ERROR` | Check if domain exists before retrying with different country |
| CLI is stateless (no cross-invocation cache) | Use MCP server for cache benefits, or re-fetch same URLs within one CLI batch |
| `novada_proxy_render` requires Browser API key | Set `NOVADA_BROWSER_WS` env var — get it from novada.com dashboard |
| Heuristic extraction misses a field | Use `schema` mode: pass `schema:{"field":"description"}` — returns cleaned content + extraction prompt for your agent to extract any field (zero-cost LLM extraction) |

---

## Feedback & Support

- **Email:** [support@novada.com](mailto:support@novada.com)
- **GitHub Issues:** [github.com/NovadaLabs/Novada-proxy/issues](https://github.com/NovadaLabs/Novada-proxy/issues)
- **Website:** [novada.com](https://www.novada.com)

---

## License

MIT © [Novada](https://www.novada.com) — see [LICENSE](LICENSE)

---

---

# Novada Proxy（中文文档）

<p align="center"><strong>AI 智能体专属住宅代理 MCP — 支持任意供应商。</strong></p>

<p align="center">
通过 200 万+ 真实家庭设备（Android 手机、Windows 电脑、Mac）路由 HTTP 请求，绕过反机器人系统，按国家/城市精准定位，跨请求保持同一 IP。
</p>

<p align="center">
  <a href="#novada-proxy"><img src="https://img.shields.io/badge/lang-English-blue?style=flat-square" alt="返回英文"></a>
  <img src="https://img.shields.io/badge/工具-10个-orange?style=flat-square" alt="10 个工具">
  <img src="https://img.shields.io/badge/提示词-5个-blue?style=flat-square" alt="5 个提示词">
  <img src="https://img.shields.io/badge/资源-5个-green?style=flat-square" alt="5 个资源">
  <img src="https://img.shields.io/badge/测试-430个-brightgreen?style=flat-square" alt="430 个测试">
</p>

<p align="center">
  <a href="#10-个工具">工具</a> &middot;
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

## 10 个工具

```
novada_proxy_fetch       → 通过住宅代理抓取任意 URL
novada_proxy_batch_fetch → 并发抓取 2-20 个 URL（最高 5 倍加速）
novada_proxy_extract     → 从页面提取结构化字段（标题、价格、评分…）
novada_proxy_map         → 爬取页面，返回所有内部链接 JSON 数组
novada_proxy_crawl       → 递归爬取站点（BFS，深度 1-5），自动发现 URL
novada_proxy_session     → 粘性会话 — 同一 session_id 始终同一 IP
novada_proxy_search      → Google 搜索，返回结构化 JSON（无需解析 HTML）
novada_proxy_render      → 真实 Chromium 渲染 JS 页面 [BETA]
novada_proxy_research    → 一键深度研究 — 搜索 + 抓取 + 综合分析
novada_proxy_status      → 检查代理网络健康状态
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
| `proxy://supported-fields` | `novada_proxy_extract` 支持的所有提取字段及策略 |
| `proxy://cost-guide` | 每个工具的额度消耗、缓存行为、成本优化技巧 |

---

## 快速决策指南

| 我想要... | 使用工具 |
|-----------|---------|
| 抓取单个 URL | `novada_proxy_fetch` |
| 同时抓取 2-20 个 URL | `novada_proxy_batch_fetch` |
| 提取特定字段（标题、价格…） | `novada_proxy_extract` 使用 `fields` |
| 提取任意字段（Schema 模式） | `novada_proxy_extract` 使用 `schema` |
| 获取页面上的所有链接 | `novada_proxy_map` |
| 爬取整个站点 | `novada_proxy_crawl` |
| 研究某个主题 | `novada_proxy_research` |
| 搜索 Google | `novada_proxy_search` |
| 渲染 JS 重型页面 | `novada_proxy_render` |
| 跨请求保持同一 IP | `novada_proxy_session` |
| 检查代理是否正常 | `novada_proxy_status` |

## 工具选择决策树

```
目标：抓取单个 URL
  ├─ 静态 HTML 页面？                    → novada_proxy_fetch
  ├─ 需要特定字段（价格/标题）？          → novada_proxy_extract（fields 或 schema 模式）
  └─ React/Vue SPA / 内容为空？          → novada_proxy_render

目标：批量抓取多个 URL
  ├─ 已有 URL 列表？                     → novada_proxy_batch_fetch
  ├─ 需要获取单页链接？                  → novada_proxy_map → novada_proxy_batch_fetch
  └─ 需要爬取整个站点？                  → novada_proxy_crawl → novada_proxy_batch_fetch

目标：研究某个主题                       → novada_proxy_research（一次调用搜索 + 抓取 + 分析）

目标：网页搜索                          → novada_proxy_search → novada_proxy_batch_fetch

目标：登录 + 多步骤流程                  → novada_proxy_session（相同 session_id）

目标：验证代理是否正常工作               → novada_proxy_status
```

---

## 三大流水线模式

### 全站爬取流水线（推荐）

```
novada_proxy_map(url, limit=50)
        │
        ▼
  返回 20-50 个内部链接（1 credit，4 秒）
        │
        ▼
novada_proxy_batch_fetch(urls, concurrency=5)
        │
        ▼
  并发抓取所有页面（N credits，~4 秒，比串行快 15x）
```

### 搜索研究流水线

```
novada_proxy_search(query, num=10)
        │
        ▼
  结构化 JSON：标题 + URL + 摘要
        │
        ▼
novada_proxy_batch_fetch(urls, format="markdown")
        │
        ▼
  全部页面内容并行返回
```

### 粘性会话 — 登录 + 多页抓取

```
session_id = "job_001"

novada_proxy_session(session_id, url="/login")    → 同一 IP
novada_proxy_session(session_id, url="/dashboard") → 同一 IP
novada_proxy_session(session_id, url="/data/1")    → 同一 IP
novada_proxy_session(session_id, url="/data/2")    → 同一 IP
```

---

## 智能体优先设计

> [!NOTE]
> Novada Proxy 是唯一专为自主 AI 智能体设计的代理 MCP。每个响应、错误和描述都为机器消费而优化。

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
    "agent_instruction": "Try novada_proxy_render (real browser). Or retry with a different country/session_id."
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
`novada_proxy_batch_fetch` 内置信号量并发控制：

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
`novada_proxy_extract` 支持自动升级到浏览器渲染：

```
代理抓取失败（TLS / Bot检测）
        │
        ▼ render_fallback=true
novada_proxy_render（真实 Chromium）
        │
        ▼
data.extracted_via = "render"  （agent 知道走了哪条路径）
data.fetch_warning = "Proxy fetch failed... escalated to render"
```

---

## 快速安装

```bash
# 核心（住宅代理抓取）
claude mcp add novada-proxy-mcp \
  -e NOVADA_PROXY_USER=你的用户名 \
  -e NOVADA_PROXY_PASS=你的密码 \
  -- npx -y novada-proxy-mcp

# 仅搜索
claude mcp add novada-proxy-mcp \
  -e NOVADA_API_KEY=你的_API_Key \
  -- npx -y novada-proxy-mcp

# 全功能（代理 + 搜索 + 浏览器渲染）
claude mcp add novada-proxy-mcp \
  -e NOVADA_PROXY_USER=你的用户名 \
  -e NOVADA_PROXY_PASS=你的密码 \
  -e NOVADA_API_KEY=你的_API_Key \
  -e NOVADA_BROWSER_WS=你的_Browser_WS_URL \
  -- npx -y novada-proxy-mcp
```

获取凭证：**[novada.com](https://www.novada.com)** -> 仪表盘 -> 住宅代理 -> 端点生成器

**Cursor / Windsurf / Cline** 配置：
```json
{
  "mcpServers": {
    "novada-proxy-mcp": {
      "command": "npx",
      "args": ["-y", "novada-proxy-mcp"],
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

### novada_proxy_fetch
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `url` | string | 必填 | 目标 URL |
| `country` | string | — | 国家代码（`US`、`DE`、`JP`...） |
| `city` | string | — | 城市（`newyork`、`london`...） |
| `session_id` | string | — | 复用同一 IP（不含连字符，最多 64 字符） |
| `format` | string | `markdown` | `markdown`（去 HTML）或 `raw`（原始 HTML） |
| `timeout` | number | `60` | 超时秒数（1-120） |

### novada_proxy_batch_fetch
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `urls` | string[] | 必填 | 2-20 个 URL |
| `concurrency` | number | `3` | 并发数（1-5） |
| `country` | string | — | 对所有 URL 使用相同国家 |
| `format` | string | `markdown` | `markdown` 或 `raw` |

### novada_proxy_extract
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `url` | string | 必填 | 目标 URL |
| `fields` | string[] | 必填 | 要提取的字段（`title`、`price`、`description`、`rating`...） |
| `render_fallback` | boolean | `false` | 代理失败时自动切换到浏览器渲染 |
| `country` | string | — | 地理定向 |

### novada_proxy_map
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `url` | string | 必填 | 起始 URL |
| `limit` | number | `50` | 最多返回 URL 数（10-200） |
| `include_external` | boolean | `false` | 包含站外链接 |

### novada_proxy_session
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `session_id` | string | 必填 | 会话 ID（不含连字符，最多 64 字符） |
| `url` | string | 必填 | 目标 URL |
| `verify_sticky` | boolean | `false` | 验证 IP 一致性（需额外 15-25 秒） |
| `country` | string | — | 国家代码 |

### novada_proxy_search
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `query` | string | 必填 | 搜索关键词 |
| `num` | number | `10` | 结果数量（1-20） |
| `country` | string | — | 本地化结果（`us`、`de`、`jp`...） |
| `language` | string | — | 语言（`en`、`zh`、`de`...） |

### novada_proxy_render [BETA]
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `url` | string | 必填 | 目标 URL |
| `format` | string | `markdown` | `markdown` · `html` · `text` |
| `wait_for` | string | — | 等待 CSS 选择器后再提取（如 `.product-title`） |
| `timeout` | number | `60` | 超时秒数（5-120） |

### novada_proxy_crawl
递归 BFS 爬取站点，从起始 URL 出发，按深度逐层发现链接，返回完整 URL 树及元数据。

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `url` | string | 必填 | 起始 URL |
| `depth` | number | `2` | BFS 深度（1-5） |
| `limit` | number | `50` | 最大爬取页数（10-200） |
| `include_content` | boolean | `false` | 同时返回每个页面的内容 |
| `country` | string | — | 地理定向所有请求 |
| `format` | string | `markdown` | `include_content: true` 时的内容格式 |
| `timeout` | number | `60` | 每页超时秒数 |

**适用场景：** 全站抓取、站点地图生成、内容索引 — 需要抓取**多个页面**时使用。

**改用 `novada_proxy_map` 的情况：** 只需要**单页**链接（一层深度）。Map 更快、更省额度。

**组合使用：** 将 `data.urls[]` 传入 `novada_proxy_batch_fetch` 并发抓取。

**请求示例：**
```json
{
  "url": "https://example.com",
  "depth": 2,
  "limit": 50,
  "include_content": false
}
```

**响应：** `data.pages[]`（url、depth、status_code、total_links），`data.urls[]`（扁平数组，可直接传给 `novada_proxy_batch_fetch`）

---

### novada_proxy_research
一键深度研究工具 — 搜索网络、抓取排名靠前的结果，返回含来源预览的结构化分析。智能体可对 findings 进行进一步综合分析。

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `query` | string | 必填 | 研究问题或主题 |
| `depth` | string | `"standard"` | `"quick"`（3 个来源）、`"standard"`（5 个）、`"deep"`（10 个） |
| `country` | string | — | 本地化搜索结果 |
| `timeout` | number | `60` | 超时秒数 |

**需要：** `NOVADA_API_KEY`（Google 搜索）+ 代理凭证（抓取来源页面）

**适用场景：** 研究问题、主题调研、竞品分析、事实核查 — 需要一次调用获取多个来源内容时。

**改用 `novada_proxy_search` 的情况：** 只需要搜索结果 URL，不需要完整页面内容。

**组合使用：** 对 `data.urls[]` 中的特定 URL 调用 `novada_proxy_fetch` 进行深度阅读。

**注意：** `findings_summary` 是各来源内容的拼接预览 — 智能体应分析 `findings[]` 进行实质性综合。

**请求示例：**
```json
{
  "query": "2026年最佳住宅代理服务商",
  "depth": "standard"
}
```

**响应：** `data.findings[]`（title、url、snippet、content_preview），`data.urls[]`（可链式传给其他工具），`data.findings_summary`

---

### novada_proxy_extract — Schema 模式（LLM 提取）

除 `fields`（启发式提取）外，`novada_proxy_extract` 还支持 `schema` 参数，通过智能体自身的 LLM 提取任意字段 — **零额外 API 费用**。

传入 `schema` 替代 `fields`，工具返回清洗后的页面内容 + 提取提示词 — 由你的智能体完成提取。

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `url` | string | 必填 | 目标 URL |
| `schema` | object | — | 键 = 字段名，值 = 字段描述。替代 `fields` 使用。 |
| `render_fallback` | boolean | `false` | 代理失败时自动切换到浏览器渲染 |
| `country` | string | — | 地理定向 |
| `timeout` | number | `60` | 超时秒数 |

**请求示例：**
```json
{
  "url": "https://example.com/product",
  "schema": {
    "product_name": "完整的产品名称",
    "price": "当前价格（含货币符号）",
    "warranty": "保修条款和期限",
    "return_policy": "退货政策摘要"
  }
}
```

**响应：** `data.mode = "llm_extract"`，`data.content`（清洗后的 Markdown 内容），`data.extraction_prompt`（供智能体遵循并提取字段的指令）

**安全限制：** Schema 键名只能包含字母、数字、下划线（a-z、0-9、_），最多 50 字符；值最多 200 字符。

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

- **邮箱：** [support@novada.com](mailto:support@novada.com)
- **GitHub Issues：** [github.com/NovadaLabs/Novada-proxy/issues](https://github.com/NovadaLabs/Novada-proxy/issues)
- **官网：** [novada.com](https://www.novada.com)

---

## 许可证

MIT © [Novada](https://www.novada.com)
