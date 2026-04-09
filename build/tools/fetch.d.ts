import type { ProxyAdapter, ProxyCredentials } from "../adapters/index.js";
export interface FetchParams {
    url: string;
    country?: string;
    city?: string;
    session_id?: string;
    format?: "raw" | "markdown";
    timeout?: number;
}
export declare function agentproxyFetch(params: FetchParams, adapter: ProxyAdapter, credentials: ProxyCredentials): Promise<string>;
export declare function validateFetchParams(raw: Record<string, unknown>): FetchParams;
