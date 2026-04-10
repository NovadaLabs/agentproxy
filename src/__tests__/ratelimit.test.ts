import { describe, it, expect } from "vitest";

/**
 * Tests for the render concurrency limiter pattern used in index.ts.
 * We extract and test the logic directly rather than spinning up the MCP server.
 */

function createLimiter(max: number) {
  let active = 0;
  return {
    get active() { return active; },
    async run<T>(fn: () => Promise<T>): Promise<T | "rejected"> {
      if (active >= max) return "rejected";
      active++;
      try {
        return await fn();
      } finally {
        active--;
      }
    },
  };
}

describe("render concurrency limiter", () => {
  it("allows up to max concurrent calls", async () => {
    const limiter = createLimiter(3);
    let resolve1!: () => void;
    let resolve2!: () => void;
    let resolve3!: () => void;

    const p1 = limiter.run(() => new Promise<string>(r => { resolve1 = () => r("a"); }));
    const p2 = limiter.run(() => new Promise<string>(r => { resolve2 = () => r("b"); }));
    const p3 = limiter.run(() => new Promise<string>(r => { resolve3 = () => r("c"); }));

    expect(limiter.active).toBe(3);

    // 4th should be rejected
    const p4 = limiter.run(() => Promise.resolve("d"));
    expect(await p4).toBe("rejected");

    resolve1();
    resolve2();
    resolve3();
    expect(await p1).toBe("a");
    expect(await p2).toBe("b");
    expect(await p3).toBe("c");
  });

  it("releases slot on crash (finally block)", async () => {
    const limiter = createLimiter(1);

    // First call crashes
    const p1 = limiter.run(() => Promise.reject(new Error("boom")));
    await p1.catch(() => {});

    // Slot should be released — next call succeeds
    expect(limiter.active).toBe(0);
    const p2 = limiter.run(() => Promise.resolve("ok"));
    expect(await p2).toBe("ok");
  });

  it("slot is freed after resolution", async () => {
    const limiter = createLimiter(1);
    await limiter.run(() => Promise.resolve("done"));
    expect(limiter.active).toBe(0);

    // Can run again
    const result = await limiter.run(() => Promise.resolve("again"));
    expect(result).toBe("again");
  });
});

describe("PROXY4AGENT_MAX_RENDERS env var parsing", () => {
  function parseMaxRenders(val: string | undefined): number {
    const raw = Number(val);
    return Number.isInteger(raw) && raw > 0 && raw <= 20 ? raw : 3;
  }

  it("defaults to 3 when not set", () => {
    expect(parseMaxRenders(undefined)).toBe(3);
  });

  it("defaults to 3 for invalid values", () => {
    expect(parseMaxRenders("abc")).toBe(3);
    expect(parseMaxRenders("0")).toBe(3);
    expect(parseMaxRenders("-1")).toBe(3);
    expect(parseMaxRenders("21")).toBe(3);
    expect(parseMaxRenders("")).toBe(3);
    expect(parseMaxRenders("3.5")).toBe(3);
  });

  it("accepts valid values 1-20", () => {
    expect(parseMaxRenders("1")).toBe(1);
    expect(parseMaxRenders("5")).toBe(5);
    expect(parseMaxRenders("20")).toBe(20);
  });
});
