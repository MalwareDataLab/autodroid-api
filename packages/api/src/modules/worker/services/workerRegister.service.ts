import { inject, injectable } from "tsyringe";

// i18n import
import { t } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// DTO import
import { IParsedUserAgentInfoDTO } from "@shared/container/providers/UserAgentInfoProvider/types/IParsedUserAgentInfo.dto";

// Entity import
import { Worker } from "../entities/worker.entity";

// Schema import
import { WorkerRegisterSchema } from "../schemas/worker.schema";

// Repository import
import { IWorkerRepository } from "../repositories/IWorker.repository";
import { IWorkerRegistrationTokenRepository } from "../repositories/IWorkerRegistrationToken.repository";

// Service import
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
    const { name, registration_token, internal_id, signature, system_info } =
      data;

    const registrationToken =
      await this.workerRegistrationTokenRepository.findOne({
        token: registration_token,
        archived: false,
      });

    if (!registrationToken)
      throw new AppError({
        key: "@worker_register_service/REGISTRATION_TOKEN_NOT_FOUND",
        message: t(
          "worker_register_service.REGISTRATION_TOKEN_NOT_FOUND",
          "Registration token not found.",
        ),
      });

    if (
      registrationToken.expires_at &&
      registrationToken.expires_at <= new Date()
    )
      throw new AppError({
        key: "@worker_register_service/REGISTRATION_TOKEN_EXPIRED",
        message: t(
          "worker_register_service.REGISTRATION_TOKEN_EXPIRED",
          "Registration token expired.",
        ),
      });

    const existingSignature = await this.workerRepository.findOne({
      signature,
      archived: false,
    });

    if (existingSignature)
      throw new AppError({
        key: "@worker_register_service/SIGNATURE_ALREADY_USED",
        message: t(
          "worker_register_service.SIGNATURE_ALREADY_USED",
          "Signature already used.",
        ),
      });

    const activated = await this.workerRegistrationTokenRepository.activateOne({
      id: registrationToken.id,
    });

    if (!activated)
      throw new AppError({
        key: "@worker_register_service/REGISTRATION_TOKEN_ALREADY_USED",
        message: t(
          "worker_register_service.REGISTRATION_TOKEN_ALREADY_USED",
          "Registration token already used.",
        ),
      });

    let createdWorkerId: string | undefined;

    try {
      const worker = await this.workerRepository.createOne({
        name,
        registration_token_id: registrationToken.id,
        internal_id,
        signature,
        missing: false,

        user_id: registrationToken.user_id,

        version: null,
        system_info,
        agent_info: {
          ...agent_info,
        },
        payload: {},

        description: null,
        tags: null,

        last_seen_at: null,

        refresh_token: "",
        refresh_token_expires_at: new Date(),
      });
      createdWorkerId = worker.id;

      const workerWithRefreshToken =
        await this.workerUpdateRefreshTokenService.execute({
          data: {
            name,
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
      const archiveCreatedWorker = createdWorkerId
        ? this.workerRepository.deleteOne({ id: createdWorkerId })
        : Promise.resolve();

      await archiveCreatedWorker
        .then(() =>
          this.workerRegistrationTokenRepository.releaseOne({
            id: registrationToken.id,
          }),
        )
        .catch(() => undefined);

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
