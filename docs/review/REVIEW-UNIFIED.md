# Novada Proxy — Unified 5-Agent Review Report

> Generated 2026-04-27 by Opus orchestrator from 5 independent parallel agents.
> Total analysis: ~325K tokens input, 95 tool calls, 5 specialized perspectives.

---

## Executive Summary

proxy4agents v1.7.2 is a well-engineered MCP server with **genuinely unique agent-first design** that no competitor matches. The multi-provider architecture (5 providers) is the only one in the market. Error handling with `agent_instruction` is best-in-class. However, the review uncovered **3 must-fix production bugs, 11 high-priority issues, and 2 existential product gaps**.

**Agent-First Score: 8.8/10** — highest in category (BrightData 4.5, Firecrawl 4.8, Apify 5.2).
**Architecture Score: 7.5/10** — solid with specific memory risks.
**Security Posture: Above average** — systematic credential redaction with 4 specific blind spots.
**Test Coverage: 113 tests, but massive gaps** — zero integration tests, zero extraction tests, zero MCP handler tests.

---

## CRITICAL — Must Fix Before Next Release

### C1. `unicodeSafeTruncate` OOM on large pages (Architecture Agent)
**File:** `src/utils.ts:3`
`[...s]` spreads a 50MB string into ~50M array entries → 2-3GB heap → OOM crash.
**Fix:** Replace with surrogate-pair-safe `s.slice(0, end)` — 15 min.

### C2. HTML processed before truncation (Architecture Agent)
**File:** `src/tools/fetch.ts:165-169`
`htmlToMarkdown(body)` runs on full 50MB body, then truncates to 100K. 12 regex passes × 50MB = 600MB intermediate strings.
**Fix:** Truncate raw HTML to 500KB before markdown conversion — 10 min.

### C3. URL-encoded API key bypasses redaction (Security Agent)
**File:** `src/tools/search.ts:55`
`replaceAll(novadaApiKey, "***")` won't match URL-encoded variant (e.g., `abc+xyz` → `abc%2Bxyz`).
**Fix:** Add `replaceAll(encodeURIComponent(novadaApiKey), "***")` — 5 min.

### C4. Fatal error handler leaks credentials to stderr (Security Agent)
**File:** `src/index.ts:768`
`console.error("Fatal error:", error)` — no redaction applied. Puppeteer WS URL (contains user:pass) could leak.
**Fix:** Wrap with same redaction logic as tool handler — 15 min.

---

## HIGH — Fix Soon

| # | Issue | Source Agent | File | Fix Effort |
|---|-------|-------------|------|------------|
| H1 | `deepFind()` no depth limit — stack overflow on crafted JSON-LD | Architecture + Security | `extract.ts:314` | 5 min |
| H2 | Proxy IPs disclosed to httpbin.org (3rd party) | Security | `session.ts:57` / `status.ts:14` | 1 day (self-host endpoint) |
| H3 | Batch per-URL errors not redacted (raw error msgs returned) | Security | `batch.ts:89-105` | 30 min |
| H4 | `extract.ts:65` — `fetchWarning` truncation bypasses redaction | Security | `extract.ts:65` | 15 min |
| H5 | 4xx all classified as BOT_DETECTION — 404 triggers render retry | Agent UX | `index.ts:63-67` | 30 min |
| H6 | `batch_fetch` credits_estimated ignores cache hits | Agent UX | `batch.ts:130` | 15 min |
| H7 | `render` response missing `status_code`, `size_bytes` (inconsistent with `fetch`) | Agent UX | `render.ts:61-74` | 15 min |
| H8 | 2 phantom error codes never emitted (`PROXY_UNAVAILABLE`, `SESSION_STICKINESS_FAILED`) | Agent UX | `types.ts` | 10 min |
| H9 | `validateExtractParams` + `validateMapParams` — zero tests | Test Engineer | `extract.ts` / `map.ts` | 1 hr |
| H10 | `classifyError()` — 9 branches, zero tests | Test Engineer | `index.ts:52-104` | 2 hr |
| H11 | SAFE_COUNTRY/CITY/SESSION_ID regex duplicated in 5 files | Architecture | 5 tool files | 1 hr |

---

## MEDIUM — Improve Quality

| # | Issue | Source | Fix Effort |
|---|-------|--------|------------|
| M1 | `decodeEntities()` duplicated in utils.ts + extract.ts | Architecture | 5 min |
| M2 | QUOTA_NOTE string duplicated in 5 files | Architecture | 10 min |
| M3 | `data:` URIs pass through htmlToMarkdown links | Security | 15 min |
| M4 | No magic-byte check before decompression probe (3 wasted exceptions) | Architecture | 20 min |
| M5 | FIFO cache eviction — should be LRU | Architecture | 10 min |
| M6 | `agentproxy_session` vs `agentproxy_fetch` with session_id unclear | Agent UX | Docs only |
| M7 | `render` format enum differs from `fetch` (adds "text", removes "raw") | Agent UX | Docs only |
| M8 | `search` engine param — single-value enum is noise | Agent UX | 5 min |

---

## Test Coverage — Gap Summary

**Current: 113 tests across 5 files.**
**Needed: ~175 additional tests across 10+ new test files.**

| Category | Current Tests | Needed | Priority |
|----------|:------------:|:------:|:--------:|
| Validators (fetch/session/render/search/batch) | 82 | +25 (extract + map) | P0 |
| Error classification (classifyError) | 0 | +21 | P0 |
| Cache lifecycle (hit/miss/TTL/eviction) | 8 (key/TTL only) | +9 | P0 |
| Extraction logic (extractField, 15+ types) | 0 | +27 | P1 |
| Fetch integration (decompress/retry/truncate) | 0 | +12 | P1 |
| Map URL resolution | 0 | +12 | P1 |
| Batch error inference + aggregation | 0 | +9 | P1 |
| Search response parsing (4 formats) | 0 | +10 | P1 |
| Session verification flow | 0 | +7 | P1 |
| Status classification | 0 | +7 | P2 |
| MCP protocol (ListTools/CallTool/Prompts/Resources) | 0 | +12 | P2 |
| **Total** | **113** | **+175** | |

Test infrastructure needed:
- AxiosError mock factory
- Mock adapter factory
- HTML fixture files (Amazon, article, empty, malformed JSON-LD)
- Compressed buffer builders (gzip/brotli/deflate)
- Fake timers for cache TTL tests

---

## Competitive Position

### What You WIN On
| Dimension | proxy4agents | Nearest Competitor |
|-----------|-------------|-------------------|
| Agent-first errors | `agent_instruction` on every error | Nobody has this |
| Multi-provider | 5 adapters, zero lock-in | All others: single vendor |
| Cache transparency | `cache_hit` + `cache_age_seconds` | Nobody surfaces this |
| Tool decision trees | WHEN TO USE / USE INSTEAD in descriptions | BrightData has separate skills repo only |
| MCP prompts + resources | 4 prompts + 3 resources | Nobody else uses these MCP features |

### What You LOSE On
| Dimension | proxy4agents | Gap Leader |
|-----------|-------------|-----------|
| Recursive crawl | `map` (1 page) | Firecrawl (configurable depth) |
| Tool count | 8 tools | BrightData (60+) |
| LLM extraction | Regex heuristics | Firecrawl (schema + LLM) |
| GitHub stars | ~3 | Firecrawl (5,800+) |
| Free tier clarity | "free tier available" | BrightData ("5,000 req/mo free") |
| Package name | `bestproxy4agents-mcp` | `@brightdata/mcp` (professional) |

---

## Product Roadmap — Recommended

### Phase 1: Ship-Critical (Week 1-2)
1. Fix C1-C4 (critical bugs) — 45 min total
2. Fix H1-H8 — 3 hours total  
3. Add tests for classifyError + validators — 3 hours
4. Publish explicit free tier numbers in README line 1

### Phase 2: Competitive Parity (Week 3-6)
1. **`agentproxy_crawl`** — recursive multi-page with depth param (P0 gap)
2. **`agentproxy_post`** — POST/form submission support
3. **`agentproxy_screenshot`** — base64 PNG via existing puppeteer
4. **Split 4xx classification** — separate 404 from bot detection
5. Fix batch credits to subtract cache hits
6. Add 50+ integration tests

### Phase 3: Growth (Month 2-3)
1. **Rename npm package** → `@novada/proxy-mcp` (redirect old name)
2. **Benchmark page** — success rate vs BrightData/Firecrawl on 50 sites
3. **awesome-mcp-servers listing** + Show HN
4. **LangChain/CrewAI SDK wrapper**
5. **Content marketing** — "Agent-First MCP Design" blog post

### Phase 4: Category Leadership (Month 4-12)
1. LLM-powered extraction upgrade
2. Streamable HTTP transport
3. Dashboard/observability
4. Community adapter plugins
5. Target: 500+ stars, 12+ tools, recognized standard

---

## Positioning Verdict

**"The agent-first proxy MCP — works with any provider."**

The combined moat (agent_instruction + multi-provider + cache transparency + decision trees + MCP prompts/resources) creates a category of one. No competitor is optimizing for autonomous agent success. BrightData optimizes for enterprise, Firecrawl for RAG pipelines, Apify for orchestration. proxy4agents should own "agent-first" before anyone else claims it.

---

## Quick Win List (< 1 hour each, high impact)

1. ✅ Fix `unicodeSafeTruncate` OOM — 15 min (C1)
2. ✅ Fix pre-truncation HTML processing — 10 min (C2)
3. ✅ Fix URL-encoded API key redaction — 5 min (C3)
4. ✅ Fix fatal error credential leak — 15 min (C4)
5. ✅ Add `deepFind` depth limit — 5 min (H1)
6. ✅ Split 404 from bot detection — 30 min (H5)
7. ✅ Fix batch credits calculation — 15 min (H6)
8. ✅ Add `status_code`/`size_bytes` to render response — 15 min (H7)
9. ✅ Remove phantom error codes — 10 min (H8)
10. ✅ Extract shared validation constants — 1 hr (H11)

**Total: ~3.5 hours to fix all critical + high issues.**

---

*Report generated from 5 independent agents: Security Auditor, Test Coverage Engineer, Agent UX Specialist, Performance Architect, Product Strategist. All read-only, zero conflicts, run in parallel.*
