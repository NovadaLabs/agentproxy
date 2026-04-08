import { agentproxyFetch } from "./fetch.js";
// Mirrors the SAFE_PARAM guard in fetch.ts — prevent proxy URL injection
const SAFE_PARAM = /^[a-zA-Z0-9_-]+$/;
export async function agentproxySession(params, proxyUser, proxyPass) {
    // Session fetch is just a regular fetch with session_id locked in
    return agentproxyFetch({
        url: params.url,
        session_id: params.session_id,
        country: params.country,
        format: params.format || "markdown",
        timeout: params.timeout,
    }, proxyUser, proxyPass);
}
export function validateSessionParams(raw) {
    if (!raw.session_id || typeof raw.session_id !== "string") {
        throw new Error("session_id is required — use the same ID across requests to get the same IP");
    }
    if (!raw.url || typeof raw.url !== "string") {
        throw new Error("url is required");
    }
    if (raw.country !== undefined) {
        if (typeof raw.country !== "string" || !SAFE_PARAM.test(raw.country)) {
            throw new Error("country must be a 2-letter ISO code (e.g. US, DE, GB)");
        }
    }
    return {
        session_id: raw.session_id,
        url: raw.url,
        country: raw.country,
        format: raw.format || "markdown",
        timeout: raw.timeout ? Number(raw.timeout) : 60,
    };
}
//# sourceMappingURL=session.js.map