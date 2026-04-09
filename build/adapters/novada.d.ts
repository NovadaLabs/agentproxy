import type { ProxyAdapter } from "./types.js";
/**
 * Novada residential proxy adapter.
 *
 * Auth format: USERNAME-zone-res[-region-XX][-city-CITY][-session-ID]:PASS@HOST:PORT
 *
 * Rules enforced here (not in tool validators — they handle user-facing input):
 * - Hyphen `-` is Novada's segment delimiter → never appears in country/city/session_id
 *   (enforced upstream in validateFetchParams / validateSessionParams)
 * - session_id → `-session-ID` suffix
 * - country → `-region-XX` suffix (lowercased)
 * - city    → `-city-CITY` suffix (lowercased)
 *
 * Env vars:
 *   NOVADA_PROXY_USER  — required
 *   NOVADA_PROXY_PASS  — required
 *   NOVADA_PROXY_HOST  — optional; defaults to super.novada.pro (shared load balancer)
 *                        Set to your account-specific host for reliable sticky sessions.
 *   NOVADA_PROXY_PORT  — optional; defaults to 7777
 */
export declare const NovadaAdapter: ProxyAdapter;
