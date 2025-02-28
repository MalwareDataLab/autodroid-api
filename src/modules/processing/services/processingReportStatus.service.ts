import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Repository import
import { getFrontendConfig } from "@config/frontend";
import { IProcessingRepository } from "../repositories/IProcessing.repository";

// Enum import
import { PROCESSING_STATUS } from "../types/processingStatus.enum";

interface IRequest {
  processing_id: string;
}

@injectable()
class ProcessingReportStatusService {
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("JobProvider")
    private jobProvider: IJobProvider,
  ) {}

  public async execute({ processing_id }: IRequest): Promise<void> {
    const processing = await this.processingRepository.findOne({
      id: processing_id,
    });

    if (!processing)
      throw new AppError({
        key: "@processing_report_status_service/PROCESSING_NOT_FOUND",
        message: "Processing not found.",
        debug: { processing_id },
      });

    if (processing.reported_at) return;
    if (!processing.user.notifications_enabled) return;

    const t = await i18n(processing.user.language || "pt-BR");

    const result =
      processing.status === PROCESSING_STATUS.SUCCEEDED
        ? t(
            "@processing_report_status_service/PROCESSING_REPORT_STATUS_EMAIL_SUBJECT_SUCCESS",
            "sucesso",
          )
        : t(
            "@processing_report_status_service/PROCESSING_REPORT_STATUS_EMAIL_SUBJECT_FAILURE",
            "falha",
          );

    this.jobProvider.add("SendEmailNotificationJob", {
      to: [
        {
          email: processing.user.email,
          name: processing.user.name,
        },
      ],
      subject: t(
        "@processing_report_status_service/PROCESSING_REPORT_STATUS_EMAIL_SUBJECT",
        "[Malware DataLab] Experimento {{seq}} finalizado com {{result}}",
        {
          seq: processing.seq,
          result,
        },
      ),
      template: {
        type: "processingResult",
        variables: {
          processing_id: processing.id,
          processing_seq: processing.seq,
          button_url: encodeURI(
            `${getFrontendConfig().FRONTEND_URL}/process/result/${
              processing.id
            }`,
          ),
          result,
        },
      },
    });
  }
}

export { ProcessingReportStatusService };
