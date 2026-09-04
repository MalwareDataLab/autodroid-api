import { injectable, inject } from "tsyringe";
import { DoneCallback, Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IEmailNotificationProvider } from "@shared/container/providers/EmailNotificationProvider/models/IEmailNotification.provider";

// Interface import
import { ISendEmailNotificationDTO } from "@shared/container/providers/EmailNotificationProvider/types/IEmailNotification.dto";
import { IJob } from "@shared/container/providers/JobProvider/types/IJob";

// DTO import
import {
  IJobOptionsDTO,
  IQueueOptionsDTO,
} from "../../types/IAddJobOptions.dto";

type ISendEmailNotificationJob = ISendEmailNotificationDTO;

@injectable()
class SendEmailNotificationJob implements IJob {
  public readonly name = "SendEmailNotificationJob";
  public readonly concurrency = 1;

  public readonly jobOptions: IJobOptionsDTO = {
    attempts: 3,
    backoff: 1000,
    removeOnComplete: true,
    removeOnFail: true,
  };
  public readonly queueOptions: IQueueOptionsDTO = {};

  constructor(
    @inject("EmailNotificationProvider")
    private emailNotificationProvider: IEmailNotificationProvider,
  ) {}

  public async handle(
    job: Job<ISendEmailNotificationJob>,
    done: DoneCallback,
  ): Promise<void> {
    try {
      await this.emailNotificationProvider.send(job.data);

      done(
        null,
        `Email with subject "${job.data.subject}" sent to ${job.data.to.map(({ email }) => email).join(", ")}.`,
      );
    } catch (error: any) {
      done(
        new AppError({
          key: "@send_email_notification_job/ERROR",
          message: `Fail to send email with subject "${job.data.subject}" sent to ${job.data.to.map(({ email }) => email).join(", ")}.. ${error.message}`,
          debug: { error, data: job.data },
        }),
      );
    }
  }

  public async onFailed(_: Job, __: Error): Promise<void> {}
}

export type { ISendEmailNotificationJob };
export { SendEmailNotificationJob };
