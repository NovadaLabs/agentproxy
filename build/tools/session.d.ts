import type { ProxyAdapter, ProxyCredentials } from "../adapters/index.js";
export interface SessionParams {
    session_id: string;
    url: string;
    country?: string;
    format?: "raw" | "markdown";
    timeout?: number;
}
export declare function agentproxySession(params: SessionParams, adapter: ProxyAdapter, credentials: ProxyCredentials): Promise<string>;
export declare function validateSessionParams(raw: Record<string, unknown>): SessionParams;
