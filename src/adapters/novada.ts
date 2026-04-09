import type { ProxyAdapter, ProxyCredentials, ProxyRequestParams } from "./types.js";

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
export const NovadaAdapter: ProxyAdapter = {
  name: "novada",
  displayName: "Novada",
  lastVerified: "2026-04-09",
  capabilities: { country: true, city: true, sticky: true },
  credentialDocs:
    "novada.com → Dashboard → Residential Proxies → Endpoint Generator",
  sensitiveFields: ["pass"],

  loadCredentials(env) {
    const user = env.NOVADA_PROXY_USER;
    const pass = env.NOVADA_PROXY_PASS;
    if (!user || !pass) return null;

    const rawPort = Number(env.NOVADA_PROXY_PORT);
    const port = Number.isInteger(rawPort) && rawPort > 0 && rawPort < 65536
      ? rawPort : 7777;

    return {
      user,
      pass,
      host: env.NOVADA_PROXY_HOST || "super.novada.pro",
      port: String(port),
    };
  },

  buildProxyUrl(credentials: ProxyCredentials, params: ProxyRequestParams): string {
    let username = `${credentials.user}-zone-res`;
    if (params.country) username += `-region-${params.country.toLowerCase()}`;
    if (params.city)    username += `-city-${params.city.toLowerCase()}`;
    if (params.session_id) username += `-session-${params.session_id}`;
    return `http://${encodeURIComponent(username)}:${encodeURIComponent(credentials.pass)}@${credentials.host}:${credentials.port}`;
  },
};
