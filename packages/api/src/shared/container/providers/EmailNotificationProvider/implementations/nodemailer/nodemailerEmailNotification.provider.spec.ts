import { beforeEach, describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";

import nodemailer from "nodemailer";
import handlebars from "handlebars";
import fs from "node:fs/promises";

// i18n import
import { i18next } from "@shared/i18n";

// Util import
import { getEmailConfig } from "@config/email";
import { logger } from "@shared/utils/logger";

// DTO import
import { ISendEmailNotificationDTO } from "../../types/IEmailNotification.dto";

// Provider import
import { NodemailerEmailNotificationProvider } from "./nodemailerEmailNotification.provider";

vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn() } }));
vi.mock("handlebars", () => ({
  default: { registerPartial: vi.fn(), compile: vi.fn() },
}));
vi.mock("node:fs/promises", () => ({ default: { readFile: vi.fn() } }));
vi.mock("@shared/i18n", () => ({ i18next: { cloneInstance: vi.fn() } }));
vi.mock("@config/email", () => ({ getEmailConfig: vi.fn() }));
vi.mock("@shared/utils/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const createTransportMock = vi.mocked(nodemailer.createTransport);
const compileMock = vi.mocked(handlebars.compile);
const readFileMock = vi.mocked(fs.readFile);
const cloneInstanceMock = vi.mocked(i18next.cloneInstance);
const getEmailConfigMock = vi.mocked(getEmailConfig);

const transporterMock = { verify: vi.fn(), sendMail: vi.fn() };

const i18nInstanceMock = {
  changeLanguage: vi.fn(),
  t: vi.fn((_key: string, def: string) => def),
};

const templateMock = vi.fn((_variables: any, options: any) => {
  options.helpers.t("en", "key", "sub", "default");
  options.helpers.concat("a", "b", "options");
  return "<html></html>";
});

const buildConfig = (
  overrides: Partial<Omit<ReturnType<typeof getEmailConfig>, "gmail">> & {
    gmail?: Partial<ReturnType<typeof getEmailConfig>["gmail"]>;
  } = {},
) =>
  ({
    to_override: null,
    default_bcc_emails: null,
    gmail: { user: "user@gmail.com", app_password: "app-password" },
    ...overrides,
  }) as ReturnType<typeof getEmailConfig>;

const buildSendParams = (
  overrides: Partial<ISendEmailNotificationDTO> = {},
): ISendEmailNotificationDTO => ({
  to: [{ email: faker.internet.email(), name: faker.person.fullName() }],
  cc: [{ email: faker.internet.email() }],
  bcc: [{ email: faker.internet.email() }],
  subject: faker.lorem.sentence(),
  template: {
    type: "generic",
    variables: {
      subject: faker.lorem.sentence(),
      preheader: faker.lorem.sentence(),
      title: faker.lorem.words(),
      message: [faker.lorem.sentence()],
      footer_text: [faker.lorem.sentence()],
      language: "en",
    },
  },
  ...overrides,
});

const createEnabledProvider = async () => {
  const provider = new NodemailerEmailNotificationProvider();
  await provider.initialization;
  return provider;
};

describe("Provider: NodemailerEmailNotificationProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEmailConfigMock.mockReturnValue(buildConfig());
    createTransportMock.mockReturnValue(transporterMock as any);
    compileMock.mockReturnValue(templateMock as any);
    readFileMock.mockResolvedValue("content");
    cloneInstanceMock.mockReturnValue(i18nInstanceMock as any);
    transporterMock.verify.mockResolvedValue(true);
    transporterMock.sendMail.mockResolvedValue(undefined);
  });

  it("should warn and disable sending when credentials are missing", async () => {
    getEmailConfigMock.mockReturnValue(
      buildConfig({ gmail: { user: undefined, app_password: undefined } }),
    );

    const provider = await createEnabledProvider();

    expect(logger.warn).toHaveBeenCalledOnce();
    expect(createTransportMock).not.toHaveBeenCalled();

    await expect(provider.send(buildSendParams())).rejects.toThrowError(
      expect.objectContaining({
        key: "@nodemailer_email_notification_provider/CLIENT_NOT_INITIALIZED",
      }),
    );
  });

  it("should initialize the transporter and compile the templates", async () => {
    await createEnabledProvider();

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ service: "gmail" }),
    );
    expect(transporterMock.verify).toHaveBeenCalledOnce();
    expect(handlebars.registerPartial).toHaveBeenCalledTimes(2);
    expect(compileMock).toHaveBeenCalledTimes(2);
  });

  it("should log an error when the initialization fails", async () => {
    transporterMock.verify.mockRejectedValueOnce(new Error("verify failed"));

    await createEnabledProvider();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Email notification provider init failed"),
    );
  });

  it("should send an email resolving recipients and template helpers", async () => {
    getEmailConfigMock.mockReturnValue(
      buildConfig({ default_bcc_emails: ["default-bcc@example.com"] }),
    );

    const provider = await createEnabledProvider();
    const bccEmail = faker.internet.email();
    const toEmail = faker.internet.email();

    await provider.send(
      buildSendParams({
        to: [{ email: toEmail, name: "Recipient" }],
        bcc: [{ email: bccEmail }],
      }),
    );

    expect(i18nInstanceMock.changeLanguage).toHaveBeenCalledWith("en");
    expect(templateMock).toHaveBeenCalledOnce();
    expect(transporterMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: [{ name: "Recipient", address: toEmail }],
        bcc: [bccEmail, "default-bcc@example.com"],
        html: "<html></html>",
      }),
    );
  });

  it("should use the override recipient and tolerate absent bcc lists", async () => {
    getEmailConfigMock.mockReturnValue(
      buildConfig({ to_override: ["override@example.com"] }),
    );

    const provider = await createEnabledProvider();

    await provider.send(buildSendParams({ bcc: undefined }));

    expect(transporterMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["override@example.com"],
        bcc: [],
      }),
    );
  });

  it("should throw when the requested template is not found", async () => {
    const provider = await createEnabledProvider();

    await expect(
      provider.send(
        buildSendParams({
          template: { type: "unknown" as any, variables: {} as any },
        }),
      ),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@nodemailer_email_notification_provider/TEMPLATE_NOT_FOUND",
      }),
    );
  });
});
