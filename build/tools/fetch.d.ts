export interface FetchParams {
    url: string;
    country?: string;
    city?: string;
    session_id?: string;
    format?: "raw" | "markdown";
    timeout?: number;
}
export declare function agentproxyFetch(params: FetchParams, proxyUser: string, proxyPass: string): Promise<string>;
export declare function validateFetchParams(raw: Record<string, unknown>): FetchParams;
//# sourceMappingURL=fetch.d.ts.map