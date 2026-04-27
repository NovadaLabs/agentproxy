import { describe, it, expect } from "vitest";
import { htmlToMarkdown, htmlToText, unicodeSafeTruncate } from "../utils.js";
describe("unicodeSafeTruncate", () => {
    it("returns short strings unchanged", () => {
        expect(unicodeSafeTruncate("hello", 10)).toBe("hello");
    });
    it("truncates to maxChars", () => {
        expect(unicodeSafeTruncate("abcdef", 3)).toBe("abc");
    });
    it("handles emoji (multi-byte) correctly", () => {
        const emoji = "Hello 🌍🌎🌏";
        // Each emoji = 2 UTF-16 code units (surrogate pair). maxChars=8 lands
        // on the low surrogate of 🌍 → backs up by 2, dropping the whole pair
        expect(unicodeSafeTruncate(emoji, 8)).toBe("Hello ");
        // maxChars=6 lands on ASCII space → no surrogate issue
        expect(unicodeSafeTruncate(emoji, 6)).toBe("Hello ");
        // maxChars=7 lands on high surrogate of 🌍 → backs up by 1
        expect(unicodeSafeTruncate(emoji, 7)).toBe("Hello ");
    });
    it("does not split surrogate pair when boundary is on low surrogate", () => {
        // "AB🌍" = [A, B, 0xD83C, 0xDF0D] — 4 code units
        // maxChars=3 → index 2 is high surrogate → end-- → "AB"
        expect(unicodeSafeTruncate("AB🌍", 3)).toBe("AB");
        // maxChars=4 → full string fits (length === maxChars)
        expect(unicodeSafeTruncate("AB🌍", 4)).toBe("AB🌍");
    });
});
describe("htmlToMarkdown", () => {
    it("strips script tags", () => {
        expect(htmlToMarkdown("<p>Hello</p><script>alert(1)</script>")).not.toContain("alert");
    });
    it("strips style tags", () => {
        expect(htmlToMarkdown("<style>.x{color:red}</style><p>Hello</p>")).not.toContain("color");
    });
    it("strips noscript tags", () => {
        expect(htmlToMarkdown("<noscript>JS disabled</noscript><p>Hello</p>")).not.toContain("JS disabled");
    });
    it("converts headings", () => {
        const md = htmlToMarkdown("<h1>Title</h1><h2>Sub</h2>");
        expect(md).toContain("# Title");
        expect(md).toContain("## Sub");
    });
    it("converts links", () => {
        const md = htmlToMarkdown('<a href="https://example.com">Link</a>');
        expect(md).toContain("[Link](https://example.com)");
    });
    it("converts list items", () => {
        const md = htmlToMarkdown("<ul><li>One</li><li>Two</li></ul>");
        expect(md).toContain("- One");
        expect(md).toContain("- Two");
    });
    it("decodes HTML entities", () => {
        const md = htmlToMarkdown("<p>&amp; &lt; &gt; &quot;</p>");
        expect(md).toContain("& < > \"");
    });
    it("collapses excessive newlines", () => {
        const md = htmlToMarkdown("<p>A</p><p></p><p></p><p>B</p>");
        expect(md).not.toContain("\n\n\n");
    });
    it("strips data: and javascript: URIs from links", () => {
        expect(htmlToMarkdown('<a href="data:text/html,<script>alert(1)</script>">click</a>')).toContain("click");
        expect(htmlToMarkdown('<a href="data:text/html,<script>alert(1)</script>">click</a>')).not.toContain("data:");
        expect(htmlToMarkdown('<a href="javascript:alert(1)">click</a>')).toContain("click");
        expect(htmlToMarkdown('<a href="javascript:alert(1)">click</a>')).not.toContain("javascript:");
    });
});
describe("htmlToText", () => {
    it("strips links but keeps text", () => {
        const text = htmlToText('<a href="http://x.com">Click</a>');
        expect(text).toContain("Click");
        expect(text).not.toContain("http://x.com");
    });
    it("strips heading markers", () => {
        const text = htmlToText("<h1>Title</h1>");
        expect(text).toContain("Title");
        expect(text).not.toContain("#");
    });
});
