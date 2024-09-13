import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { generateToken } from "@shared/utils/generateToken";

// Repository import
import { IWorkerRegistrationTokenRepository } from "../repositories/IWorkerRegistrationToken.repository";

@injectable()
class WorkerRegistrationTokenGenerateService {
  constructor(
    @inject("workerRegistrationTokenRepository")
    private workerRegistrationTokenRepository: IWorkerRegistrationTokenRepository,
  ) {}

  public async execute(retries: number = 0): Promise<string> {
    const token = generateToken();

    const exists = await this.workerRegistrationTokenRepository.findOne({
      token,
    });

    if (exists) {
      if (retries >= 10)
        throw new AppError({
          key: "@worker_registration_token_generate_service/RETRIES_EXCEEDED",
          message: "Unable to generate worker token.",
          debug: {
            code: token,
            exists,
          },
        });
      return this.execute(retries + 1);
    }

    return token;
  }
}

export { WorkerRegistrationTokenGenerateService };
