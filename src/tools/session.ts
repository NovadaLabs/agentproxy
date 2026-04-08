import { agentproxyFetch, validateFetchParams } from "./fetch.js";

export interface SessionParams {
  session_id: string;
  url: string;
  country?: string;
  format?: "raw" | "markdown";
  timeout?: number;
}

export async function agentproxySession(
  params: SessionParams,
  proxyApiKey: string
): Promise<string> {
  // Session fetch is just a regular fetch with session_id locked in
  const result = await agentproxyFetch(
    {
      url: params.url,
      session_id: params.session_id,
      country: params.country,
      format: params.format || "markdown",
      timeout: params.timeout,
    },
    proxyApiKey
  );
  return result;
}

export function validateSessionParams(raw: Record<string, unknown>): SessionParams {
  if (!raw.session_id || typeof raw.session_id !== "string") {
    throw new Error("session_id is required — use the same ID across requests to get the same IP");
  }
  if (!raw.url || typeof raw.url !== "string") {
    throw new Error("url is required");
  }
  return {
    session_id: raw.session_id,
    url: raw.url,
    country: raw.country as string | undefined,
    format: (raw.format as "raw" | "markdown") || "markdown",
    timeout: raw.timeout ? Number(raw.timeout) : 30,
  };
}
