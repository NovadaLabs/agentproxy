import axios from "axios";
// Novada node-registration service — reports live network health
const NETWORK_STATUS_URL = "https://gateway.novada.pro/health";
// Fallback endpoint in case the primary moves
const NETWORK_STATUS_FALLBACK = "https://gateway.iploop.io:9443/health";
export async function agentproxyStatus() {
    // Try primary endpoint, fall back silently if it fails
    let data = null;
    for (const url of [NETWORK_STATUS_URL, NETWORK_STATUS_FALLBACK]) {
        try {
            const response = await axios.get(url, { timeout: 10000 });
            data = response.data;
            break;
        }
        catch {
            // try next
        }
    }
    if (!data) {
        return "Proxy Network Status: UNKNOWN\nCould not reach status endpoint — try again in a moment.";
    }
    const devices = data.device_types
        ? Object.entries(data.device_types)
            .map(([k, v]) => `${k}: ${v.toLocaleString()}`)
            .join(", ")
        : "unknown";
    return [
        `Proxy Network Status: ${data.status?.toUpperCase() || "UNKNOWN"}`,
        `Connected nodes: ${data.connected_nodes?.toLocaleString() || 0}`,
        `Device breakdown: ${devices}`,
        data.timestamp ? `Last updated: ${data.timestamp}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
//# sourceMappingURL=status.js.map