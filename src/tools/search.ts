import axios from "axios";
import { NOVADA_SEARCH_URL, DEFAULT_USER_AGENT } from "../config.js";
import { QUOTA_NOTE } from "../validation.js";
import type { ProxySuccessResponse } from "../types.js";

const SAFE_LOCALE = /^[a-zA-Z0-9_-]{1,10}$/;

export interface SearchParams {
  query: string;
  engine?: "google";
  num?: number;
  country?: string;
  language?: string;
}

export async function agentproxySearch(
  params: SearchParams,
  novadaApiKey: string
): Promise<string> {
  const { query, engine = "google", num = 10, country = "", language = "" } = params;

  // Guard: validate locale params even when called directly (not via validateSearchParams)
  if (country && !SAFE_LOCALE.test(country)) throw new Error("country contains invalid characters");
  if (language && !SAFE_LOCALE.test(language)) throw new Error("language contains invalid characters");

  // Note: Novada Scraper API authenticates via query param (api_key), not header.
  // The key is therefore visible in server-side access logs — this is an API design
  // constraint of the current Novada endpoint. We mitigate by never including the
  // key in error messages surfaced to the agent (see sanitizeMessage below).
  const searchParams = new URLSearchParams({
    q: query,
    api_key: novadaApiKey,
    engine,
    num: String(num),
  });

  if (country) searchParams.set("country", country);
  if (language) searchParams.set("language", language);

  const requestUrl = `${NOVADA_SEARCH_URL}?${searchParams.toString()}`;
  const startTime = Date.now();

  let response;
  try {
    response = await axios.get(requestUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Origin: "https://www.novada.com",
        Referer: "https://www.novada.com/",
      },
      timeout: 30000,
    });
  } catch (err) {
    // Sanitize: never surface the request URL (contains api_key) in error messages
    // Sanitize api_key from all error paths — it's embedded in the request URL
    const sanitize = (s: string) =>
      s.replaceAll(novadaApiKey, "***")
       .replaceAll(encodeURIComponent(novadaApiKey), "***");
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const msg = sanitize(String(err.response?.data?.msg || err.message));
      throw new Error(status ? `Search API HTTP ${status}: ${msg}` : `Search API error: ${msg}`);
    }
    throw new Error(sanitize(String(err instanceof Error ? err.message : err)));
  }

  const latency_ms = Date.now() - startTime;
  const data = response.data;
  if (data.code && data.code !== 200 && data.code !== 0) {
    throw new Error(`Novada search error (${data.code}): ${String(data.msg || "unknown")}`);
  }

  const rawResults: Array<{
    title?: string;
    url?: string;
    link?: string;
    redirection_link?: string;
    description?: string;
    snippet?: string;
  }> = data.data?.organic_results || data.organic_results || data.data?.results || data.results || [];

  const results = rawResults.slice(0, num).map(r => ({
    title: r.title || "Untitled",
    url: r.redirection_link || r.url || r.link || "",
    snippet: r.description || r.snippet || "",
  }));

  const result: ProxySuccessResponse = {
    ok: true,
    tool: "agentproxy_search",
    data: {
      query,
      engine,
      count: results.length,
      results,
    },
    meta: {
      latency_ms,
      quota: { credits_estimated: 1, note: QUOTA_NOTE },
    },
  };

  return JSON.stringify(result);
}

export function validateSearchParams(raw: Record<string, unknown>): SearchParams {
  if (!raw.query || typeof raw.query !== "string") {
    throw new Error("query is required");
  }
  if (raw.query.length > 500) {
    throw new Error("query must be 500 characters or less");
  }
  if (raw.engine && raw.engine !== "google") {
    throw new Error("engine must be 'google' — other engines have known quality issues");
  }
  const num = raw.num !== undefined ? Number(raw.num) : 10;
  if (!Number.isFinite(num) || num < 1 || num > 20) throw new Error("num must be between 1 and 20");
  if (raw.country && (typeof raw.country !== "string" || !SAFE_LOCALE.test(raw.country as string))) {
    throw new Error("country must be a short locale code (e.g. us, uk, de)");
  }
  if (raw.language && (typeof raw.language !== "string" || !SAFE_LOCALE.test(raw.language as string))) {
    throw new Error("language must be a short language code (e.g. en, zh, de)");
  }
  return {
    query: raw.query,
    engine: (raw.engine as SearchParams["engine"]) || "google",
    num,
    country: (raw.country as string) || "",
    language: (raw.language as string) || "",
  };
}
