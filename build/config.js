export const VERSION = "1.3.0";
// Novada Scraper API — web search
export const NOVADA_SEARCH_URL = "https://scraperapi.novada.com/search";
// Novada Residential Proxy — username/password auth
// NOVADA_PROXY_HOST: set to your account-specific host from Dashboard → Endpoint Generator
//   for better reliability (especially sticky sessions). Falls back to shared host.
// Override AGENTPROXY_PROXY_PORT if your plan uses a different port.
export const PROXY_HOST = process.env.NOVADA_PROXY_HOST || process.env.AGENTPROXY_PROXY_HOST || "super.novada.pro";
export const PROXY_PORT = Number(process.env.AGENTPROXY_PROXY_PORT) || 7777;
export const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
//# sourceMappingURL=config.js.map