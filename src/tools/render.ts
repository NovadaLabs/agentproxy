import puppeteer from "puppeteer-core";
import { htmlToMarkdown, htmlToText, unicodeSafeTruncate } from "../utils.js";

export interface RenderParams {
  url: string;
  format?: "markdown" | "html" | "text";
  wait_for?: string;  // CSS selector to wait for before extracting
  timeout?: number;
}

export async function agentproxyRender(
  params: RenderParams,
  browserWsEndpoint: string
): Promise<string> {
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
    try {
      // Use a shared deadline so goto + waitForSelector together never exceed timeout
      const deadline = Date.now() + timeout * 1000;
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: timeout * 1000,
      });

      if (wait_for) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error(`Timeout waiting for selector: ${wait_for}`);
        await page.waitForSelector(wait_for, { timeout: remaining });
      }

      const html = await page.content();
      const title = await page.title();

      const content =
        format === "html" ? html
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
    } finally {
      // Always close the page to avoid server-side session leak (billed by session-second)
      await page.close().catch(() => {});
    }
  } finally {
    // Always disconnect even if newPage() throws (quota exhaustion, WS drop)
    await browser.disconnect();
  }
}

export function validateRenderParams(raw: Record<string, unknown>): RenderParams {
  if (!raw.url || typeof raw.url !== "string") {
    throw new Error("url is required");
  }
  if (!raw.url.startsWith("http://") && !raw.url.startsWith("https://")) {
    throw new Error("url must start with http:// or https://");
  }
  const validFormats = ["markdown", "html", "text"];
  if (raw.format && !validFormats.includes(raw.format as string)) {
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
  if (!Number.isFinite(timeout) || timeout < 5 || timeout > 120) throw new Error("timeout must be 5-120 seconds");
  return {
    url: raw.url,
    format: (raw.format as RenderParams["format"]) || "markdown",
    wait_for: raw.wait_for as string | undefined,
    timeout,
  };
}
