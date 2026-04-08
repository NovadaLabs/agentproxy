export const VERSION = "1.3.0";

// Novada API endpoints
export const NOVADA_SEARCH_URL = "https://scraperapi.novada.com/search";
export const GATEWAY_URL = "https://gateway.iploop.io:9443/health";

// Novada Residential Proxy — username/password auth
// NOVADA_PROXY_HOST: set to your account-specific host from Dashboard → Endpoint Generator
//   for better reliability (especially sticky sessions). Falls back to shared host.
// Override AGENTPROXY_PROXY_PORT if your plan uses a different port.
export const PROXY_HOST = process.env.NOVADA_PROXY_HOST || process.env.AGENTPROXY_PROXY_HOST || "super.novada.pro";
export const PROXY_PORT = Number(process.env.AGENTPROXY_PROXY_PORT) || 7777;

// Novada Browser API — WebSocket endpoint (Puppeteer/Playwright)
// Default host; users set NOVADA_BROWSER_WS to their full wss:// URL from the dashboard
export const BROWSER_WS_HOST = process.env.NOVADA_BROWSER_HOST || "upg-scbr.novada.com";

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
