import type { ProxyAdapter, ProxyCredentials } from "./types.js";
export type { ProxyAdapter, ProxyCredentials, ProxyRequestParams, AdapterCapabilities } from "./types.js";
export interface ResolvedAdapter {
    adapter: ProxyAdapter;
    credentials: ProxyCredentials;
}
/**
 * Resolve which proxy adapter to use based on available environment variables.
 * Returns the first configured adapter (Novada wins if multiple are set).
 * Returns null if no proxy provider is configured.
 */
export declare function resolveAdapter(env: NodeJS.ProcessEnv): ResolvedAdapter | null;
/**
 * List all registered adapters (for --help and status output).
 */
export declare function listAdapters(): ProxyAdapter[];
