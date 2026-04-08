export interface SessionParams {
    session_id: string;
    url: string;
    country?: string;
    format?: "raw" | "markdown";
    timeout?: number;
}
export declare function agentproxySession(params: SessionParams, proxyApiKey: string): Promise<string>;
export declare function validateSessionParams(raw: Record<string, unknown>): SessionParams;
//# sourceMappingURL=session.d.ts.map