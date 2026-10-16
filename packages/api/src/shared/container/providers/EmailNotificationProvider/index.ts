// Provider import
import { NodemailerEmailNotificationProvider } from "./implementations/nodemailer/nodemailerEmailNotification.provider";

const providers = {
  nodemailer: NodemailerEmailNotificationProvider,
};

const EmailNotificationProvider = providers.nodemailer;

export { EmailNotificationProvider };
