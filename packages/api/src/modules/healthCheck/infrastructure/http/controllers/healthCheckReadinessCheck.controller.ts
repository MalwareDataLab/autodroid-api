import { Request, Response } from "express";
import { container } from "tsyringe";

// Service import
import { HealthCheckReadinessCheckService } from "@modules/healthCheck/services/healthCheckReadinessCheck.service";

class HealthCheckReadinessCheckController {
  public async show(req: Request, res: Response) {
    const healthCheckReadinessCheckService = container.resolve(
      HealthCheckReadinessCheckService,
    );

    await healthCheckReadinessCheckService.execute();

    return res.status(200).send();
  }
}

export { HealthCheckReadinessCheckController };
