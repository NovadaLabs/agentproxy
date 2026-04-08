import { agentproxyFetch } from "./fetch.js";

// Mirrors the SAFE_PARAM guard in fetch.ts — prevent proxy URL injection
const SAFE_PARAM = /^[a-zA-Z0-9_-]+$/;
// session_id disallows hyphens — Novada uses `-` as username param delimiter
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
  proxyUser: string,
  proxyPass: string
): Promise<string> {
  // Session fetch is just a regular fetch with session_id locked in
  return agentproxyFetch(
    {
      url: params.url,
      session_id: params.session_id,
      country: params.country,
      format: params.format || "markdown",
      timeout: params.timeout,
    },
    proxyUser,
    proxyPass
  );
}

export function validateSessionParams(raw: Record<string, unknown>): SessionParams {
  if (!raw.session_id || typeof raw.session_id !== "string" || !SAFE_SESSION_ID.test(raw.session_id)) {
    throw new Error("session_id is required — letters, numbers, underscores only (no hyphens)");
  }
  if (!raw.url || typeof raw.url !== "string") {
    throw new Error("url is required");
  }
  if (raw.country !== undefined) {
    if (typeof raw.country !== "string" || !SAFE_PARAM.test(raw.country)) {
      throw new Error("country must be a 2-letter ISO code (e.g. US, DE, GB)");
    }
  }
  return {
    session_id: raw.session_id,
    url: raw.url,
    country: raw.country as string | undefined,
    format: (raw.format as "raw" | "markdown") || "markdown",
    timeout: raw.timeout ? Number(raw.timeout) : 60,
  };
}
