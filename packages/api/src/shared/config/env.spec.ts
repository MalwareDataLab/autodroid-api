import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Package import
import APP_INFO from "@/package.json";

// Target import
import { getEnvConfig } from "./env";

describe("Config: getEnvConfig", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCustom = process.env.__ENV_CONFIG_SPEC__;

  beforeEach(() => {
    process.env.__ENV_CONFIG_SPEC__ = "custom-value";
  });

  afterEach(() => {
    if (originalNodeEnv === undefined)
      delete (process.env as Record<string, unknown>).NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;

    if (originalCustom === undefined) delete process.env.__ENV_CONFIG_SPEC__;
    else process.env.__ENV_CONFIG_SPEC__ = originalCustom;
  });

  it("should spread process.env, expose APP_INFO and pass through env vars", () => {
    process.env.NODE_ENV = "test";

    const config = getEnvConfig();

    expect(config.__ENV_CONFIG_SPEC__).toBe("custom-value");
    expect(config.APP_INFO).toBe(APP_INFO);
  });

  it("should flag test environment when NODE_ENV is TEST (case-insensitive)", () => {
    process.env.NODE_ENV = "TEST";

    expect(getEnvConfig().isTestEnv).toBe(true);
  });

  it("should not flag test environment when NODE_ENV is development", () => {
    process.env.NODE_ENV = "development";

    expect(getEnvConfig().isTestEnv).toBe(false);
  });

  it("should not flag test environment when NODE_ENV is undefined", () => {
    delete (process.env as Record<string, unknown>).NODE_ENV;

    expect(getEnvConfig().isTestEnv).toBe(false);
  });
});
