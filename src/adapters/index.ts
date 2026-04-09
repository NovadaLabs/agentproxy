import type { ProxyAdapter, ProxyCredentials } from "./types.js";
import { NovadaAdapter } from "./novada.js";

export type { ProxyAdapter, ProxyCredentials, ProxyRequestParams, AdapterCapabilities } from "./types.js";

/**
 * Registered proxy adapters in priority order.
 *
 * Resolution: the first adapter whose loadCredentials() returns non-null wins.
 * Novada is always first — it's our default and priority provider.
 *
 * To add a provider:
 *   1. Create src/adapters/<provider>.ts implementing ProxyAdapter
 *   2. Import it here and add it to the array below
 *   3. Nothing else changes
 */
const ADAPTERS: ProxyAdapter[] = [
  NovadaAdapter,
  // GenericHttpAdapter,  ← Phase 2: PROXY_URL=http://user:pass@host:port
  // BrightDataAdapter,   ← Phase 3
  // SmartproxyAdapter,   ← Phase 4
  // OxylabsAdapter,      ← Phase 4
];

export interface ResolvedAdapter {
  adapter: ProxyAdapter;
  credentials: ProxyCredentials;
}

/**
 * Resolve which proxy adapter to use based on available environment variables.
 * Returns the first configured adapter (Novada wins if multiple are set).
 * Returns null if no proxy provider is configured.
 */
export function resolveAdapter(env: NodeJS.ProcessEnv): ResolvedAdapter | null {
  for (const adapter of ADAPTERS) {
    const credentials = adapter.loadCredentials(env);
    if (credentials) return { adapter, credentials };
  }
  return null;
}

/**
 * List all registered adapters (for --help and status output).
 */
export function listAdapters(): ProxyAdapter[] {
  return [...ADAPTERS];
}
