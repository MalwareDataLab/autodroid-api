import { describe, expect, it } from "vitest";

describe("Vitest worker parent-death guard", () => {
  it("should be loaded into this vitest worker via execArgv", () => {
    expect(
      process.execArgv.some(arg => arg.includes("vitestWorkerGuard.mjs")),
    ).toBe(true);
  });
});
