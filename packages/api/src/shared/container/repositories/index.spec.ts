import { container as mainContainer } from "tsyringe";
import { afterEach, describe, expect, it } from "vitest";

// Repository import
import { PrismaDatasetRepository } from "@modules/dataset/infrastructure/prisma/repositories/prismaDataset.repository";
import { PrismaFileRepository } from "@modules/file/infrastructure/prisma/repositories/prismaFile.repository";
import { PrismaMcpAuthorizationGrantRepository } from "@modules/mcpAuthorization/infrastructure/prisma/repositories/prismaMcpAuthorizationGrant.repository";
import { PrismaProcessingRepository } from "@modules/processing/infrastructure/prisma/repositories/prismaProcessing.repository";
import { PrismaProcessorRepository } from "@modules/processor/infrastructure/prisma/repositories/prismaProcessor.repository";
import { PrismaUserRepository } from "@modules/user/infrastructure/prisma/repositories/prismaUser.repository";
import { PrismaUserAuthProviderConnRepository } from "@modules/user/infrastructure/prisma/repositories/prismaUserAuthProviderConn.repository";
import { PrismaWorkerRepository } from "@modules/worker/infrastructure/prisma/repositories/prismaWorker.repository";
import { PrismaWorkerRegistrationTokenRepository } from "@modules/worker/infrastructure/prisma/repositories/prismaWorkerRegistrationToken.repository";

// Target import
import { initRepositories, repositories } from ".";

const EXPECTED_REPOSITORIES = {
  UserRepository: PrismaUserRepository,
  UserAuthProviderConnRepository: PrismaUserAuthProviderConnRepository,
  FileRepository: PrismaFileRepository,
  DatasetRepository: PrismaDatasetRepository,
  ProcessorRepository: PrismaProcessorRepository,
  WorkerRepository: PrismaWorkerRepository,
  WorkerRegistrationTokenRepository: PrismaWorkerRegistrationTokenRepository,
  ProcessingRepository: PrismaProcessingRepository,
  McpAuthorizationGrantRepository: PrismaMcpAuthorizationGrantRepository,
};

const DATABASE_PROVIDER = { client: {} };

describe("Container: repositories", () => {
  afterEach(() => {
    mainContainer.reset();
  });

  it("should map every repository token to its Prisma implementation", () => {
    expect(repositories).toEqual(EXPECTED_REPOSITORIES);
  });

  it("should register each repository as a singleton of its Prisma implementation in the given container", async () => {
    const childContainer = mainContainer.createChildContainer();
    childContainer.registerInstance("DatabaseProvider", DATABASE_PROVIDER);

    await initRepositories(childContainer);

    Object.entries(EXPECTED_REPOSITORIES).forEach(([token, implementation]) => {
      const repository = childContainer.resolve(token);
      expect(repository).toBeInstanceOf(implementation);
      expect(childContainer.resolve(token)).toBe(repository);
    });
    expect(mainContainer.isRegistered("UserRepository")).toBe(false);
  });

  it("should register the repositories in the application container when given none", async () => {
    await initRepositories();

    expect(
      Object.keys(EXPECTED_REPOSITORIES).filter(
        token => !mainContainer.isRegistered(token),
      ),
    ).toEqual([]);
  });
});
