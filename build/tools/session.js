import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { agentproxyFetch } from "./fetch.js";
import { SAFE_COUNTRY, SAFE_CITY, SAFE_SESSION_ID, QUOTA_NOTE } from "../validation.js";
export async function agentproxySession(params, adapter, credentials) {
    const { verify_sticky = false } = params;
    // Make the main fetch call
    const fetchResultStr = await agentproxyFetch({
        url: params.url,
        session_id: params.session_id,
        country: params.country,
        city: params.city,
        format: params.format || "markdown",
        timeout: params.timeout,
    }, adapter, credentials);
    // Parse the fetch result JSON
    let fetchResult;
    try {
        fetchResult = JSON.parse(fetchResultStr);
    }
    catch {
        // Fallback: return raw fetch result if JSON parsing fails
        return fetchResultStr;
    }
    // If verify_sticky requested, make a second call to httpbin.org/ip with same session
    let session_verified;
    if (verify_sticky && adapter.capabilities.sticky) {
        try {
            const proxyUrl = adapter.buildProxyUrl(credentials, {
                session_id: params.session_id,
                country: params.country,
            });
            const httpsAgent = new HttpsProxyAgent(proxyUrl);
            // First IP check via httpbin
            const ip1Resp = await axios.get("https://httpbin.org/ip", {
                httpsAgent,
                proxy: false,
                timeout: 15000,
            });
            const ip1 = ip1Resp.data.origin?.split(",")[0]?.trim();
            // Second IP check — same session, should return same IP
            const ip2Resp = await axios.get("https://httpbin.org/ip", {
                httpsAgent,
                proxy: false,
                timeout: 15000,
            });
            const ip2 = ip2Resp.data.origin?.split(",")[0]?.trim();
            session_verified = ip1 !== undefined && ip2 !== undefined && ip1 === ip2;
        }
        catch {
            // Verification call failed — leave session_verified undefined
            session_verified = false;
        }
    }
    // credits: 1 base + 2 for verify_sticky (2 httpbin calls)
    const creditsEstimated = verify_sticky ? 3 : 1;
    // Rebuild response with session_verified in meta
    const result = {
        ...fetchResult,
        tool: "agentproxy_session",
        meta: {
            ...fetchResult.meta,
            session_id: params.session_id,
            session_verified,
            quota: { credits_estimated: creditsEstimated, note: QUOTA_NOTE },
        },
    };
    if (result.meta.session_verified === undefined)
        delete result.meta.session_verified;
    return JSON.stringify(result);
}
export function validateSessionParams(raw) {
    if (!raw.session_id || typeof raw.session_id !== "string" || raw.session_id.length > 64 || !SAFE_SESSION_ID.test(raw.session_id)) {
        throw new Error("session_id is required — letters, numbers, underscores only, max 64 chars (no hyphens)");
    }
    if (!raw.url || typeof raw.url !== "string") {
        throw new Error("url is required");
    }
    if (!raw.url.startsWith("http://") && !raw.url.startsWith("https://")) {
        throw new Error("url must start with http:// or https://");
    }
    if (raw.country !== undefined) {
        if (typeof raw.country !== "string" || raw.country.length > 10 || !SAFE_COUNTRY.test(raw.country)) {
            throw new Error("country must be a 2-letter ISO code with no hyphens (e.g. US, DE, GB)");
        }
    }
    if (raw.city !== undefined) {
        if (typeof raw.city !== "string" || raw.city.length > 50 || !SAFE_CITY.test(raw.city)) {
            throw new Error("city must contain only letters, numbers, underscores, max 50 chars (e.g. newyork, london)");
        }
    }
    if (raw.format && raw.format !== "raw" && raw.format !== "markdown") {
        throw new Error("format must be 'raw' or 'markdown'");
    }
    const timeout = raw.timeout !== undefined ? Number(raw.timeout) : 60;
    if (!Number.isFinite(timeout) || timeout < 1 || timeout > 120) {
        throw new Error("timeout must be between 1 and 120 seconds");
    }
    return {
        session_id: raw.session_id,
        url: raw.url,
        country: raw.country,
        city: raw.city,
        format: raw.format || "markdown",
        timeout,
        verify_sticky: raw.verify_sticky === true,
    };
}
