import { inject, injectable } from "tsyringe";

// i18n import
import { t } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// DTO import
import { IParsedUserAgentInfoDTO } from "@shared/container/providers/UserAgentInfoProvider/types/IParsedUserAgentInfo.dto";

// Util import
import { generateWorkerAccessToken } from "../utils/generateWorkerToken.util";
import { isWorkerTokenSignatureMatch } from "../utils/isWorkerTokenSignatureMatch.util";
import { verifyAndGetWorkerRefreshTokenPayload } from "../utils/decodeAndValidateWorkerToken.util";

// Repository import
import { IWorkerRepository } from "../repositories/IWorker.repository";

// Entity import
import { WorkerAccessToken } from "../entities/workerAccessToken.entity";

// Schema import
import { WorkerRefreshTokenSchema } from "../schemas/worker.schema";

interface IRequest {
  data: WorkerRefreshTokenSchema;
  agent_info?: IParsedUserAgentInfoDTO;
}

@injectable()
class WorkerGenerateAccessTokenService {
  constructor(
    @inject("WorkerRepository")
    private workerRepository: IWorkerRepository,
  ) {}

  public async execute({
    data,
    agent_info,
  }: IRequest): Promise<WorkerAccessToken> {
    const {
      name,

      registration_token,
      internal_id,
      signature,

      worker_id,

      refresh_token,

      system_info,
    } = data;

    try {
      const payload = verifyAndGetWorkerRefreshTokenPayload({
        refresh_token,
      });

      const worker = await this.workerRepository.findOne({
        registration_token,
        internal_id,
        signature,

        id: worker_id,

        refresh_token,
      });

      if (!worker)
        throw new AppError({
          key: "@worker_generate_access_token_service/WORKER_NOT_FOUND",
          message: t(
            "worker_generate_access_token_service/WORKER_NOT_FOUND",
            "Worker not found.",
          ),
        });

      if (worker.archived_at)
        throw new AppError({
          key: "@worker_generate_access_token_service/WORKER_ARCHIVED",
          message: t(
            "worker_generate_access_token_service/WORKER_ARCHIVED",
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
          key: "@worker_generate_access_token_service/INVALID_SIGNATURE",
          message: t(
            "@worker_generate_access_token_service/INVALID_SIGNATURE",
            "Invalid token signature.",
          ),
        });

      const { token, expires_at } = generateWorkerAccessToken(worker);

      const updatedWorker = await this.workerRepository.updateOne(
        { id: worker.id },
        {
          name,
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
          key: "@worker_generate_access_token_service/WORKER_NOT_UPDATED",
          message: t(
            "worker_generate_access_token_service/WORKER_NOT_UPDATED",
            "Worker not updated.",
          ),
        });

      return WorkerAccessToken.make({
        access_token: token,
        access_token_expires_at: expires_at,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw new AppError({
        key: "@worker_generate_access_token_service/FAIL_TO_GENERATE_ACCESS_TOKEN",
        message: t(
          "worker_generate_access_token_service/FAIL_TO_GENERATE_ACCESS_TOKEN",
          "Error while creating a access token for the worker.",
        ),
        debug: { error },
      });
    }
  }
}

export { WorkerGenerateAccessTokenService };
