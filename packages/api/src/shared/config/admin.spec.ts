import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";

// Target import
import { getAdminConfig } from "./admin";

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

const getEnvConfigMock = vi.mocked(getEnvConfig);

describe("Config: getAdminConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should split ADMIN_EMAILS into a list", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({ ADMIN_EMAILS: "a@x.com,b@x.com" }),
    );

    expect(getAdminConfig()).toEqual({ emails: ["a@x.com", "b@x.com"] });
  });

  it("should default to a single empty entry when ADMIN_EMAILS is unset", () => {
    getEnvConfigMock.mockReturnValue(getEnvConfigMockValue({}));

    expect(getAdminConfig()).toEqual({ emails: [""] });
  });
});
