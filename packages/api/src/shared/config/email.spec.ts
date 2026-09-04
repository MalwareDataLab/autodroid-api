import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

// Util import
import { getEnvConfigMockValue } from "@/test/utils/getEnvConfigMockValue.util";

// Target import
import { getEmailConfig } from "./email";

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

const getEnvConfigMock = vi.mocked(getEnvConfig);

describe("Config: getEmailConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should split valid override and bcc email lists", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        EMAIL_NOTIFICATION_PROVIDER_EMAIL_OVERRIDE_TO_EMAILS: "a@x.com,b@x.com",
        EMAIL_NOTIFICATION_PROVIDER_EMAIL_DEFAULT_BCC_EMAILS: "c@x.com",
        NODEMAILER_EMAIL_NOTIFICATION_PROVIDER_GMAIL_USER: "gmail@x.com",
        NODEMAILER_EMAIL_NOTIFICATION_PROVIDER_GMAIL_APP_PASSWORD: "app-pass",
      }),
    );

    expect(getEmailConfig()).toEqual({
      to_override: ["a@x.com", "b@x.com"],
      default_bcc_emails: ["c@x.com"],
      gmail: {
        user: "gmail@x.com",
        app_password: "app-pass",
      },
    });
  });

  it("should return null for an invalid override list and an absent bcc list", () => {
    getEnvConfigMock.mockReturnValue(
      getEnvConfigMockValue({
        EMAIL_NOTIFICATION_PROVIDER_EMAIL_OVERRIDE_TO_EMAILS:
          "a@x.com,not-email",
      }),
    );

    const config = getEmailConfig();

    expect(config.to_override).toBeNull();
    expect(config.default_bcc_emails).toBeNull();
  });
});
