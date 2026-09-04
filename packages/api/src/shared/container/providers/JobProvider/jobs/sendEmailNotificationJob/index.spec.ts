import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";
import { Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IEmailNotificationProvider } from "@shared/container/providers/EmailNotificationProvider/models/IEmailNotification.provider";

// Test target import
import { ISendEmailNotificationJob, SendEmailNotificationJob } from ".";

describe("Job: SendEmailNotificationJob", () => {
  const emailData: ISendEmailNotificationJob = {
    to: [
      { name: "Ada", email: "ada@example.com" },
      { name: null, email: "grace@example.com" },
    ],
    subject: "Processing finished",
    template: {
      type: "generic",
      variables: {
        subject: "Processing finished",
        preheader: "Your processing has finished",
        title: "Processing finished",
        message: ["Your processing has finished."],
        footer_text: ["Autodroid"],
        language: "en",
      },
    },
  };

  let emailNotificationProvider: Mocked<IEmailNotificationProvider>;
  let done: ReturnType<typeof vi.fn>;

  let sendEmailNotificationJob: SendEmailNotificationJob;

  const buildJob = () =>
    ({ data: emailData }) as unknown as Job<ISendEmailNotificationJob>;

  beforeEach(() => {
    emailNotificationProvider = {
      initialization: Promise.resolve(),
      send: vi.fn(),
    };
    done = vi.fn();

    sendEmailNotificationJob = new SendEmailNotificationJob(
      emailNotificationProvider,
    );
  });

  it("should send the email and report every recipient", async () => {
    emailNotificationProvider.send.mockResolvedValueOnce(undefined);

    await sendEmailNotificationJob.handle(buildJob(), done);

    expect(emailNotificationProvider.send).toHaveBeenCalledWith(emailData);
    expect(done).toHaveBeenCalledWith(
      null,
      'Email with subject "Processing finished" sent to ada@example.com, grace@example.com.',
    );
  });

  it("should finish with an application error when the email cannot be sent", async () => {
    const failure = new Error("smtp is down");
    emailNotificationProvider.send.mockRejectedValueOnce(failure);

    await sendEmailNotificationJob.handle(buildJob(), done);

    expect(done).toHaveBeenCalledOnce();
    const [error] = done.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.key).toBe("@send_email_notification_job/ERROR");
    expect(error.message).toBe(
      'Fail to send email with subject "Processing finished" sent to ada@example.com, grace@example.com.. smtp is down',
    );
    expect(error.debug.error).toBe(failure);
    expect(error.debug.data).toBe(emailData);
  });

  it("should do nothing when the job definitively fails", async () => {
    await expect(
      sendEmailNotificationJob.onFailed(buildJob(), new Error("exhausted")),
    ).resolves.toBeUndefined();
  });
});
