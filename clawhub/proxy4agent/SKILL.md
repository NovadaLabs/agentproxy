---
name: proxy4agent
description: Residential proxy for AI agents — fetch any URL through 2M+ real IPs, bypass anti-bot, geo-target, sticky sessions.
version: 1.5.3
metadata:
  openclaw:
    requires:
      anyBins: [node, npx]
      env:
        - NOVADA_PROXY_USER
        - NOVADA_PROXY_PASS
        - NOVADA_API_KEY
        - NOVADA_BROWSER_WS
        - BRIGHTDATA_USER
        - BRIGHTDATA_PASS
        - SMARTPROXY_USER
        - SMARTPROXY_PASS
        - OXYLABS_USER
        - OXYLABS_PASS
        - PROXY_URL
    primaryEnv: NOVADA_PROXY_USER
    always: false
    homepage: https://github.com/Goldentrii/proxy4agent
    os: [macos, linux, windows]
    install:
      - kind: node
        formula: proxy-veil@1.6.0
        bins: [proxy4agent]
---

# proxy4agent

Residential proxy MCP server for AI agents. Route HTTP requests through 2M+ real home devices to bypass anti-bot systems, geo-target by country or city, and maintain sticky sessions.

## Setup

Install as an MCP server:

```bash
claude mcp add proxy4agent \
  -e NOVADA_PROXY_USER=your_username \
  -e NOVADA_PROXY_PASS=your_password \
  -- npx -y bestproxy4agents
```

Or with any other proxy provider:

```bash
# BrightData
claude mcp add proxy4agent \
  -e BRIGHTDATA_USER="brd-customer-abc-zone-residential" \
  -e BRIGHTDATA_PASS=your_password \
  -- npx -y bestproxy4agents

# Smartproxy
claude mcp add proxy4agent \
  -e SMARTPROXY_USER=your_username \
  -e SMARTPROXY_PASS=your_password \
  -- npx -y bestproxy4agents

# Oxylabs
claude mcp add proxy4agent \
  -e OXYLABS_USER=your_username \
  -e OXYLABS_PASS=your_password \
  -- npx -y bestproxy4agents

# Any HTTP proxy
claude mcp add proxy4agent \
  -e PROXY_URL="http://user:pass@host:port" \
  -- npx -y bestproxy4agents
```

Get Novada credentials: [novada.com](https://www.novada.com) (30 seconds, no credit card).

## Tools

### agentproxy_fetch
Fetch any URL through a residential proxy. Works on Amazon, LinkedIn, Cloudflare-protected sites.

```
agentproxy_fetch(url="https://example.com", country="US", city="newyork", format="markdown")
```

Parameters: `url` (required), `country`, `city`, `session_id`, `format` (markdown/raw), `timeout` (1-120s).

### agentproxy_session
Sticky session — same IP across multiple requests. Use for login flows, paginated scraping.

```
agentproxy_session(session_id="job001", url="https://example.com/page/1")
agentproxy_session(session_id="job001", url="https://example.com/page/2")
```

### agentproxy_search
Structured Google search. Returns titles, URLs, descriptions as clean JSON.

```
agentproxy_search(query="residential proxy for AI", num=5, country="us")
```

Requires: `NOVADA_API_KEY`

### agentproxy_render
Render JS-heavy pages with real Chromium (SPAs, React/Vue apps).

```
agentproxy_render(url="https://react.dev", wait_for=".main-content", format="markdown")
```

Requires: `NOVADA_BROWSER_WS`

### agentproxy_status
Check proxy network health. No credentials needed.

## Providers

Priority: Novada > BrightData > Smartproxy > Oxylabs > Generic HTTP.

All providers support automatic country/city/session targeting except Generic (encode manually in URL).

| Provider | Env vars | Auto targeting |
|----------|----------|---------------|
| Novada | `NOVADA_PROXY_USER` + `NOVADA_PROXY_PASS` | Yes |
| BrightData | `BRIGHTDATA_USER` + `BRIGHTDATA_PASS` | Yes |
| Smartproxy | `SMARTPROXY_USER` + `SMARTPROXY_PASS` | Yes |
| Oxylabs | `OXYLABS_USER` + `OXYLABS_PASS` | Yes |
| Generic | `PROXY_URL` | No (manual) |

## When to use proxy4agent

- Target site blocks your agent (403, captcha, Cloudflare challenge)
- Need content from a specific country or city
- Multi-step workflow requires same IP (login + scrape)
- JS-heavy page returns blank without a real browser
- Need structured search results without HTML parsing
