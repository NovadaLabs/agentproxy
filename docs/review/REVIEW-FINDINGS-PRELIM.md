# Preliminary Review Findings (Pre-Agent)

> Generated 2026-04-27 by Opus orchestrator from full source code read.
> These findings inform the 5-agent review but are NOT the final review.

---

## Source Code Analysis Summary

### Architecture: SOLID (8/10)
- Clean adapter pattern (5 providers, easy to extend)
- Consistent response envelope (ProxySuccessResponse / ProxyErrorResponse)
- Good separation: tools/ adapters/ types.ts utils.ts
- Credential redaction via adapter.sensitiveFields

### Known Issues Found

#### Security (Agent 1 will deep-dive)
1. **console.error in fetch.ts:127** — logs unsupported targeting params. Could this leak info?
2. **API key in query params** (search.ts:39) — Novada API design constraint, mitigated by sanitize()
3. **AxiosError.config.url** — may contain full proxy URL with credentials. classifyError() doesn't strip config.
4. **No SSRF protection beyond http(s):// check** — internal IPs (127.0.0.1, 169.254.x.x) allowed

#### Test Gaps (Agent 2 will enumerate)
- **Zero tests for:** classifyError(), extractField(), agentproxyFetch() integration, MCP handlers, prompts, resources
- **validateExtractParams** and **validateMapParams** — no test files
- Cache HIT behavior never tested (only key generation and TTL)
- Batch semaphore correctness never tested under load

#### Performance (Agent 4 will analyze)
- **Cache pruning O(n)** on every store — acceptable at 200 but not future-proof
- **htmlToMarkdown regex chain** — sequential replacements on potentially large strings
- **Puppeteer new connection per render** — no connection pooling
- **New HttpsProxyAgent per request** — no agent reuse

#### Agent UX (Agent 3 will evaluate)
- Tool prefix `agentproxy_` is 12 chars before the verb — verbose
- No `agentproxy_crawl` for recursive multi-page
- No POST request support
- No screenshot capability
- Credit tracking in meta.quota.credits_estimated — good, but no running total

#### Product (Agent 5 will assess)
- Multi-provider is genuinely unique in the MCP proxy space
- agent_instruction in errors is rare (most competitors just return error strings)
- Response caching with cache_hit metadata is unique
- But: BrightData has 60+ tools + free tier, Firecrawl has community momentum

### Code Quality Notes
- SAFE_COUNTRY/SAFE_CITY/SAFE_SESSION_ID regex duplicated in fetch.ts, extract.ts, batch.ts, session.ts, map.ts — should be shared
- QUOTA_NOTE string duplicated across 4+ files
- `if (!result.meta.X) delete result.meta.X` pattern inconsistent across tools
- ProxySuccessResponse.data is `Record<string, unknown>` — loses type info
- Batch results cast: `results as unknown as Record<string, unknown>[]` (batch.ts:124)

### Competitive Position Summary
| Dimension | Status |
|-----------|--------|
| Multi-provider flexibility | **WINNING** — only one doing 5 providers |
| Agent-first error handling | **WINNING** — agent_instruction is unique |
| Tool count | **LOSING** — 8 vs BrightData's 60+ |
| Extraction quality | **LOSING** — regex vs LLM-powered |
| Community/stars | **LOSING** — low vs Firecrawl 5.8K |
| Deep crawl | **MISSING** — map is shallow only |
| Free tier marketing | **MISSING** — no clear free tier landing page |
| Test coverage | **PARTIAL** — unit tests good, integration gaps |
