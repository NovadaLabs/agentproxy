# Proxy4Agents MCP

**Residential proxy MCP server for AI agents.** Route any HTTP request through 2M+ real home devices — Android phones, Windows PCs, Macs — to bypass anti-bot systems, geo-target by country or city, and maintain sticky sessions across multi-step workflows.

[![npm version](https://img.shields.io/npm/v/bestproxy4agents-mcp?label=npm&color=CB3837)](https://npmjs.com/package/bestproxy4agents-mcp)
[![npm downloads](https://img.shields.io/npm/dw/bestproxy4agents-mcp?label=downloads&color=blue)](https://npmjs.com/package/bestproxy4agents-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![CI](https://github.com/NovadaLabs/proxy4agent/actions/workflows/ci.yml/badge.svg)](https://github.com/NovadaLabs/proxy4agent/actions)
[![Smithery](https://smithery.ai/badge/proxy4agent)](https://smithery.ai/server/proxy4agent)
[![English](https://img.shields.io/badge/lang-English-blue?style=flat-square)](#proxy4agent)
[![中文文档](https://img.shields.io/badge/lang-中文文档-red?style=flat-square)](#proxy4agent中文文档)

Works with **Claude Code**, **Cursor**, **Windsurf**, **Cline**, **Continue**, and any MCP-compatible AI agent. Powered by **[Novada](https://www.novada.com)**.

> **Free tier available** — sign up at [novada.com](https://www.novada.com), no credit card required. Get free access to Scraper API, Web Unblocker, and residential proxies to start building immediately.

---

## Why Proxy4Agents MCP

AI agents get blocked on 60–70% of commercial websites. Standard HTTP requests are detected and rejected by Cloudflare, Akamai, DataDome, PerimeterX, and similar systems. Proxy4Agent routes your agent through real residential IPs — so it looks indistinguishable from a human browser.

| Problem | Proxy4Agents MCP |
|---------|-----------|
| Amazon, LinkedIn block your agent | Residential IPs from real home devices |
| Cloudflare / Akamai bot challenges | Bypassed via real device fingerprints |
| JS-rendered pages return blank | Browser API runs real Chromium |
| Geo-restricted or localized content | 195+ countries, city-level targeting |
| Multi-step workflows lose session | Sticky sessions — same IP across calls |
| Need structured search results | Built-in Google search, clean JSON output |

---

## How It Works

```
┌─────────────┐     MCP (stdio)     ┌──────────────────┐     Proxy Auth     ┌─────────────────┐
│  AI Agent   │ ──────────────────► │  Proxy4Agents    │ ─────────────────► │  Residential IP  │
│  (Claude,   │     tool call       │  MCP Server      │     HTTP(S)        │  Network (2M+)   │
│   Cursor,   │ ◄────────────────── │                  │ ◄───────────────── │                  │
│   Windsurf) │     markdown/raw    │  Auto-targeting   │     response       │  195+ countries  │
└─────────────┘                     │  Retry + backoff  │                    │  City-level      │
                                    │  Credential mgmt  │                    │  Sticky sessions │
                                    └──────────────────┘                    └─────────────────┘
                                         │
                                         │ Provider adapters:
                                         ├── Novada (default, deepest integration)
                                         ├── BrightData
                                         ├── Smartproxy
                                         ├── Oxylabs
                                         └── Generic HTTP (any proxy)
```

---

## Providers

Proxy4Agents MCP works with **any HTTP proxy**. Novada is the built-in default with the deepest integration. BrightData, Smartproxy, and Oxylabs have dedicated adapters with full auto-targeting. Any other provider works via the generic adapter.

**Priority:** Novada → BrightData → Smartproxy → Oxylabs → Generic. First configured provider wins.

### Novada (default — recommended)

Full integration: automatic geo-targeting, city-level targeting, sticky sessions, 195+ countries.

```bash
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_PROXY_USER=your_username \
  -e NOVADA_PROXY_PASS=your_password \
  -- npx -y bestproxy4agents-mcp
```

Get credentials: **[novada.com](https://www.novada.com)** → Dashboard → Residential Proxies → Endpoint Generator

### BrightData

Full integration: automatic country/city/session targeting via BrightData's username-suffix format.

```bash
claude mcp add bestproxy4agents-mcp \
  -e BRIGHTDATA_USER="brd-customer-abc123-zone-residential" \
  -e BRIGHTDATA_PASS=your_password \
  -- npx -y bestproxy4agents-mcp
```

Get credentials: **brightdata.com** → Proxies & Scraping → Residential → Access Parameters

> `BRIGHTDATA_USER` is your full username including zone (e.g. `brd-customer-abc123-zone-residential`). Optional: `BRIGHTDATA_HOST` (default: `zproxy.lum-superproxy.io`), `BRIGHTDATA_PORT` (default: `22225`).

### Smartproxy

Full integration: automatic country/city/session targeting.

```bash
claude mcp add bestproxy4agents-mcp \
  -e SMARTPROXY_USER=your_username \
  -e SMARTPROXY_PASS=your_password \
  -- npx -y bestproxy4agents-mcp
```

Get credentials: **smartproxy.com** → Dashboard → Residential → Endpoint Generator

> Optional: `SMARTPROXY_HOST` (default: `gate.smartproxy.com`), `SMARTPROXY_PORT` (default: `10001`).

### Oxylabs

Full integration: automatic country/city/session targeting.

```bash
claude mcp add bestproxy4agents-mcp \
  -e OXYLABS_USER=your_username \
  -e OXYLABS_PASS=your_password \
  -- npx -y bestproxy4agents-mcp
```

Get credentials: **oxylabs.io** → Dashboard → Residential Proxies → Access Details

> Optional: `OXYLABS_HOST` (default: `pr.oxylabs.io`), `OXYLABS_PORT` (default: `7777`).

### Generic HTTP Proxy — any other provider

Set `PROXY_URL` to use IPRoyal, your own infrastructure, or any standard HTTP proxy.

```bash
# IPRoyal
claude mcp add bestproxy4agents-mcp \
  -e PROXY_URL="http://username:password@geo.iproyal.com:12321" \
  -- npx -y bestproxy4agents-mcp

# Any HTTP proxy
claude mcp add bestproxy4agents-mcp \
  -e PROXY_URL="http://user:pass@your-proxy-host:port" \
  -- npx -y bestproxy4agents-mcp
```

> **Note:** With the generic adapter, encode country/city/session targeting directly in your proxy URL per your provider's format. `country`, `city`, and `session_id` tool parameters are logged as warnings and not forwarded.

| Feature | Novada | BrightData | Smartproxy | Oxylabs | Generic HTTP |
|---------|--------|------------|------------|---------|-------------|
| Auto country targeting | ✓ | ✓ | ✓ | ✓ | manual |
| Auto city targeting | ✓ | ✓ | ✓ | ✓ | manual |
| Sticky sessions | ✓ | ✓ | ✓ | ✓ | manual |
| Built-in search API | ✓ | — | — | — | — |
| Browser API (JS render) | ✓ | — | — | — | — |

---

## Get Your Credentials

Sign up at **[novada.com](https://www.novada.com)** — 30 seconds, no credit card. **Free tier includes Scraper API, Web Unblocker, and residential proxy access.**

| Tool | Required env vars | Where to get them |
|------|-------------------|-------------------|
| `agentproxy_fetch` | `NOVADA_PROXY_USER` + `NOVADA_PROXY_PASS` | Dashboard → Residential Proxies → Endpoint Generator |
| `agentproxy_session` | `NOVADA_PROXY_USER` + `NOVADA_PROXY_PASS` | Dashboard → Residential Proxies → Endpoint Generator |
| `agentproxy_search` | `NOVADA_API_KEY` | Dashboard → API Keys |
| `agentproxy_render` [BETA] | `NOVADA_BROWSER_WS` | Dashboard → Browser API → Playground → copy Puppeteer URL |
| `agentproxy_status` | _(none)_ | — |

You only need credentials for the tools you use.

---

## Install

**Fetch + Session (core — recommended start):**
```bash
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_PROXY_USER=your_username \
  -e NOVADA_PROXY_PASS=your_password \
  -e NOVADA_PROXY_HOST=your_account_host \
  -- npx -y bestproxy4agents-mcp
```

**Search only:**
```bash
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_API_KEY=your_key \
  -- npx -y bestproxy4agents-mcp
```

**All tools:**
```bash
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_PROXY_USER=your_username \
  -e NOVADA_PROXY_PASS=your_password \
  -e NOVADA_PROXY_HOST=your_account_host \
  -e NOVADA_API_KEY=your_key \
  -- npx -y bestproxy4agents-mcp
```

> **`NOVADA_PROXY_HOST`** — your account-specific proxy host from the Endpoint Generator (e.g. `abc123.vtv.na.novada.pro`). Required for reliable sticky sessions. Defaults to the shared load balancer if omitted.

---

## Compatible With

Proxy4Agents MCP works with any MCP-compatible AI client:

| Client | Install method |
|--------|---------------|
| **Claude Code** | `claude mcp add bestproxy4agents-mcp -e ... -- npx -y bestproxy4agents-mcp` |
| **Cursor** | Settings → MCP → Add server → `npx -y bestproxy4agents-mcp` |
| **Windsurf** | MCP config → `npx -y bestproxy4agents-mcp` |
| **Cline** | MCP settings → command: `npx`, args: `["-y", "bestproxy4agents-mcp"]` |
| **Continue** | `.continue/config.json` → mcpServers |
| **Smithery** | [smithery.ai/server/proxy4agent](https://smithery.ai/server/proxy4agent) |
| **Any MCP client** | stdio transport, `npx -y bestproxy4agents-mcp` |

**Claude Code** example (copy-paste ready):
```bash
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_PROXY_USER=your_username \
  -e NOVADA_PROXY_PASS=your_password \
  -- npx -y bestproxy4agents-mcp
```

**Cursor / Windsurf / Cline** — add to your MCP config:
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

---

## Tools

### `agentproxy_fetch`
Fetch any URL through a residential proxy. Works on Amazon, LinkedIn, Cloudflare-protected pages, and most anti-bot-protected sites.

**Requires:** Any proxy provider — Novada (`NOVADA_PROXY_USER` + `NOVADA_PROXY_PASS`), BrightData, Smartproxy, Oxylabs, or `PROXY_URL`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Target URL (`http://` or `https://`) |
| `country` | string | — | 2-letter ISO code: `US`, `DE`, `JP`, `GB`, `BR`, `IN`, `FR`, `CA`, `AU`... (195+ countries) |
| `city` | string | — | City-level targeting: `newyork`, `london`, `tokyo`, `paris`, `berlin`... |
| `session_id` | string | — | Reuse same ID to keep the same IP (letters/numbers/underscores only, max 64 chars) |
| `format` | string | `markdown` | `markdown` strips HTML tags · `raw` returns full HTML |
| `timeout` | number | `60` | Timeout in seconds (1–120) |

---

### `agentproxy_session`
Sticky session fetch — every call with the same `session_id` uses the same residential IP. Essential for login flows, paginated scraping, and price monitoring across pages.

**Requires:** Any proxy provider — Novada (`NOVADA_PROXY_USER` + `NOVADA_PROXY_PASS`), BrightData, Smartproxy, Oxylabs, or `PROXY_URL`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `session_id` | string | required | Unique ID — reuse to keep same IP (no hyphens, max 64 chars) |
| `url` | string | required | Target URL |
| `country` | string | — | 2-letter country code |
| `city` | string | — | City-level targeting: `newyork`, `london`, `tokyo`... |
| `format` | string | `markdown` | `markdown` or `raw` |
| `timeout` | number | `60` | Timeout in seconds (1–120) |

---

### `agentproxy_search`
Structured Google search via Novada. Returns titles, URLs, and descriptions — no HTML parsing needed. Best for discovery and research tasks.

**Requires:** `NOVADA_API_KEY`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Search query |
| `num` | number | `10` | Result count (1–20) |
| `country` | string | — | Localize results: `us`, `uk`, `de`, `jp`, `fr`... |
| `language` | string | — | Language: `en`, `zh`, `de`, `ja`, `fr`... |

---

### `agentproxy_render` [BETA]
Render JavaScript-heavy pages using Novada's Browser API (real Chromium, full JS execution). Use for SPAs, React/Vue apps, and pages that return blank without a real browser.

**Requires:** `NOVADA_BROWSER_WS` (copy the Puppeteer URL from Dashboard → Browser API → Playground)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Target URL |
| `format` | string | `markdown` | `markdown` · `html` · `text` |
| `wait_for` | string | — | CSS selector to wait for before extracting (e.g. `.product-title`) |
| `timeout` | number | `60` | Timeout in seconds (5–120) |

---

### `agentproxy_status`
Check Novada's proxy network health — live node count, device types, service status. No credentials required.

---

## Real-World Results

Live outputs from actual API calls — not fabricated.

### Geo-targeting: same URL, different exit countries
```
agentproxy_fetch(url="https://httpbin.org/ip", country="US", format="raw")
→ { "origin": "200.50.235.236" }   ← US residential IP

agentproxy_fetch(url="https://httpbin.org/ip", country="JP", format="raw")
→ { "origin": "60.85.57.175" }     ← Japan residential IP
```

### Sticky session: same IP confirmed across two requests
```
agentproxy_session(session_id="job001", url="https://httpbin.org/ip", format="raw")
→ { "origin": "103.135.135.168" }

agentproxy_session(session_id="job001", url="https://httpbin.org/ip", format="raw")
→ { "origin": "103.135.135.168" }  ← same IP, confirmed ✓
```

### Amazon — 1.6 MB product page, not blocked
```
agentproxy_fetch(url="https://www.amazon.com/dp/B0BSHF7WHW", country="US")
→ [URL: https://www.amazon.com/dp/B0BSHF7WHW | Status: 200 | Size: 1637 KB | Country: US]

  Apple 2023 MacBook Pro — M2 Pro chip, 16-inch, 16GB, 1TB
  Full product page: price, reviews, specs, related items
```

### HackerNews — 30 stories as clean markdown
```
agentproxy_fetch(url="https://news.ycombinator.com")
→ [URL: https://news.ycombinator.com | Status: 200 | Size: 34 KB]

  1. LittleSnitch for Linux — 752 points, 243 comments
  2. I ported Mac OS X to the Nintendo Wii — 1590 points, 281 comments
  3. Git commands I run before reading any code — 2054 points, 445 comments
  ...
```

### Google search — structured output, no HTML parsing
```
agentproxy_search(query="residential proxy for AI agents", num=3)
→ Search: "residential proxy for AI agents" via GOOGLE — 3 results

  1. Residential Proxies Trusted by Fortune 500 Companies
     https://brightdata.com/proxy-types/residential-proxies
     Access 400M+ residential proxies from 195 countries...

  2. Proxies for AI Web Agents: The Complete Guide
     https://netnut.io/proxies-for-ai-web-agents/
     Real-user IPs that bypass even the toughest anti-bot systems...
```

### Browser render — React SPA, full JS execution
```
agentproxy_render(url="https://react.dev", format="markdown")
→ [URL: https://react.dev | Title: React | Size: 266 KB | Rendered: yes (Browser API)]

  React v19.2

  The library for web and native user interfaces

  ## Create user interfaces from components
  React lets you build user interfaces out of individual pieces called components.
  Create your own React components like Thumbnail, LikeButton, and Video.
  Then combine them into entire screens, pages, and apps.
  ...
```

### Browser render — wait_for selector on HackerNews
```
agentproxy_render(url="https://news.ycombinator.com", wait_for=".athing")
→ [URL: https://news.ycombinator.com | Title: Hacker News | Size: 34 KB | Rendered: yes (Browser API)]

  1. LittleSnitch for Linux — 834 points, 285 comments
  2. Help Keep Thunderbird Alive — 138 points, 77 comments
  3. I ported Mac OS X to the Nintendo Wii — 1638 points
  ...
```

---

## Example Workflows

### Price monitor — same product, three markets
```
agentproxy_fetch(url="https://amazon.com/dp/B0BSHF7WHW", country="US")
agentproxy_fetch(url="https://amazon.com/dp/B0BSHF7WHW", country="DE")
agentproxy_fetch(url="https://amazon.com/dp/B0BSHF7WHW", country="JP")
```

### Login + multi-page scrape with same IP
```
agentproxy_session(session_id="workflow01", url="https://example.com/login")
agentproxy_session(session_id="workflow01", url="https://example.com/dashboard")
agentproxy_session(session_id="workflow01", url="https://example.com/data/page/1")
agentproxy_session(session_id="workflow01", url="https://example.com/data/page/2")
```

### Research pipeline
```
# 1. Find relevant pages
agentproxy_search(query="Claude MCP proxy tools", num=10)

# 2. Fetch each result through residential proxy
agentproxy_fetch(url="https://found-result.com/article", country="US")

# 3. Render JS-heavy dashboard (requires Browser API)
agentproxy_render(url="https://app.example.com/dashboard", wait_for=".data-table")
```

---

## Geo Coverage

**195+ countries** including:

`US` `GB` `DE` `FR` `JP` `CA` `AU` `BR` `IN` `KR` `SG` `NL` `IT` `ES` `MX` `RU` `PL` `SE` `NO` `DK` `FI` `CH` `AT` `BE` `PT` `CZ` `HU` `RO` `UA` `TR` `IL` `ZA` `NG` `EG` `AR` `CL` `CO` `PE` `VN` `TH` `ID` `MY` `PH` `PK` `BD` `TW` `HK` `NZ` + [188 more](https://www.novada.com)

**City-level targeting** (selected): `newyork` · `losangeles` · `chicago` · `london` · `paris` · `berlin` · `tokyo` · `seoul` · `sydney` · `toronto` · `singapore` · `dubai` · `mumbai` · `saopaulo`

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
**Professional networks:** LinkedIn  
**Anti-bot protected:** Cloudflare sites, Akamai-protected pages, DataDome-protected sites  
**News & content:** HackerNews, Reddit, BBC, CNN, NYTimes  
**Tech:** GitHub, Wikipedia, Stack Overflow  
**Entertainment:** IMDB, Rotten Tomatoes

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| [`@modelcontextprotocol/sdk`](https://npmjs.com/package/@modelcontextprotocol/sdk) | `^1.26` | MCP protocol — stdio transport, tool definitions, request handling |
| [`axios`](https://npmjs.com/package/axios) | `^1.7` | HTTP client — handles redirects, compression, streaming |
| [`https-proxy-agent`](https://npmjs.com/package/https-proxy-agent) | `^9.0` | HTTPS proxy routing — CONNECT tunnel + TLS for secure targets |
| [`http-proxy-agent`](https://npmjs.com/package/http-proxy-agent) | `^7.0` | HTTP proxy routing — plain HTTP targets through proxy |
| [`puppeteer-core`](https://npmjs.com/package/puppeteer-core) | `^22.15` | Browser API — WebSocket connection to Novada's real Chromium cloud |

Lightweight core. Package size: ~52 KB (excluding `node_modules`). `puppeteer-core` is the largest dependency but bundles no browser — it connects to Novada's remote Chromium.

---

## Use Cases

**For AI agents that need to:**
- Scrape e-commerce sites (Amazon, eBay, Walmart, Shopify) without getting blocked
- Monitor prices across different countries and markets
- Access geo-restricted content from 195+ countries
- Perform competitive intelligence on Cloudflare/Akamai-protected sites
- Execute multi-step login flows with consistent IP (sticky sessions)
- Render JavaScript-heavy SPAs that return blank without a real browser
- Search Google programmatically with clean structured results
- Collect localized search results from different regions
- Access professional networks (LinkedIn) behind anti-bot systems

**For developers building:**
- AI-powered web research tools
- Price comparison agents
- Content aggregation pipelines
- SEO monitoring dashboards
- Market research automation
- Lead generation workflows

---

## Feedback & Support

We'd love to hear from you — feature requests, bug reports, or just how you're using Proxy4Agents MCP:

- **Email:** [tong.wu@novada.com](mailto:tong.wu@novada.com)
- **GitHub Issues:** [github.com/NovadaLabs/proxy4agent/issues](https://github.com/NovadaLabs/proxy4agent/issues)
- **Website:** [novada.com](https://www.novada.com)

Your feedback drives our roadmap. Every bug report and feature request helps make Proxy4Agents MCP better for all agents and developers.

---

## Known Limitations

- Sites requiring full JS execution → use `agentproxy_render`
- `agentproxy_render` requires a separate Novada Browser API subscription and `NOVADA_BROWSER_WS`
- Session IDs must not contain hyphens (Novada uses `-` as its auth delimiter)
- For reliable sticky sessions, set `NOVADA_PROXY_HOST` to your account-specific host

---

## License

MIT © [Novada](https://www.novada.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies, subject to the following conditions: the above copyright notice and this permission notice shall be included in all copies or substantial portions of the software.

**The software is provided "as is", without warranty of any kind.**

See [LICENSE](LICENSE) for full text.

---

---

# Proxy4Agents MCP（中文文档）

> **AI 智能体的住宅代理 MCP 服务器。** 通过 200 万+ 真实家庭设备路由 HTTP 请求，绕过反机器人系统，按国家/城市定位，跨请求保持同一 IP。

[![返回英文](https://img.shields.io/badge/lang-English-blue?style=flat-square)](#proxy4agent)

支持 **Claude Code**、**Cursor**、**Windsurf**、**Cline**、**Continue** 及所有 MCP 兼容智能体。由 **[Novada](https://www.novada.com)** 提供支持。

---

## 为什么选择 Proxy4Agent

AI 智能体在 60-70% 的商业网站上被封锁。标准 HTTP 请求会被 Cloudflare、Akamai、DataDome 等系统检测并拒绝。Proxy4Agent 通过真实住宅 IP 路由请求 — 与人类浏览器无法区分。

| 问题 | Proxy4Agent |
|------|-------------|
| Amazon、LinkedIn 封锁你的智能体 | 来自真实家庭设备的住宅 IP |
| Cloudflare / Akamai 机器人检测 | 通过真实设备指纹绕过 |
| JS 渲染页面返回空白 | 浏览器 API 运行真实 Chromium |
| 地区限制或本地化内容 | 195+ 国家，城市级定位 |
| 多步骤工作流丢失会话 | 粘性会话 — 同一 IP 跨请求 |
| 需要结构化搜索结果 | 内置 Google 搜索，输出 JSON |

---

## 支持的代理提供商

优先级：Novada → BrightData → Smartproxy → Oxylabs → 通用 HTTP。首个配置的提供商生效。

| 功能 | Novada | BrightData | Smartproxy | Oxylabs | 通用 HTTP |
|------|--------|------------|------------|---------|----------|
| 自动国家定位 | ✓ | ✓ | ✓ | ✓ | 手动 |
| 自动城市定位 | ✓ | ✓ | ✓ | ✓ | 手动 |
| 粘性会话 | ✓ | ✓ | ✓ | ✓ | 手动 |
| 搜索 API | ✓ | — | — | — | — |
| 浏览器 API (JS 渲染) | ✓ | — | — | — | — |

---

## 快速开始

```bash
# Novada（推荐）
claude mcp add bestproxy4agents-mcp \
  -e NOVADA_PROXY_USER=你的用户名 \
  -e NOVADA_PROXY_PASS=你的密码 \
  -- npx -y bestproxy4agents-mcp

# BrightData
claude mcp add bestproxy4agents-mcp \
  -e BRIGHTDATA_USER="brd-customer-abc123-zone-residential" \
  -e BRIGHTDATA_PASS=你的密码 \
  -- npx -y bestproxy4agents-mcp

# 任意 HTTP 代理
claude mcp add bestproxy4agents-mcp \
  -e PROXY_URL="http://user:pass@host:port" \
  -- npx -y bestproxy4agents-mcp
```

获取 Novada 凭证：**[novada.com](https://www.novada.com)** → 仪表盘 → 住宅代理 → 端点生成器

---

## 5 个 MCP 工具

| 工具 | 功能 |
|------|------|
| `agentproxy_fetch` | 通过住宅代理获取任何 URL。支持国家/城市/会话定位。 |
| `agentproxy_session` | 粘性会话 — 同一 session_id 使用同一 IP。用于登录流程、分页抓取。 |
| `agentproxy_search` | Google 搜索，返回标题、URL、描述。无需 HTML 解析。 |
| `agentproxy_render` | 用真实 Chromium 渲染 JS 页面（SPA、React/Vue 应用）。 |
| `agentproxy_status` | 检查代理网络健康状态。无需凭证。 |

---

## 使用场景

**AI 智能体需要：**
- 抓取电商网站（Amazon、eBay、Walmart、Shopify）不被封锁
- 跨国家监控价格
- 访问 195+ 国家的地区限制内容
- 对 Cloudflare/Akamai 保护的站点进行竞争情报收集
- 执行多步登录流程并保持同一 IP
- 渲染无真实浏览器就返回空白的 JS 页面
- 获取不同地区的本地化搜索结果

**开发者构建：**
- AI 驱动的网页研究工具
- 价格比较智能体
- 内容聚合管道
- SEO 监控仪表盘
- 市场调研自动化

---

## 反馈与支持

- **邮箱：** [tong.wu@novada.com](mailto:tong.wu@novada.com)
- **GitHub Issues：** [github.com/NovadaLabs/proxy4agent/issues](https://github.com/NovadaLabs/proxy4agent/issues)
- **网站：** [novada.com](https://www.novada.com)

---

## 许可证

MIT © [Novada](https://www.novada.com)
