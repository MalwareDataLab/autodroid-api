import { Query } from "type-graphql";
import { container } from "tsyringe";

// Service import
import { HealthCheckReadinessCheckService } from "@modules/healthCheck/services/healthCheckReadinessCheck.service";

class HealthCheckResolver {
  @Query(() => Date)
  async healthCheck(): Promise<Date> {
    return new Date();
  }

  @Query(() => Date)
  async healthReadinessCheck(): Promise<Date> {
    const healthCheckReadinessCheckService = container.resolve(
      HealthCheckReadinessCheckService,
    );

    await healthCheckReadinessCheckService.execute();

    return new Date();
  }

  @Query(() => Date)
  async healthLivenessCheck(): Promise<Date> {
    return new Date();
  }
}

export { HealthCheckResolver };
