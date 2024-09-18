import { inject, injectable } from "tsyringe";

// i18n import
import { t } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// DTO import
import { IParsedUserAgentInfoDTO } from "@shared/container/providers/UserAgentInfoProvider/types/IParsedUserAgentInfo.dto";

// Repository import
import { IWorkerRepository } from "../repositories/IWorker.repository";
import { IWorkerRegistrationTokenRepository } from "../repositories/IWorkerRegistrationToken.repository";

// Entity import
import { Worker } from "../entities/worker.entity";

// Schema import
import { WorkerRegisterSchema } from "../schemas/worker.schema";
import { WorkerUpdateRefreshTokenService } from "./workerUpdateRefreshToken.service";

interface IRequest {
  data: WorkerRegisterSchema;
  agent_info?: IParsedUserAgentInfoDTO;
}

@injectable()
class WorkerRegisterService {
  private workerUpdateRefreshTokenService: WorkerUpdateRefreshTokenService;

  constructor(
    @inject("WorkerRegistrationTokenRepository")
    private workerRegistrationTokenRepository: IWorkerRegistrationTokenRepository,

    @inject("WorkerRepository")
    private workerRepository: IWorkerRepository,
  ) {
    this.workerUpdateRefreshTokenService = new WorkerUpdateRefreshTokenService(
      workerRepository,
    );
  }

  public async execute({ data, agent_info }: IRequest): Promise<Worker> {
    const { registration_token, internal_id, signature, system_info } = data;

    const registrationToken =
      await this.workerRegistrationTokenRepository.findOne({
        token: registration_token,
      });

    if (!registrationToken)
      throw new AppError({
        key: "@worker_register_service/REGISTRATION_TOKEN_NOT_FOUND",
        message: t(
          "worker_register_service.REGISTRATION_TOKEN_NOT_FOUND",
          "Registration token not found.",
        ),
      });

    const existingSignature = await this.workerRepository.findOne({
      signature,
    });

    if (existingSignature)
      throw new AppError({
        key: "@worker_register_service/SIGNATURE_ALREADY_USED",
        message: t(
          "worker_register_service.SIGNATURE_ALREADY_USED",
          "Signature already used.",
        ),
      });

    try {
      const worker = await this.workerRepository.createOne({
        registration_token_id: registrationToken.id,
        internal_id,
        signature,

        user_id: registrationToken.user_id,

        system_info,
        agent_info: {
          ...agent_info,
        },
        payload: {},

        refresh_token: "",
        refresh_token_expires_at: new Date(),
      });

      const workerWithRefreshToken =
        await this.workerUpdateRefreshTokenService.execute({
          data: {
            internal_id,
            registration_token,
            signature,

            system_info: {
              ...worker.system_info,
              ...system_info,
            },

            worker_id: worker.id,
            refresh_token: "",
          },
          agent_info,
        });

      return workerWithRefreshToken;
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw new AppError({
        key: "@worker_register_service/FAIL_TO_REGISTER_WORKER",
        message: t(
          "worker_register_service/FAIL_TO_REGISTER_WORKER",
          "Error while registering the worker.",
        ),
        debug: { error },
      });
    }
  }
}

export { WorkerRegisterService };
