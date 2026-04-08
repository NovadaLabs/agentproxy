import axios from "axios";
import { GATEWAY_URL } from "../config.js";

interface GatewayHealth {
  status: string;
  connected_nodes: number;
  device_types?: Record<string, number>;
  os_types?: Record<string, number>;
  timestamp?: string;
}

export async function agentproxyStatus(): Promise<string> {
  const response = await axios.get<GatewayHealth>(GATEWAY_URL, {
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
