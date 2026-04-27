import type { ProxyAdapter, ProxyCredentials } from "../adapters/index.js";
export interface ExtractParams {
    url: string;
    fields: string[];
    country?: string;
    city?: string;
    session_id?: string;
    timeout?: number;
    render_fallback?: boolean;
}
export declare function shouldEscalateToRender(msg: string): boolean;
export declare function agentproxyExtract(params: ExtractParams, adapter: ProxyAdapter, credentials: ProxyCredentials, browserWsEndpoint?: string): Promise<string>;
/**
 * Heuristic field extraction from HTML.
 *
 * Uses common patterns: meta tags, Open Graph, Schema.org JSON-LD, headings,
 * and semantic HTML. Falls back to regex scanning for common field names.
 */
export declare function extractField(html: string, field: string): string | string[] | null;
export declare function deepFind(obj: unknown, key: string, depth?: number): unknown;
export declare function validateExtractParams(raw: Record<string, unknown>): ExtractParams;
