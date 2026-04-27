import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { VERSION } from "../config.js";
import { QUOTA_NOTE } from "../validation.js";
export async function agentproxyStatus(adapter, credentials) {
    const startTime = Date.now();
    let connectivity_status = "UNAVAILABLE";
    let proxy_ip;
    const verified_via = "https://httpbin.org/ip";
    if (adapter && credentials) {
        try {
            const proxyUrl = adapter.buildProxyUrl(credentials, {});
            const httpsAgent = new HttpsProxyAgent(proxyUrl);
            const response = await axios.get(verified_via, {
                httpsAgent,
                proxy: false,
                timeout: 10000,
            });
            const ip = response.data.origin?.split(",")[0]?.trim();
            if (ip) {
                proxy_ip = ip;
                connectivity_status = "HEALTHY";
            }
            else {
                connectivity_status = "DEGRADED";
            }
        }
        catch {
            connectivity_status = "UNAVAILABLE";
        }
    }
    const latency_ms = Date.now() - startTime;
    const capabilities = [];
    if (adapter) {
        if (adapter.capabilities.country)
            capabilities.push("country_targeting");
        if (adapter.capabilities.city)
            capabilities.push("city_targeting");
        if (adapter.capabilities.sticky)
            capabilities.push("sticky_sessions");
    }
    const result = {
        ok: true,
        tool: "agentproxy_status",
        data: {
            provider: adapter?.displayName || "none configured",
            version: VERSION,
            capabilities,
            connectivity: {
                status: connectivity_status,
                verified_via,
                proxy_ip,
                latency_ms,
            },
        },
        meta: {
            latency_ms,
            quota: { credits_estimated: 1, note: QUOTA_NOTE },
        },
    };
    // Remove undefined proxy_ip
    if (!proxy_ip) {
        delete result.data.connectivity.proxy_ip;
    }
    return JSON.stringify(result);
}
