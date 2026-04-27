import puppeteer from "puppeteer-core";
import { htmlToMarkdown, htmlToText, unicodeSafeTruncate } from "../utils.js";
import { QUOTA_NOTE } from "../validation.js";
export async function agentproxyRender(params, browserWsEndpoint) {
    const { url, format = "markdown", wait_for, timeout = 60 } = params;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        throw new Error("URL must start with http:// or https://");
    }
    const startTime = Date.now();
    const browser = await puppeteer.connect({
        browserWSEndpoint: browserWsEndpoint,
        defaultViewport: { width: 1366, height: 768 },
    });
    try {
        const page = await browser.newPage();
        try {
            // Use a shared deadline so goto + waitForSelector together never exceed timeout
            const deadline = Date.now() + timeout * 1000;
            const response = await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: timeout * 1000,
            });
            if (wait_for) {
                const remaining = deadline - Date.now();
                if (remaining <= 0)
                    throw new Error(`Timeout waiting for selector: ${wait_for}`);
                await page.waitForSelector(wait_for, { timeout: remaining });
            }
            const html = await page.content();
            const content = format === "html" ? html
                : format === "text" ? htmlToText(html)
                    : htmlToMarkdown(html);
            const truncated = content.length > 100_000;
            const finalContent = truncated
                ? unicodeSafeTruncate(content, 100_000) + "\n\n[... truncated — rendered page is large]"
                : content;
            const latency_ms = Date.now() - startTime;
            const statusCode = response?.status() ?? 200;
            const result = {
                ok: true,
                tool: "agentproxy_render",
                data: {
                    url,
                    status_code: statusCode,
                    content: finalContent,
                    content_type: "text/html",
                    size_bytes: html.length,
                    format,
                },
                meta: {
                    latency_ms,
                    truncated,
                    quota: { credits_estimated: 5, note: "Browser API is metered separately — " + QUOTA_NOTE },
                },
            };
            return JSON.stringify(result);
        }
        finally {
            // Always close the page to avoid server-side session leak (billed by session-second)
            await page.close().catch(() => { });
        }
    }
    finally {
        // Always disconnect even if newPage() throws (quota exhaustion, WS drop)
        await browser.disconnect();
    }
}
export function validateRenderParams(raw) {
    if (!raw.url || typeof raw.url !== "string") {
        throw new Error("url is required");
    }
    if (!raw.url.startsWith("http://") && !raw.url.startsWith("https://")) {
        throw new Error("url must start with http:// or https://");
    }
    const validFormats = ["markdown", "html", "text"];
    if (raw.format && !validFormats.includes(raw.format)) {
        throw new Error("format must be markdown, html, or text");
    }
    if (raw.wait_for !== undefined) {
        if (typeof raw.wait_for !== "string" || raw.wait_for.length > 200) {
            throw new Error("wait_for must be a CSS selector string (max 200 chars)");
        }
        // Allowlist: only safe CSS selector characters — no backticks, braces, or semicolons
        const SAFE_SELECTOR = /^[a-zA-Z0-9\s\[\]().#:*>,~+="'_-]+$/;
        if (!SAFE_SELECTOR.test(raw.wait_for)) {
            throw new Error("wait_for contains invalid characters for a CSS selector");
        }
    }
    const timeout = raw.timeout !== undefined ? Number(raw.timeout) : 60;
    if (!Number.isFinite(timeout) || timeout < 5 || timeout > 120)
        throw new Error("timeout must be 5-120 seconds");
    return {
        url: raw.url,
        format: raw.format || "markdown",
        wait_for: raw.wait_for,
        timeout,
    };
}
