import type { ProxyAdapter, ProxyCredentials } from "../adapters/index.js";
export interface ExtractParams {
    url: string;
    fields: string[];
    country?: string;
    city?: string;
    session_id?: string;
    timeout?: number;
}
/**
 * Extract structured data from a URL using pattern matching on the fetched HTML.
 *
 * Strategy: fetch the raw HTML, then use regex + heuristic extraction for each
 * requested field. This is a lightweight alternative to LLM-based extraction —
 * fast, deterministic, and zero additional API cost.
 *
 * For more complex extraction needs, agents can use agentproxy_fetch(format="raw")
 * and do their own parsing.
 */
export declare function agentproxyExtract(params: ExtractParams, adapter: ProxyAdapter, credentials: ProxyCredentials): Promise<string>;
export declare function validateExtractParams(raw: Record<string, unknown>): ExtractParams;
