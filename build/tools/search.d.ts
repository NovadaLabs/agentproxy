export interface SearchParams {
    query: string;
    engine?: "google" | "bing" | "duckduckgo" | "yahoo" | "yandex";
    num?: number;
    country?: string;
    language?: string;
}
export declare function agentproxySearch(params: SearchParams, novadaApiKey: string): Promise<string>;
export declare function validateSearchParams(raw: Record<string, unknown>): SearchParams;
//# sourceMappingURL=search.d.ts.map