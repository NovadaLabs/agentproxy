import axios from "axios";
// Novada node-registration service — reports live network health
const NETWORK_STATUS_URL = "https://gateway.novada.pro/health";
export async function agentproxyStatus() {
    // Try primary endpoint, fall back silently if it fails
    let data = null;
    try {
        const response = await axios.get(NETWORK_STATUS_URL, { timeout: 10000 });
        data = response.data;
    }
    catch {
        // endpoint unavailable
    }
    if (!data) {
        return "Proxy Network Status: UNKNOWN\nCould not reach status endpoint — try again in a moment.";
    }
    const devices = data.device_types
        ? Object.entries(data.device_types)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(", ")
        : "unknown";
    return [
        `Proxy Network Status: ${data.status?.toUpperCase() || "UNKNOWN"}`,
        `Connected nodes: ${data.connected_nodes ?? 0}`,
        `Device breakdown: ${devices}`,
        data.timestamp ? `Last updated: ${data.timestamp}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
