import { agentproxyFetch } from "./fetch.js";
export async function agentproxySession(params, proxyApiKey) {
    // Session fetch is just a regular fetch with session_id locked in
    const result = await agentproxyFetch({
        url: params.url,
        session_id: params.session_id,
        country: params.country,
        format: params.format || "markdown",
        timeout: params.timeout,
    }, proxyApiKey);
    return result;
}
export function validateSessionParams(raw) {
    if (!raw.session_id || typeof raw.session_id !== "string") {
        throw new Error("session_id is required — use the same ID across requests to get the same IP");
    }
    if (!raw.url || typeof raw.url !== "string") {
        throw new Error("url is required");
    }
    return {
        session_id: raw.session_id,
        url: raw.url,
        country: raw.country,
        format: raw.format || "markdown",
        timeout: raw.timeout ? Number(raw.timeout) : 30,
    };
}
//# sourceMappingURL=session.js.map