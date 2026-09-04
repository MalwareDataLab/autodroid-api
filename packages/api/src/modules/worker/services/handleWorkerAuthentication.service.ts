import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { parse } from "@shared/utils/instanceParser";

// DTO import
import { IParsedUserAgentInfoDTO } from "@shared/container/providers/UserAgentInfoProvider/types/IParsedUserAgentInfo.dto";

// Repository import
import { IWorkerRepository } from "../repositories/IWorker.repository";

// Entity import
import { WorkerSession } from "../entities/workerSession.entity";

// Util import
import { isWorkerTokenSignatureMatch } from "../utils/isWorkerTokenSignatureMatch.util";
import { verifyAndGetWorkerAccessTokenPayload } from "../utils/decodeAndValidateWorkerToken.util";

interface IRequest {
  access_token: string;
  agent_info?: IParsedUserAgentInfoDTO;
  language: string;
}

@injectable()
class HandleWorkerAuthenticationService {
  constructor(
    @inject("WorkerRepository")
    private workerRepository: IWorkerRepository,
  ) {}

  public async execute({
    access_token,
    language,
  }: IRequest): Promise<WorkerSession> {
    const t = await i18n(language);

    try {
      const payload = verifyAndGetWorkerAccessTokenPayload({
        access_token,
      });

      const worker = await this.workerRepository.findOne({
        id: payload.worker_id,
      });

      if (!worker)
        throw new AppError({
          key: "@handle_worker_authentication_service/WORKER_NOT_FOUND",
          message: t(
            "@handle_worker_authentication_service/WORKER_NOT_FOUND",
            "Worker not found.",
          ),
        });

      if (worker.archived_at)
        throw new AppError({
          key: "@handle_worker_authentication_service/WORKER_ARCHIVED",
          message: t(
            "@handle_worker_authentication_service/WORKER_ARCHIVED",
            "Worker archived.",
          ),
        });

      if (
        !isWorkerTokenSignatureMatch({
          worker,
          jwtPayload: payload,
        })
      )
        throw new AppError({
          key: "@handle_worker_authentication_service/INVALID_SIGNATURE",
          message: t(
            "@handle_worker_authentication_service/INVALID_SIGNATURE",
            "Invalid token signature.",
          ),
        });

      return parse(WorkerSession, {
        worker,
      } as WorkerSession);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({
        key: "@handle_worker_authentication_service/INVALID_TOKEN",
        message: t(
          "@handle_worker_authentication_service/INVALID_TOKEN",
          "Invalid or expired token.",
        ),
      });
    }
  }
}

export { HandleWorkerAuthenticationService };
