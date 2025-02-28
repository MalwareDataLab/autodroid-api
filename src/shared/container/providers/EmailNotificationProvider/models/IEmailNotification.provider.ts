import { ISendEmailNotificationDTO } from "../types/IEmailNotification.dto";

export interface IEmailNotificationProvider {
  readonly initialization: Promise<void>;

  send(params: ISendEmailNotificationDTO): Promise<void>;
}
