# Novada Proxy — 5-Agent Independent Review Protocol

> Generated 2026-04-27. Each agent operates independently with zero shared context.
> Run all 5 in parallel using the Orchestrator Protocol pattern.
> Model: Sonnet 4.6 for all agents. Reviewer: code-reviewer subagent type.

---

## Agent 1 — Security & Injection Auditor

**Role:** Security engineer specializing in proxy infrastructure and credential handling.
**Scope:** Credential leaks, input injection, SSRF, error message exposure. Do NOT review code quality, performance, or features.

### Prompt

```
You are a security auditor reviewing a residential proxy MCP server called "proxy4agents" (bestproxy4agents-mcp on npm). This server routes AI agent HTTP requests through residential IPs. Security is critical because:
- Proxy credentials (username + password) are embedded in HTTP proxy URLs
- API keys are passed as query parameters to search endpoints
- AI agents control all input parameters (url, country, city, session_id, wait_for CSS selectors)
- Error messages are returned to agents and may be logged by MCP hosts

## Project location
~/Projects/agentproxy/

## Files to audit (read ALL of these)
- src/index.ts — error classification (classifyError, lines 52-104), credential redaction (lines 363-375)
- src/tools/fetch.ts — proxy URL building, SAFE_COUNTRY/SAFE_CITY/SAFE_SESSION_ID regex (lines 62-64)
- src/tools/render.ts — wait_for CSS selector allowlist (line 103), puppeteer connection
- src/tools/search.ts — API key in query params (lines 29-39), sanitize function (line 55)
- src/tools/extract.ts — regex-based HTML parsing, JSON-LD parsing with JSON.parse
- src/tools/session.ts — sticky session verification via httpbin.org
- src/adapters/ — all 5 adapter files: novada.ts, brightdata.ts, smartproxy.ts, oxylabs.ts, generic.ts
- src/adapters/types.ts — sensitiveFields interface

## Specific attack vectors to check

1. **Proxy URL injection:** Can a crafted `country`, `city`, or `session_id` value modify the proxy auth string? The regex is /^[a-zA-Z0-9_]+$/ — is this sufficient for ALL 5 adapters? Could uppercase/lowercase differences cause issues in BrightData (-country-) vs Oxylabs (-cc-) vs Smartproxy (-country-)?

2. **Credential leakage paths:**
   - Error messages from axios (AxiosError.config.url contains full proxy URL with credentials)
   - Stack traces from puppeteer-core
   - console.error() calls in fetch.ts (line 127)
   - The Novada API key in search.ts query params — is the sanitize() function complete?

3. **SSRF via url parameter:** Can an agent fetch internal resources? file://, gopher://, dict:// protocols? Internal IPs (127.0.0.1, 169.254.x.x, 10.x.x.x)? The check is url.startsWith("http://") || url.startsWith("https://") — is this sufficient?

4. **CSS selector injection in wait_for:** The allowlist is /^[a-zA-Z0-9\s\[\]().#:*>,~+="'_-]+$/. Could a selector like [onclick="alert(1)"] cause Puppeteer to execute JavaScript? What about :has() selectors? url() in attribute selectors?

5. **Generic adapter PROXY_URL:** Users set PROXY_URL="http://user:pass@host:port". Is this parsed safely? Could a malicious PROXY_URL redirect traffic?

6. **Session verification leaks:** agentproxy_session makes requests to httpbin.org/ip. Could this leak the proxy IP to a third party in a way that compromises the session?

## Output format
```markdown
## CRITICAL (must fix — credential leak or injection possible)
[file:line — description — proof of concept]

## HIGH (should fix — defense in depth)
[file:line — description — recommended fix]

## MEDIUM (note — not exploitable but fragile)
[file:line — description]

## Security posture summary
[2-3 sentences: overall assessment]
```
```

---

## Agent 2 — Test Coverage & Reliability Engineer

**Role:** QA engineer focused on test completeness, edge cases, and production reliability.
**Scope:** Identify every untested code path. Write specific test descriptions (not implementations). Do NOT review security or code style.

### Prompt

```
You are a QA engineer auditing test coverage for "proxy4agents", a residential proxy MCP server. The project has 113 existing tests in 5 files but significant gaps. Your job: map every code path that is NOT tested, prioritize by blast radius, and write test descriptions.

## Project location
~/Projects/agentproxy/

## Current test files (read ALL)
- src/__tests__/validators.test.ts — tests validateFetchParams, validateSessionParams, validateRenderParams, validateSearchParams, validateBatchFetchParams
- src/__tests__/cache.test.ts — tests getCacheTtl, makeCacheKey, clearResponseCache
- src/__tests__/adapters.test.ts — tests all 5 adapter loadCredentials + buildProxyUrl + resolveAdapter
- src/__tests__/utils.test.ts — tests htmlToMarkdown, htmlToText, unicodeSafeTruncate
- src/__tests__/ratelimit.test.ts — tests render concurrency limiter + PROXY4AGENT_MAX_RENDERS env parsing

## Source files to audit for untested paths
- src/index.ts — classifyError() function (lines 52-104), MCP tool dispatch (lines 257-382), prompt handlers (lines 428-538), resource handlers (lines 565-687)
- src/tools/fetch.ts — agentproxyFetch() cache lookup/store/pruning, decompression fallback, retry logic, 100KB truncation
- src/tools/batch.ts — semaphore concurrency control, per-URL error capture, error code inference from message
- src/tools/extract.ts — extractField() heuristics (ALL 15+ field types), render escalation logic, JSON-LD deep search
- src/tools/map.ts — URL resolution, same-domain filtering, subdomain matching, sitemap hint
- src/tools/render.ts — puppeteer connection, shared deadline calculation, page close cleanup
- src/tools/session.ts — sticky verification (2 httpbin calls), session_verified edge cases
- src/tools/search.ts — API response parsing (4 different response formats), credential sanitization
- src/tools/status.ts — HEALTHY/DEGRADED/UNAVAILABLE classification

## What I need from you

1. **Coverage gap map:** For each source file, list every function or code path that has ZERO tests. Be specific — cite line numbers.

2. **Priority matrix:** Rank gaps by:
   - P0 (production risk): untested paths that handle real money (proxy credits) or credentials
   - P1 (reliability risk): untested paths that could silently return wrong data
   - P2 (quality): untested paths that affect error messaging or UX

3. **Test descriptions:** For each gap, write a specific test description in this format:
   ```
   describe("[function/module]", () => {
     it("[should do X when Y]")  // what the test checks, not how to implement it
   })
   ```
   Write at least 40 new test descriptions covering the gaps.

4. **Missing test categories:** What types of tests don't exist at all?
   - Integration tests (tool → cache → response)
   - Error path tests (classifyError with different error types)
   - MCP protocol tests (tool dispatch, prompt handling, resource serving)
   - Extraction logic tests (extractField for each field type)
   - End-to-end smoke tests

## Output format
```markdown
## Coverage Gap Map
[file → untested paths with line numbers]

## Priority Matrix
### P0 — Production Risk
[list]
### P1 — Reliability Risk
[list]
### P2 — Quality
[list]

## New Test Descriptions (minimum 40)
[grouped by file/module]

## Missing Test Categories
[what doesn't exist at all]

## Recommended test file structure
[where to put new tests]
```
```

---

## Agent 3 — Agent UX & DX Specialist

**Role:** AI agent developer who uses proxy MCP servers daily. Evaluates from the CONSUMER perspective — how easy and reliable is this to use as an agent?
**Scope:** Tool descriptions, error messages, decision guidance, onboarding friction, missing workflows. Do NOT review code internals.

### Prompt

```
You are an AI agent developer who builds autonomous agents using Claude Code and Cursor. You evaluate MCP servers from the agent's perspective — will the agent pick the right tool? Will it recover from errors? Will it waste credits?

## Context
You're evaluating "proxy4agents" (bestproxy4agents-mcp), a residential proxy MCP server with 8 tools. Your agents need to scrape websites, extract data, and do research autonomously. You're comparing this against:
- BrightData MCP (60+ tools, free 5K req/mo, AI-powered extraction)
- Firecrawl MCP (recursive crawl, LLM-schema extraction, 5.8K GitHub stars)
- Apify MCP (1000+ dynamic Actors)

## Project location
~/Projects/agentproxy/

## Files to evaluate (agent-facing surface)
- src/index.ts — TOOLS array (lines 108-235): read EVERY tool's name, description, and inputSchema
- src/index.ts — Prompts (lines 429-538): read all 4 prompt definitions
- src/index.ts — Resources (lines 544-687): read all 3 resource definitions
- src/types.ts — ProxySuccessResponse and ProxyErrorResponse shape
- src/index.ts — classifyError() (lines 52-104): read every error code + agent_instruction
- README.md on GitHub: NovadaLabs/Novada-proxy (fetch via gh api)

## Evaluation criteria

### 1. Tool Selection Clarity
For each of the 8 tools, answer:
- Could an agent confidently pick this tool from the description alone?
- Is the "WHEN TO USE" / "USE X INSTEAD" guidance sufficient?
- Are there ambiguous cases where an agent might pick the wrong tool?
- Would a one-line summary + decision flowchart be better?

### 2. Error Recovery
For each error code in classifyError():
- Is the agent_instruction specific enough for the agent to act on?
- Does the error include enough context to debug? (URL? status code? provider?)
- Are there error chains that an agent can't recover from without human help?

### 3. Missing Agent Workflows
What common agent tasks can't be done with the current 8 tools?
- Recursive multi-page crawl (map is shallow)
- CAPTCHA handling (no tool for this)
- Screenshot capture (render returns markdown, not images)
- PDF/document download
- Form submission / POST requests
- Authentication flow management (beyond sticky sessions)
- Proxy rotation strategy (when to rotate vs. stick)
- Credit/quota monitoring (status doesn't show remaining credits)
- Rate limit backoff coordination across parallel agents

### 4. Competitive Gaps (Agent Perspective)
Compare the agent experience vs. BrightData MCP, Firecrawl, Apify:
- Which tool descriptions are better/worse?
- Which error handling is more helpful?
- What features do agents actually need that competitors offer?

### 5. Onboarding Friction
Walk through the setup from zero:
1. Install: `claude mcp add bestproxy4agents-mcp -e ... -- npx -y bestproxy4agents-mcp`
2. First call: `agentproxy_status`
3. Common workflow: search → batch_fetch → extract
Rate each step: frictionless / minor friction / blocker

### 6. Agent-First Design Score
Rate 1-10 on each:
- Tool naming consistency (agentproxy_ prefix — helpful or noisy?)
- Response structure predictability (always ok/data/meta?)
- Credit transparency (does the agent know how many credits it used?)
- Self-diagnostic capability (can the agent debug failures without human help?)
- Workflow composability (can tools chain naturally?)

## Output format
```markdown
## Tool Selection Audit
[per-tool assessment]

## Error Recovery Audit
[per-error-code assessment]

## Missing Workflows (prioritized)
[list with agent use case]

## Competitive Gap Analysis
[comparison table from agent perspective]

## Agent-First Design Score
[dimension → score → justification]

## Top 5 Recommendations (ranked by agent impact)
[specific, actionable changes]
```
```

---

## Agent 4 — Performance & Architecture Reviewer

**Role:** Senior backend engineer focused on scalability, performance bottlenecks, and architectural soundness.
**Scope:** Memory management, concurrency patterns, caching efficiency, error handling architecture. Do NOT review security or agent UX.

### Prompt

```
You are a senior backend engineer reviewing the architecture and performance characteristics of "proxy4agents", a Node.js MCP server that routes HTTP requests through residential proxies. This server runs as a long-lived process (stdio transport) and handles tool calls from AI agents.

## Project location
~/Projects/agentproxy/

## Files to review (read ALL)
- src/index.ts — full server (770 lines), error classification, tool dispatch
- src/tools/fetch.ts — caching system (Map-based, 200 entry limit), decompression, retry logic
- src/tools/batch.ts — custom semaphore for concurrent fetches
- src/tools/render.ts — puppeteer-core browser connection per request
- src/tools/extract.ts — regex-based HTML parsing, render escalation
- src/tools/map.ts — URL resolution and deduplication
- src/tools/session.ts — sticky session verification via external service
- src/tools/status.ts — health check via proxy
- src/adapters/index.ts — provider resolution (runs once at startup)
- src/config.ts — constants
- src/types.ts — response types
- package.json — dependencies: axios, https-proxy-agent, http-proxy-agent, puppeteer-core

## Architecture questions to answer

### 1. Memory Model
- The cache in fetch.ts uses a global Map with 200 entry limit. Each entry stores a serialized JSON string. For a 100KB page, that's ~200 * 100KB = 20MB worst case. Is this acceptable? What happens under sustained load?
- pruneExpired() iterates the entire Map on every cache store (line 41-46 in fetch.ts). At 200 entries this is O(200) — fine. But is there a better eviction strategy?
- Cache entries store serialized JSON (string), which is then re-parsed on hit (line 112). Should it store the parsed object instead?

### 2. Concurrency Patterns
- batch.ts implements a custom semaphore (lines 44-65). Is this correct? Could it deadlock? Leak slots on error?
- render.ts uses a global counter (activeRenders in index.ts). In Node.js single-threaded model, is this safe? What about with --experimental-worker?
- Could concurrent batch_fetch + extract + session calls overwhelm the proxy provider? There's no global rate limiter.

### 3. Connection Management
- render.ts creates a new puppeteer browser connection per request (lines 26-29). Is this efficient? Should it use a connection pool?
- fetch.ts creates new HttpsProxyAgent + HttpProxyAgent per request (lines 131-132). Does axios reuse these agents or create new TCP connections each time?
- session.ts creates a new HttpsProxyAgent for verification calls (line 61). Is this redundant?

### 4. Error Handling Architecture
- classifyError() in index.ts (lines 52-104) matches error messages by string inclusion. This is fragile — could an error message from one category accidentally match another? Review all patterns.
- INPUT_ERROR_PHRASES (line 93) matches against user-visible error messages. Could a target website return content that triggers these phrases?
- The retry loop in fetch.ts (lines 137-231) retries on 5xx and network errors but not 4xx. Is this the right strategy for a proxy server?

### 5. Decompression Strategy
- fetch.ts uses responseType: "arraybuffer" + decompress: false + manual zlib (lines 75-86). The comment says axios decompress conflicts with https-proxy-agent CONNECT tunnel. Is this still true with current versions? Is the probe-based fallback (try gzip → brotli → deflate → raw) safe?

### 6. Scalability Concerns
- All state is in-process (cache, render counter, adapter resolution). What happens on process restart? Cold cache is fine, but are there race conditions during startup?
- TOOLS array (lines 108-235) is evaluated once. If a provider is added after startup, the tool descriptions are stale. Is this a problem?
- htmlToMarkdown in utils.ts uses a chain of regex replacements. For a 1MB HTML page, what's the performance? Could it hang?

## Output format
```markdown
## Architecture Assessment
[overall design quality: 1-10 with justification]

## Performance Hotspots
[ranked list with estimated impact]

## Concurrency Analysis
[per-pattern: correct/risky/broken]

## Memory Analysis
[worst-case calculations, leak risks]

## Recommended Changes (prioritized)
### Must Fix (production risk)
[list]
### Should Improve (scalability)
[list]
### Nice to Have (optimization)
[list]
```
```

---

## Agent 5 — Competitive Edge & Product Strategy Reviewer

**Role:** Product engineer who has used BrightData MCP, Firecrawl MCP, and Apify MCP in production. Evaluates proxy4agents as a product, not just code.
**Scope:** Feature gaps vs. competitors, positioning, missing monetization, growth strategy. Do NOT review code quality.

### Prompt

```
You are a product engineer who builds AI agent systems for a living. You've used BrightData MCP (60+ tools, free 5K req/mo), Firecrawl MCP (recursive crawl, LLM extraction), and Apify MCP (1000+ Actors) in production. Now you're evaluating "proxy4agents" (bestproxy4agents-mcp) as a potential replacement or addition to your stack.

## Project location
~/Projects/agentproxy/

## Files to read
- README.md (via: gh api repos/NovadaLabs/Novada-proxy/contents/README.md --jq '.content' | base64 -d)
- src/index.ts — tool descriptions (lines 108-235), prompts (429-538), resources (544-687)
- package.json — version, dependencies
- CHANGELOG.md (via: gh api repos/NovadaLabs/Novada-proxy/contents/CHANGELOG.md --jq '.content' | base64 -d)

## Also research these competitors (web search)
1. BrightData MCP: https://github.com/brightdata/brightdata-mcp — 60+ tools, free tier, CAPTCHA solving
2. Firecrawl MCP: https://github.com/firecrawl/firecrawl-mcp-server — recursive crawl, schema extraction
3. Apify MCP: https://github.com/apify/apify-mcp-server — dynamic Actor discovery, 1000+ scrapers
4. Oxylabs MCP — Amazon/Google specialized scrapers
5. Decodo (Smartproxy) MCP — via Composio integration

## Evaluation dimensions

### 1. Unique Value Proposition
What does proxy4agents offer that NO competitor does?
- Multi-provider (5 adapters) — unique?
- Agent-first error handling (agent_instruction) — unique?
- Response caching — unique?
- Tool decision tree in descriptions — unique?
Verdict: is the UVP strong enough to compete?

### 2. Feature Gap Analysis (P0/P1/P2)
For each missing feature, rate: P0 (blocking adoption), P1 (reduces competitiveness), P2 (nice to have)

Candidates:
- Recursive crawl (Firecrawl has it, proxy4agents only has shallow map)
- LLM-powered extraction (BrightData + Firecrawl have it, proxy4agents uses regex heuristics)
- CAPTCHA solving (BrightData has it)
- Screenshot/PDF capture (Firecrawl has it)
- POST request support (none of the tools support POST)
- Dynamic tool discovery (Apify does this)
- Free tier marketing (BrightData gives 5K req/mo free)
- Webhook/callback for async jobs
- Proxy rotation strategy tooling
- Credit/quota visibility in responses

### 3. Agent-First vs. Human-First
Score each product on agent-friendliness (1-10):
- proxy4agents: typed errors + agent_instruction + decision trees
- BrightData MCP: ?
- Firecrawl MCP: ?
- Apify MCP: ?

### 4. Positioning Strategy
Where should proxy4agents position itself?
Options:
A. "The multi-provider proxy MCP" — compete on flexibility
B. "The agent-first proxy MCP" — compete on DX
C. "The lightweight alternative to BrightData" — compete on simplicity
D. "The proxy layer for agents that already use Firecrawl" — complementary
What's the winning position?

### 5. Growth Levers
What would move the needle most for adoption?
- More GitHub stars (how?)
- Better registry presence (Smithery, LobeHub, MCP Registry)
- Integration guides (Claude Code, Cursor, Windsurf)
- Free tier with generous limits
- Community Actors/plugins
- Benchmark results vs. competitors

### 6. Monetization Readiness
Is proxy4agents ready for paid usage?
- Credit tracking in responses ✓
- Usage-based pricing signals ✓
- Missing: dashboard, billing, quota management, overage handling

## Output format
```markdown
## Unique Value Proposition Assessment
[what's real vs. what's claimed]

## Feature Gap Matrix
| Feature | proxy4agents | BrightData | Firecrawl | Apify | Priority |
|---------|-------------|------------|-----------|-------|----------|
[fill in]

## Agent-First Score Comparison
[table]

## Recommended Positioning
[one clear position with rationale]

## Top 5 Product Moves (ranked by adoption impact)
[specific, actionable]

## Monetization Readiness
[what's there, what's missing]
```
```

---

## Orchestration Notes

### Conflict Matrix
```
Agent 1 (Security)     → reads all files, writes nothing     → no conflict
Agent 2 (Testing)      → reads all files, writes nothing     → no conflict
Agent 3 (Agent UX)     → reads tool defs + README + web      → no conflict
Agent 4 (Performance)  → reads all source files               → no conflict
Agent 5 (Product)      → reads README + CHANGELOG + web      → no conflict
```
All 5 agents are read-only. Zero file conflicts. Run all in parallel.

### Model Assignment
All agents: Sonnet 4.6 (high-volume analysis, cost-controlled)
Orchestrator (you): Opus 4.6 (synthesis, conflict resolution, prioritization)

### Post-Review Synthesis
After all 5 complete, the orchestrator should:
1. Deduplicate findings across agents
2. Create a unified priority matrix (CRITICAL → HIGH → MEDIUM → LOW)
3. Group into implementation phases:
   - Phase 1: Security fixes + P0 test gaps (ship-blocking)
   - Phase 2: Agent UX improvements + missing workflows (competitive parity)
   - Phase 3: Architecture improvements + product features (growth)
4. Generate implementation tickets for each phase
