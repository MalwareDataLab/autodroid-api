import nodemailer, { Transporter } from "nodemailer";
import handlebars from "handlebars";
import fs from "node:fs/promises";
import path from "node:path";

// i18n import
import { i18next } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { getEmailConfig } from "@config/email";
import { logger } from "@shared/utils/logger";
import { executeAction } from "@shared/utils/executeAction";
import { parseNodemailerAddresses } from "./utils/parseNodemailerAddresses.util";

// DTO import
import { ISendEmailNotificationDTO } from "../../types/IEmailNotification.dto";

// Interface import
import { IEmailNotificationProvider } from "../../models/IEmailNotification.provider";

export class NodemailerEmailNotificationProvider
  implements IEmailNotificationProvider
{
  public readonly initialization: Promise<void>;

  private readonly client: Transporter;
  private templates: Record<string, HandlebarsTemplateDelegate>;

  constructor() {
    const {
      gmail: { user, app_password },
    } = getEmailConfig();

    this.client = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass: app_password,
      },
      secure: true,
    });

    this.initialization = executeAction({
      action: () => this.init(),
      actionName: "Email notification provider init",
      retryDelay: 30 * 1000,
      logging: true,
    }).catch(error => {
      logger.error(
        `❌ Email notification provider init failed. Send attempts will fail. ${error.message}`,
      );
    });
  }

  private async init() {
    await this.client.verify();

    const viewPath = path.resolve(__dirname, "./views");
    const partials = ["header", "footer"];
    await Promise.all(
      partials.map(async partial => {
        const filePath = path.resolve(viewPath, "partials", `${partial}.hbs`);
        const fileContent = await fs.readFile(filePath, { encoding: "utf-8" });
        handlebars.registerPartial(partial, fileContent);
      }),
    );

    const templates = ["generic", "processingResult"];
    this.templates = await templates.reduce(
      async (acc, template) => {
        const accumulated = await acc;
        const filePath = path.resolve(viewPath, "templates", `${template}.hbs`);
        const fileContent = await fs.readFile(filePath, { encoding: "utf-8" });
        const compiledTemplate = handlebars.compile(fileContent);
        return { ...accumulated, [template]: compiledTemplate };
      },
      Promise.resolve({} as Record<string, HandlebarsTemplateDelegate>),
    );
  }

  public async send(params: ISendEmailNotificationDTO): Promise<void> {
    const { to_override, default_bcc_emails } = getEmailConfig();

    await this.initialization;

    const { to, cc, bcc, subject, template } = params;

    const selectedTemplate = this.templates[template.type];

    if (!selectedTemplate)
      throw new AppError({
        key: "@nodemailer_email_notification_provider/TEMPLATE_NOT_FOUND",
        message: `Template "${template.type}" not found.`,
        debug: params,
      });

    const i18n = i18next.cloneInstance({ initImmediate: true });

    const html = selectedTemplate(template.variables, {
      helpers: {
        t(lng: string, key: string, subkey: string, def: string) {
          i18n.changeLanguage(lng);
          return i18n.t(`${key}${subkey}`, def);
        },
        concat(...args: string[]) {
          args.pop();
          return args.join("");
        },
      },
    });

    await this.client.sendMail({
      to: to_override || parseNodemailerAddresses(to),
      cc: parseNodemailerAddresses(cc),
      bcc: [
        ...(parseNodemailerAddresses(bcc) || []),
        ...(default_bcc_emails || []),
      ],
      subject,
      html,
    });
  }
}
