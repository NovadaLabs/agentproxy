# Changelog

## v1.4.1 (2026-04-09)

### Security fixes
- **Country/city hyphen injection** — `SAFE_PARAM` allowed hyphens, enabling a caller to forge proxy username segments via `country="us-session-injected"`. All proxy auth params now use `SAFE_COUNTRY`/`SAFE_CITY`/`SAFE_PARAM` = `/^[a-zA-Z0-9_]+$/` (no hyphens).

### Bug fixes
- **NaN bypasses timeout validation** — `NaN < 1` and `NaN > 120` are both false, so non-numeric timeout values passed validation and produced `axios({ timeout: NaN })` (no timeout = hung request). Fixed with `Number.isFinite()` guard in fetch, session, render, and search validators. Same fix applied to `num` in search (was returning `[]` silently for NaN).
- **Non-Axios errors in search re-thrown raw** — network errors not caught by `axios.isAxiosError()` were re-thrown with potential API key exposure in the message. Now sanitized through the same `replaceAll` path.

### Package
- **Source maps excluded from published tarball** — `files` now explicitly lists `build/**/*.js` and `build/**/*.d.ts`, dropping ~25 KB of `.js.map` files irrelevant to CLI consumers.
- **CHANGELOG.md added to published tarball** — was missing from `files`.

### Cleanup
- Stale Bing-era comments removed from `search.ts`.

---

## v1.4.0 (2026-04-09)

### What's new
- **Renamed: `agentproxy` → `proxy-veil`** — previous name was too generic and conflicted with `agent-proxy` on npm. `proxy-veil` is distinctive, available, and captures what the product does (veils AI agent requests behind residential IPs).
- **CHANGELOG.md** — added to track what changed in every version going forward.
- **`--help` text reordered** — proxy credentials listed first (core product), API key and browser WS listed after (secondary tools).
- **`http-proxy-agent` added** — `httpAgent` now correctly uses `HttpProxyAgent` for plain HTTP targets; `httpsAgent` uses `HttpsProxyAgent` for HTTPS (CONNECT tunnel + TLS). Both were previously the same `HttpsProxyAgent` instance.
- **`NOVADA_PROXY_PORT` env var** — replaces legacy `AGENTPROXY_PROXY_PORT` (removed). Allows overriding the proxy port if your plan uses a non-standard one.

### Bug fixes
- **NOVADA_PROXY_USER not redacted in error messages** — proxy usernames (e.g. `user123-zone-res-region-us`) appeared verbatim in 407/connection error messages. Added `replaceAll` redaction alongside the existing pass/key redaction.
- **IPLoop fallback removed from `agentproxy_status`** — `gateway.iploop.io:9443/health` was silently called when the Novada status endpoint failed. Removed entirely; status now returns UNKNOWN cleanly if unreachable.
- **Render timeout applied twice** — `page.goto()` and `page.waitForSelector()` each received the full timeout, so real elapsed time could be 2× the user-specified value. Fixed with a shared deadline.
- **`decompress()` silent failure** — when a server declared `Content-Encoding: gzip` but body was undecompressable, the function fell through to returning raw binary as UTF-8. It now throws on explicitly-declared encodings (triggering the retry loop); silent fallback retained only when no header is present.
- **Legacy `AGENTPROXY_PROXY_HOST` / `AGENTPROXY_PROXY_PORT` env vars removed** — stale after rename, undocumented.
- **README "Why AgentProxy" heading** — renamed to "Why ProxyVeil".
- **`agentproxy_status` + `agentproxy_session` + `agentproxy_render` URL scheme validation** — all three `validateXxxParams` functions now check `http://`/`https://` prefix at the boundary, consistent with `fetch.ts`.
- **`agentproxy_search` country/language injection** — `country` and `language` params forwarded to API without validation; now checked against `SAFE_LOCALE` pattern.
- **`--list-tools` split broke on URLs** — was splitting description on first `.`, which broke descriptions containing `.com` URLs. Now splits on `. ` (period + space).
- **`node -e require(...)` in ESM package** — `build` script used CommonJS `require` in a `"type": "module"` package; fixed with `--input-type=commonjs`.
- **Class renamed** — `AgentProxyServer` → `ProxyVeilServer`.

---

## v1.3.0 (2026-04-08)

### What's new
- **Full Novada native migration** — removed all IPLoop references from user-facing code
- **Correct Novada proxy auth format** — `USERNAME-zone-res[-region-XX][-city-YY][-session-ID]` discovered from official docs and confirmed via live testing
- **`NOVADA_PROXY_HOST` env var** — account-specific host for reliable sticky sessions (defaults to `super.novada.pro` for rotating)
- **`agentproxy_render` rewrite** — switched from dead REST endpoint to real Novada Browser API (WebSocket + puppeteer-core); page always closed in `finally` to prevent server-side session leaks
- **Per-tool missing credential errors** — each tool now surfaces actionable instructions when its specific env var is missing
- **`replaceAll` credential redaction** — all env vars fully redacted from error messages (not just first occurrence)

### Bug fixes
- **Session IDs with hyphens silently broken** — Novada uses `-` as the username param delimiter; session IDs like `my-session` produced ambiguous auth strings. `SAFE_SESSION_ID` now disallows hyphens. Error message updated.
- **Bing search returning wrong-language results** — Novada Scraper API Bing integration broken at server level (returned Spanish Gmail for English proxy queries). Removed Bing, DuckDuckGo, Yahoo, Yandex. Google only.
- **Bing `num` param ignored** — API always returned 10 results regardless of `num`. Added client-side `results.slice(0, num)` cap.
- **Click-tracking URLs in search results** — `r.link` was returning Bing tracker URLs (`bing.com/ck/a?...`). Fixed: now uses `r.redirection_link || r.url || r.link`.
- **`BROWSER_WS_HOST` dead export** — removed unused export from `config.ts`
- **Scheme validation moved to boundary** — `validateFetchParams` now checks `http://`/`https://` prefix so the error surfaces at the MCP boundary, not inside the fetch function
- **`isRetryable` logic** — only retries network errors and 5xx; never retries 4xx (auth failures, not-found, etc.)

### Removed
- IPLoop proxy backend and all `IPLOOP_*` env vars
- Bing, DuckDuckGo, Yahoo, Yandex search engines (broken at API level)
- `GATEWAY_URL` export from `config.ts`

---

## v1.2.0 (2026-04-08)

### What's new
- **Independent reviewer audit** — all issues from first code review resolved before publish
- **`utils.ts`** — extracted shared utilities (`htmlToMarkdown`, `htmlToText`, `unicodeSafeTruncate`) used across fetch and render
- **Retry logic** — fetch and session tools retry once on network errors and 5xx
- **`decompress` function** — manual gzip/brotli/deflate decompression to fix ECONNABORTED on large pages (e.g. Amazon 1.6MB)
- **`maxContentLength: 50MB`** — prevents axios from choking on large pages

### Bug fixes
- `agentproxy_fetch` was using `decompress: true` which conflicted with the https-proxy-agent CONNECT tunnel on large pages
- `htmlToMarkdown` and `unicodeSafeTruncate` duplicated between files — consolidated into utils.ts

---

## v1.1.0 (2026-04-08)

### What's new
- **Single `NOVADA_API_KEY`** — replaced multi-key setup with one key for all Novada API access
- **`agentproxy_render`** — new tool for JavaScript-heavy pages using Novada Browser API
- **`agentproxy_status`** — new tool for proxy network health check (no credentials required)
- **`agentproxy_session`** — sticky session tool with dedicated endpoint

---

## v1.0.0 (2026-04-08)

Initial release.

- `agentproxy_fetch` — residential proxy fetch with country/city/session targeting
- `agentproxy_search` — structured web search via Novada Scraper API
- 5 MCP tools total
- Node.js 18+, stdio transport
