import puppeteer from "puppeteer-core";
import { htmlToMarkdown, htmlToText, unicodeSafeTruncate } from "../utils.js";
export async function agentproxyRender(params, browserWsEndpoint) {
    const { url, format = "markdown", wait_for, timeout = 60 } = params;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        throw new Error("URL must start with http:// or https://");
    }
    const browser = await puppeteer.connect({
        browserWSEndpoint: browserWsEndpoint,
        defaultViewport: { width: 1366, height: 768 },
    });
    try {
        const page = await browser.newPage();
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: timeout * 1000,
        });
        if (wait_for) {
            await page.waitForSelector(wait_for, { timeout: timeout * 1000 });
        }
        const html = await page.content();
        const title = await page.title();
        const content = format === "html" ? html
            : format === "text" ? htmlToText(html)
                : htmlToMarkdown(html);
        const truncated = content.length > 100_000;
        const finalContent = truncated
            ? unicodeSafeTruncate(content, 100_000) + "\n\n[... truncated — rendered page is large]"
            : content;
        const size = (html.length / 1024).toFixed(0);
        const meta = [
            `URL: ${url}`,
            `Title: ${title}`,
            `Size: ${size} KB`,
            "Rendered: yes (Browser API)",
            truncated ? "Truncated: yes" : "",
        ]
            .filter(Boolean)
            .join(" | ");
        return `[${meta}]\n\n${finalContent}`;
    }
    finally {
        await browser.disconnect();
    }
}
export function validateRenderParams(raw) {
    if (!raw.url || typeof raw.url !== "string") {
        throw new Error("url is required");
    }
    const validFormats = ["markdown", "html", "text"];
    if (raw.format && !validFormats.includes(raw.format)) {
        throw new Error("format must be markdown, html, or text");
    }
    if (raw.wait_for !== undefined && typeof raw.wait_for !== "string") {
        throw new Error("wait_for must be a CSS selector string");
    }
    const timeout = raw.timeout ? Number(raw.timeout) : 60;
    if (timeout < 5 || timeout > 120)
        throw new Error("timeout must be 5-120 seconds");
    return {
        url: raw.url,
        format: raw.format || "markdown",
        wait_for: raw.wait_for,
        timeout,
    };
}
//# sourceMappingURL=render.js.map