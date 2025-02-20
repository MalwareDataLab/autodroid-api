import { inject, injectable } from "tsyringe";

// i18n import
import { t } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// DTO import
import { IParsedUserAgentInfoDTO } from "@shared/container/providers/UserAgentInfoProvider/types/IParsedUserAgentInfo.dto";

// Util import
import { generateWorkerRefreshToken } from "../utils/generateWorkerToken.util";
import { isWorkerTokenSignatureMatch } from "../utils/isWorkerTokenSignatureMatch.util";
import { decodeAndGetWorkerRefreshTokenPayload } from "../utils/decodeAndValidateWorkerToken.util";

// Repository import
import { IWorkerRepository } from "../repositories/IWorker.repository";

// Entity import
import { Worker } from "../entities/worker.entity";

// Schema import
import { WorkerRefreshTokenSchema } from "../schemas/worker.schema";

interface IRequest {
  data: WorkerRefreshTokenSchema;
  agent_info?: IParsedUserAgentInfoDTO;
}

@injectable()
class WorkerUpdateRefreshTokenService {
  constructor(
    @inject("WorkerRepository")
    private workerRepository: IWorkerRepository,
  ) {}

  public async execute({ data, agent_info }: IRequest): Promise<Worker> {
    const {
      registration_token,
      internal_id,
      signature,

      worker_id,

      refresh_token,

      system_info,
    } = data;

    const worker = await this.workerRepository.findOne({
      registration_token,
      internal_id,
      signature,
      refresh_token,

      id: worker_id,
    });

    if (!worker)
      throw new AppError({
        key: "@worker_update_refresh_token_service/WORKER_NOT_FOUND",
        message: t(
          "worker_update_refresh_token_service/WORKER_NOT_FOUND",
          "Worker not found.",
        ),
      });

    if (worker.archived_at)
      throw new AppError({
        key: "@worker_update_refresh_token_service/WORKER_ARCHIVED",
        message: t(
          "worker_update_refresh_token_service/WORKER_ARCHIVED",
          "Worker archived.",
        ),
      });

    if (refresh_token || !!worker.refresh_token) {
      const payload = decodeAndGetWorkerRefreshTokenPayload({
        refresh_token,
      });

      if (
        !isWorkerTokenSignatureMatch({
          worker,
          jwtPayload: payload,
        })
      )
        throw new AppError({
          key: "@worker_update_refresh_token_service/INVALID_SIGNATURE",
          message: t(
            "@worker_update_refresh_token_service/INVALID_SIGNATURE",
            "Invalid token signature.",
          ),
        });
    }

    try {
      const { token, expires_at } = generateWorkerRefreshToken(worker);

      const updatedWorker = await this.workerRepository.updateOne(
        { id: worker.id },
        {
          refresh_token: token,
          refresh_token_expires_at: expires_at,
          agent_info: {
            ...worker.agent_info,
            ...agent_info,
          },
          system_info: {
            ...worker.system_info,
            ...system_info,
          },
        },
      );

      if (!updatedWorker)
        throw new AppError({
          key: "@worker_update_refresh_token_service/WORKER_NOT_UPDATED",
          message: t(
            "worker_update_refresh_token_service/WORKER_NOT_UPDATED",
            "Worker not updated.",
          ),
        });

      return updatedWorker;
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw new AppError({
        key: "@worker_update_refresh_token_service/FAIL_TO_GENERATE_REFRESH_TOKEN",
        message: t(
          "worker_update_refresh_token_service/FAIL_TO_GENERATE_REFRESH_TOKEN",
          "Error while creating a refresh token for the worker.",
        ),
        debug: { error },
      });
    }
  }
}

export { WorkerUpdateRefreshTokenService };
