export function unicodeSafeTruncate(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s;
  let end = maxChars;
  // Don't split a surrogate pair at the boundary
  const code = s.charCodeAt(end - 1);
  if (code >= 0xD800 && code <= 0xDBFF) end--;        // high surrogate stranded → drop it
  else if (code >= 0xDC00 && code <= 0xDFFF) end -= 2; // low surrogate → drop the whole pair
  return s.slice(0, end);
}

export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<h([1-6])[^>]*>/gi, (_, n) => "#".repeat(Number(n)) + " ")
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi,
      (_, href, text) => {
        const decoded = decodeHtmlEntities(href);
        if (decoded.startsWith("data:") || decoded.startsWith("javascript:")) return text;
        return `[${text}](${decoded})`;
      })
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlToText(html: string): string {
  return htmlToMarkdown(html)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // strip link URLs, keep text
    .replace(/#+\s/g, "")                       // strip heading markers
    .replace(/^-\s/gm, "")                      // strip list bullets
    .trim();
}
