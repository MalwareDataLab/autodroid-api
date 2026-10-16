/* eslint prettier/prettier: ["error", {"printWidth": 250 }] */
import { DependencyContainer, container as mainContainer } from "tsyringe";

// Repository import
import { PrismaDatasetRepository } from "@modules/dataset/infrastructure/prisma/repositories/prismaDataset.repository";
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";
import { PrismaFileRepository } from "@modules/file/infrastructure/prisma/repositories/prismaFile.repository";
import { IFileRepository } from "@modules/file/repositories/IFile.repository";
import { PrismaMcpAuthorizationGrantRepository } from "@modules/mcpAuthorization/infrastructure/prisma/repositories/prismaMcpAuthorizationGrant.repository";
import { IMcpAuthorizationGrantRepository } from "@modules/mcpAuthorization/repositories/IMcpAuthorizationGrant.repository";
import { PrismaProcessingRepository } from "@modules/processing/infrastructure/prisma/repositories/prismaProcessing.repository";
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";
import { PrismaProcessorRepository } from "@modules/processor/infrastructure/prisma/repositories/prismaProcessor.repository";
import { IProcessorRepository } from "@modules/processor/repositories/IProcessor.repository";
import { PrismaUserRepository } from "@modules/user/infrastructure/prisma/repositories/prismaUser.repository";
import { PrismaUserAuthProviderConnRepository } from "@modules/user/infrastructure/prisma/repositories/prismaUserAuthProviderConn.repository";
import { IUserRepository } from "@modules/user/repositories/IUser.repository";
import { IUserAuthProviderConnRepository } from "@modules/user/repositories/IUserAuthProviderConn.repository";
import { PrismaWorkerRepository } from "@modules/worker/infrastructure/prisma/repositories/prismaWorker.repository";
import { PrismaWorkerRegistrationTokenRepository } from "@modules/worker/infrastructure/prisma/repositories/prismaWorkerRegistrationToken.repository";
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";
import { IWorkerRegistrationTokenRepository } from "@modules/worker/repositories/IWorkerRegistrationToken.repository";

const repositories = {
  // MongoDB repositories

  // SQL repositories
  UserRepository: PrismaUserRepository as ClassType<IUserRepository>,
  UserAuthProviderConnRepository: PrismaUserAuthProviderConnRepository as ClassType<IUserAuthProviderConnRepository>,
  FileRepository: PrismaFileRepository as ClassType<IFileRepository>,
  DatasetRepository: PrismaDatasetRepository as ClassType<IDatasetRepository>,
  ProcessorRepository: PrismaProcessorRepository as ClassType<IProcessorRepository>,
  WorkerRepository: PrismaWorkerRepository as ClassType<IWorkerRepository>,
  WorkerRegistrationTokenRepository: PrismaWorkerRegistrationTokenRepository as ClassType<IWorkerRegistrationTokenRepository>,
  ProcessingRepository: PrismaProcessingRepository as ClassType<IProcessingRepository>,
  McpAuthorizationGrantRepository: PrismaMcpAuthorizationGrantRepository as ClassType<IMcpAuthorizationGrantRepository>,
};

const initRepositories = async (selectedContainer: DependencyContainer = mainContainer) => {
  Object.entries(repositories).forEach(([key, value]) => {
    selectedContainer.registerSingleton<InstanceType<typeof value>>(key, value);
  });
};

export type RepositoryToken = keyof typeof repositories;
export type Repository<T extends RepositoryToken> = InstanceType<(typeof repositories)[T]>;

export type {
  /* Document repositories */

  /* Relational repositories */
  IUserRepository,
  IUserAuthProviderConnRepository,
  IFileRepository,
  IDatasetRepository,
  IProcessorRepository,
  IWorkerRepository,
  IWorkerRegistrationTokenRepository,
  IProcessingRepository,
  IMcpAuthorizationGrantRepository,
};

export { initRepositories, repositories };
