/**
 * ProxyAdapter — the contract every proxy provider must satisfy.
 *
 * Adding a new provider = implement this interface in a new file,
 * register it in index.ts. Nothing else changes.
 */
export interface ProxyCredentials {
    /** Provider-specific key/value pairs (e.g. user, pass, host, port). */
    [key: string]: string;
}
export interface AdapterCapabilities {
    /** Supports 2-letter country-level geo-targeting. */
    country: boolean;
    /** Supports city-level geo-targeting. */
    city: boolean;
    /** Supports sticky sessions (same IP across requests with same session_id). */
    sticky: boolean;
}
export interface ProxyRequestParams {
    country?: string;
    city?: string;
    session_id?: string;
}
export interface ProxyAdapter {
    /** Internal identifier. Snake-case, lowercase. e.g. "novada", "brightdata" */
    readonly name: string;
    /** Human-readable name shown in error messages and status output. */
    readonly displayName: string;
    /**
     * ISO date when this adapter was last tested against live credentials.
     * Shown to users so they know how fresh the integration is.
     */
    readonly lastVerified: string;
    /** Which targeting features this provider supports. */
    readonly capabilities: AdapterCapabilities;
    /** URL or description of where users get credentials for this provider. */
    readonly credentialDocs: string;
    /**
     * Keys in ProxyCredentials that contain secrets.
     * Used to redact sensitive values from error messages before surfacing to agents.
     */
    readonly sensitiveFields: ReadonlyArray<string>;
    /**
     * Reads environment variables and returns a credentials object,
     * or null if this provider is not configured (required env vars missing).
     *
     * Implementations should not throw — return null for missing/incomplete config.
     */
    loadCredentials(env: NodeJS.ProcessEnv): ProxyCredentials | null;
    /**
     * Builds the full HTTP proxy URL for a given request.
     * Called once per request (or per retry batch).
     *
     * Must return a URL in the form:
     *   http://[encoded-user]:[encoded-pass]@[host]:[port]
     */
    buildProxyUrl(credentials: ProxyCredentials, params: ProxyRequestParams): string;
}
