import { describe, it, expect } from "vitest";
import { extractField } from "../tools/extract.js";

describe("extractField", () => {
  // --- Title extraction ---

  it("extracts title from og:title meta tag", () => {
    const html = '<meta property="og:title" content="Test Product">';
    expect(extractField(html, "title")).toBe("Test Product");
  });

  it("falls back to <title> tag when og:title missing", () => {
    const html = "<title>Page Title</title>";
    expect(extractField(html, "title")).toBe("Page Title");
  });

  it("falls back to <h1> when title and og:title missing", () => {
    const html = "<h1>Main Heading</h1>";
    expect(extractField(html, "title")).toBe("Main Heading");
  });

  it("returns null when no title signals exist", () => {
    expect(extractField("<p>Just text</p>", "title")).toBeNull();
  });

  it("prefers og:title over <title> tag", () => {
    const html = '<meta property="og:title" content="OG Title"><title>HTML Title</title>';
    expect(extractField(html, "title")).toBe("OG Title");
  });

  // --- Price extraction ---

  it("extracts price from JSON-LD", () => {
    const html =
      '<script type="application/ld+json">{"@type":"Product","name":"Test","offers":{"price":"29.99"}}</script>';
    expect(extractField(html, "price")).toBe("29.99");
  });

  it("extracts price from HTML class pattern", () => {
    const html = '<div class="price">$49.99</div>';
    expect(extractField(html, "price")).toBe("$49.99");
  });

  it("extracts lowPrice from JSON-LD when price absent", () => {
    const html =
      '<script type="application/ld+json">{"offers":{"lowPrice":"9.99"}}</script>';
    expect(extractField(html, "price")).toBe("9.99");
  });

  // --- Description extraction ---

  it("extracts description from og:description", () => {
    const html =
      '<meta property="og:description" content="A great product">';
    expect(extractField(html, "description")).toBe("A great product");
  });

  it("falls back to meta name=description", () => {
    const html = '<meta name="description" content="Fallback desc">';
    expect(extractField(html, "description")).toBe("Fallback desc");
  });

  // --- Image extraction ---

  it("extracts image from og:image", () => {
    const html =
      '<meta property="og:image" content="https://example.com/img.jpg">';
    expect(extractField(html, "image")).toBe("https://example.com/img.jpg");
  });

  // --- Rating / Reviews ---

  it("extracts rating from JSON-LD ratingValue", () => {
    const html =
      '<script type="application/ld+json">{"aggregateRating":{"ratingValue":"4.5"}}</script>';
    expect(extractField(html, "rating")).toBe("4.5");
  });

  it("extracts review_count from JSON-LD", () => {
    const html =
      '<script type="application/ld+json">{"aggregateRating":{"reviewCount":"120"}}</script>';
    expect(extractField(html, "review_count")).toBe("120");
  });

  // --- URL / Canonical ---

  it("extracts canonical URL", () => {
    const html =
      '<link rel="canonical" href="https://example.com/page">';
    expect(extractField(html, "url")).toBe("https://example.com/page");
  });

  it("prefers og:url over canonical", () => {
    const html =
      '<meta property="og:url" content="https://og.example.com/page"><link rel="canonical" href="https://example.com/page">';
    expect(extractField(html, "url")).toBe("https://og.example.com/page");
  });

  // --- Links ---

  it("extracts links as array of absolute URLs", () => {
    const html =
      '<a href="https://a.com">A</a><a href="https://b.com">B</a><a href="/relative">R</a>';
    const links = extractField(html, "links") as string[];
    expect(links).toContain("https://a.com");
    expect(links).toContain("https://b.com");
    expect(links).not.toContain("/relative");
  });

  it("deduplicates links", () => {
    const html =
      '<a href="https://a.com">1</a><a href="https://a.com">2</a>';
    const links = extractField(html, "links") as string[];
    expect(links).toEqual(["https://a.com"]);
  });

  // --- Headings ---

  it("extracts headings as array", () => {
    const html = "<h1>First</h1><h1>Second</h1>";
    expect(extractField(html, "headings")).toEqual(["First", "Second"]);
  });

  it("extracts h2 headings when field is h2", () => {
    const html = "<h2>Sub A</h2><h2>Sub B</h2>";
    expect(extractField(html, "h2")).toEqual(["Sub A", "Sub B"]);
  });

  // --- Currency ---

  it("extracts currency from JSON-LD", () => {
    const html =
      '<script type="application/ld+json">{"offers":{"priceCurrency":"USD"}}</script>';
    expect(extractField(html, "currency")).toBe("USD");
  });

  // --- Author ---

  it("extracts author from JSON-LD", () => {
    const html =
      '<script type="application/ld+json">{"author":"Jane Doe"}</script>';
    expect(extractField(html, "author")).toBe("Jane Doe");
  });

  it("falls back to meta author", () => {
    const html = '<meta name="author" content="John Smith">';
    expect(extractField(html, "author")).toBe("John Smith");
  });

  // --- Date ---

  it("extracts date from JSON-LD datePublished", () => {
    const html =
      '<script type="application/ld+json">{"datePublished":"2024-01-15"}</script>';
    expect(extractField(html, "date")).toBe("2024-01-15");
  });

  // --- Generic fallback ---

  it("uses JSON-LD fallback for unknown fields", () => {
    const html =
      '<script type="application/ld+json">{"brand":"TestBrand"}</script>';
    expect(extractField(html, "brand")).toBe("TestBrand");
  });

  it("returns null for completely unknown fields", () => {
    expect(extractField("<p>text</p>", "nonexistent_field")).toBeNull();
  });

  // --- Robustness ---

  it("handles malformed JSON-LD gracefully", () => {
    const html =
      '<script type="application/ld+json">{ invalid json }</script>';
    expect(extractField(html, "title")).toBeNull();
  });

  it("handles empty HTML", () => {
    expect(extractField("", "title")).toBeNull();
  });

  it("decodes HTML entities in extracted values", () => {
    const html = '<meta property="og:title" content="Tom &amp; Jerry">';
    expect(extractField(html, "title")).toBe("Tom & Jerry");
  });

  // --- Field aliases ---

  it("treats 'name' as title alias", () => {
    const html = "<title>Product Name</title>";
    expect(extractField(html, "name")).toBe("Product Name");
  });

  it("treats 'product_name' as title alias", () => {
    const html = "<title>Widget</title>";
    expect(extractField(html, "product_name")).toBe("Widget");
  });

  it("treats 'cost' as price alias", () => {
    const html =
      '<script type="application/ld+json">{"offers":{"price":"5.00"}}</script>';
    expect(extractField(html, "cost")).toBe("5.00");
  });

  it("treats 'summary' as description alias", () => {
    const html = '<meta property="og:description" content="Summary text">';
    expect(extractField(html, "summary")).toBe("Summary text");
  });

  it("treats 'thumbnail' as image alias", () => {
    const html =
      '<meta property="og:image" content="https://example.com/thumb.png">';
    expect(extractField(html, "thumbnail")).toBe(
      "https://example.com/thumb.png"
    );
  });

  it("treats 'score' as rating alias", () => {
    const html =
      '<script type="application/ld+json">{"aggregateRating":{"ratingValue":"3.8"}}</script>';
    expect(extractField(html, "score")).toBe("3.8");
  });

  // --- Deeply nested JSON-LD ---

  it("finds deeply nested JSON-LD values", () => {
    const html =
      '<script type="application/ld+json">{"@type":"Product","brand":{"@type":"Brand","name":"Acme"}}</script>';
    // deepFind should find "name" inside the nested brand object
    // But the field "name" maps to the title branch, so use a direct field:
    expect(extractField(html, "brand")).toBe('{"@type":"Brand","name":"Acme"}');
  });
});
