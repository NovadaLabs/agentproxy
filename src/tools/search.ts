import axios from "axios";
import { NOVADA_SEARCH_URL, DEFAULT_USER_AGENT } from "../config.js";

export interface SearchParams {
  query: string;
  engine?: "google" | "bing" | "duckduckgo" | "yahoo" | "yandex";
  num?: number;
  country?: string;
  language?: string;
}

export async function agentproxySearch(
  params: SearchParams,
  novadaApiKey: string
): Promise<string> {
  const { query, engine = "google", num = 10, country = "", language = "" } = params;

  const searchParams = new URLSearchParams({
    q: query,
    api_key: novadaApiKey,
    engine,
    num: String(num),
  });

  if (engine === "bing") {
    // Bing requires explicit locale or proxy IPs return wrong-language results
    searchParams.set("country", country || "us");
    searchParams.set("language", language || "en");
    searchParams.set("mkt", language && country ? `${language}-${country.toUpperCase()}` : "en-US");
    searchParams.set("setlang", "en");
  } else {
    if (country) searchParams.set("country", country);
    if (language) searchParams.set("language", language);
  }

  const response = await axios.get(`${NOVADA_SEARCH_URL}?${searchParams.toString()}`, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Origin: "https://www.novada.com",
      Referer: "https://www.novada.com/",
    },
    timeout: 30000,
  });

  const data = response.data;
  if (data.code && data.code !== 200 && data.code !== 0) {
    throw new Error(`Novada API error (code ${data.code}): ${data.msg || "unknown error"}`);
  }

  const results: Array<{ title?: string; url?: string; link?: string; description?: string; snippet?: string }> =
    data.data?.organic_results || data.organic_results || data.data?.results || data.results || [];

  if (!results.length) {
    return `No results found for: "${query}"`;
  }

  const lines = [
    `Search: "${query}" via ${engine.toUpperCase()} — ${results.length} results\n`,
    ...results.map((r, i) => {
      const url = r.url || r.link || "N/A";
      const desc = r.description || r.snippet || "";
      return `${i + 1}. **${r.title || "Untitled"}**\n   ${url}\n   ${desc}`;
    }),
  ];

  return lines.join("\n");
}

export function validateSearchParams(raw: Record<string, unknown>): SearchParams {
  if (!raw.query || typeof raw.query !== "string") {
    throw new Error("query is required");
  }
  const validEngines = ["google", "bing", "duckduckgo", "yahoo", "yandex"];
  if (raw.engine && !validEngines.includes(raw.engine as string)) {
    throw new Error(`engine must be one of: ${validEngines.join(", ")}`);
  }
  const num = raw.num ? Number(raw.num) : 10;
  if (num < 1 || num > 20) throw new Error("num must be between 1 and 20");
  return {
    query: raw.query,
    engine: (raw.engine as SearchParams["engine"]) || "google",
    num,
    country: (raw.country as string) || "",
    language: (raw.language as string) || "",
  };
}
