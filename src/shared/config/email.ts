// Configuration import
import { getEnvConfig } from "@config/env";
import { isEmail } from "validator";

const getEmailConfig = () => {
  const envConfig = getEnvConfig();

  const isValidEmailList = (value?: string): value is string =>
    !!value &&
    value.split(",").length > 0 &&
    value.split(",").every(email => isEmail(email));

  return {
    to_override: isValidEmailList(
      envConfig.EMAIL_NOTIFICATION_PROVIDER_EMAIL_OVERRIDE_TO_EMAILS,
    )
      ? envConfig.EMAIL_NOTIFICATION_PROVIDER_EMAIL_OVERRIDE_TO_EMAILS.split(
          ",",
        )
      : null,
    default_bcc_emails: isValidEmailList(
      envConfig.EMAIL_NOTIFICATION_PROVIDER_EMAIL_DEFAULT_BCC_EMAILS,
    )
      ? envConfig.EMAIL_NOTIFICATION_PROVIDER_EMAIL_DEFAULT_BCC_EMAILS.split(
          ",",
        )
      : null,

    gmail: {
      user: envConfig.NODEMAILER_EMAIL_NOTIFICATION_PROVIDER_GMAIL_USER,
      app_password:
        envConfig.NODEMAILER_EMAIL_NOTIFICATION_PROVIDER_GMAIL_APP_PASSWORD,
    },
  };
};

export { getEmailConfig };
