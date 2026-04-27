export type ProxyErrorCode =
  | "BOT_DETECTION_SUSPECTED"
  | "SESSION_STICKINESS_FAILED"
  | "PAGE_NOT_FOUND"
  | "RATE_LIMITED"
  | "INVALID_INPUT"
  | "TIMEOUT"
  | "TLS_ERROR"
  | "NETWORK_ERROR"
  | "PROVIDER_NOT_CONFIGURED"
  | "UNKNOWN_ERROR";

export interface QuotaMeta {
  credits_estimated: number;   // estimated proxy credits used this call
  note: string;                // "Contact Novada dashboard for real-time balance"
}

export interface ProxySuccessResponse {
  ok: true;
  tool: string;
  data: Record<string, unknown>;
  meta: {
    latency_ms: number;
    proxy_ip?: string;
    country?: string;
    session_id?: string;
    session_verified?: boolean;
    truncated?: boolean;
    concurrency?: number;
    quota?: QuotaMeta;
    cache_hit?: boolean;        // true = served from in-process cache, false = live fetch
    cache_age_seconds?: number; // seconds since the cached entry was stored (only set when cache_hit=true)
  };
}

export interface ProxyErrorResponse {
  ok: false;
  error: {
    code: ProxyErrorCode;
    message: string;
    recoverable: boolean;
    agent_instruction: string;
    retry_after_seconds?: number;
  };
}

export type ProxyResponse = ProxySuccessResponse | ProxyErrorResponse;
