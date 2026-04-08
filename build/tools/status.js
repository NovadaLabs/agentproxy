import axios from "axios";
import { GATEWAY_URL } from "../config.js";
export async function agentproxyStatus() {
    const response = await axios.get(GATEWAY_URL, {
        timeout: 10000,
    });
    const h = response.data;
    const devices = h.device_types
        ? Object.entries(h.device_types)
            .map(([k, v]) => `${k}: ${v.toLocaleString()}`)
            .join(", ")
        : "unknown";
    return [
        `Proxy Network Status: ${h.status?.toUpperCase() || "UNKNOWN"}`,
        `Connected nodes: ${h.connected_nodes?.toLocaleString() || 0}`,
        `Device breakdown: ${devices}`,
        h.timestamp ? `Last updated: ${h.timestamp}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
//# sourceMappingURL=status.js.map