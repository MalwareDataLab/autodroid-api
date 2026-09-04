import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { logger } from "@shared/utils/logger";

// Test target import
import { executeAction } from ".";

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));
vi.mock("@shared/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

const setTestEnv = (isTestEnv: boolean) =>
  (getEnvConfig as Mock).mockReturnValue({ isTestEnv });

describe("Utils: executeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    setTestEnv(true);
  });

  it("should return the action result without logging on the test environment", async () => {
    const result = await executeAction({
      actionName: "action",
      action: () => "value",
      logging: true,
    });

    expect(result).toBe("value");
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("should log a success message on the first attempt", async () => {
    setTestEnv(false);

    await executeAction({
      actionName: "action",
      action: () => "value",
      logging: true,
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("action success."),
    );
  });

  it("should retry and log the successful attempt number", async () => {
    setTestEnv(false);
    vi.useFakeTimers();

    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce("value");

    const promise = executeAction({
      actionName: "action",
      action,
      maxRetries: 2,
      retryDelay: 10,
      logging: true,
    });

    await vi.advanceTimersByTimeAsync(10);
    const result = await promise;

    expect(result).toBe("value");
    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("attempt 2"),
    );
  });

  it("should throw after exhausting the retries using the default delay", async () => {
    setTestEnv(false);
    vi.useFakeTimers();

    const action = vi.fn().mockRejectedValue(new Error("boom"));

    const promise = executeAction({
      actionName: "action",
      action,
      maxRetries: 1,
    }).catch(error => error);

    await vi.advanceTimersByTimeAsync(5000);
    const error = await promise;

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain("action failure after 1 retries");
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("should tolerate a thrown value without a message", async () => {
    const action = vi.fn().mockRejectedValue(undefined);

    await expect(
      executeAction({ actionName: "action", action }),
    ).rejects.toThrowError("action failure after 0 retries");
  });
});
