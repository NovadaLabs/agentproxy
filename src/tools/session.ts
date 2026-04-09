import { agentproxyFetch } from "./fetch.js";
import type { ProxyAdapter, ProxyCredentials } from "../adapters/index.js";

// No hyphens in any proxy username param — Novada (and most providers) use `-` as segment delimiter.
const SAFE_PARAM      = /^[a-zA-Z0-9_]+$/;
const SAFE_SESSION_ID = /^[a-zA-Z0-9_]+$/;

export interface SessionParams {
  session_id: string;
  url: string;
  country?: string;
  format?: "raw" | "markdown";
  timeout?: number;
}

export async function agentproxySession(
  params: SessionParams,
  adapter: ProxyAdapter,
  credentials: ProxyCredentials
): Promise<string> {
  // Session fetch is a regular fetch with session_id locked in
  return agentproxyFetch(
    {
      url:        params.url,
      session_id: params.session_id,
      country:    params.country,
      format:     params.format || "markdown",
      timeout:    params.timeout,
    },
    adapter,
    credentials
  );
}

export function validateSessionParams(raw: Record<string, unknown>): SessionParams {
  if (!raw.session_id || typeof raw.session_id !== "string" || raw.session_id.length > 64 || !SAFE_SESSION_ID.test(raw.session_id)) {
    throw new Error("session_id is required — letters, numbers, underscores only, max 64 chars (no hyphens)");
  }
  if (!raw.url || typeof raw.url !== "string") {
    throw new Error("url is required");
  }
  if (!raw.url.startsWith("http://") && !raw.url.startsWith("https://")) {
    throw new Error("url must start with http:// or https://");
  }
  if (raw.country !== undefined) {
    if (typeof raw.country !== "string" || raw.country.length > 10 || !SAFE_PARAM.test(raw.country)) {
      throw new Error("country must be a 2-letter ISO code with no hyphens (e.g. US, DE, GB)");
    }
  }
  const timeout = raw.timeout ? Number(raw.timeout) : 60;
  if (!Number.isFinite(timeout) || timeout < 1 || timeout > 120) {
    throw new Error("timeout must be between 1 and 120 seconds");
  }
  return {
    session_id: raw.session_id,
    url:        raw.url,
    country:    raw.country as string | undefined,
    format:     (raw.format as "raw" | "markdown") || "markdown",
    timeout,
  };
}
