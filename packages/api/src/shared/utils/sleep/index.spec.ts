import { describe, expect, it, vi } from "vitest";

// Test target import
import { sleep } from ".";

describe("Utils: sleep", () => {
  it("should resolve after the given amount of milliseconds", async () => {
    vi.useFakeTimers();

    let resolved = false;
    const promise = sleep(1000).then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    expect(resolved).toBe(true);

    vi.useRealTimers();
  });
});
