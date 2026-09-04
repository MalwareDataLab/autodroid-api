/* eslint prettier/prettier: ["error", {"printWidth": 250 }] */
import { DependencyContainer, container as mainContainer } from "tsyringe";

/* Document repositories */

/* Relational repositories */
import { IUserRepository } from "@modules/user/repositories/IUser.repository";
import { PrismaUserRepository } from "@modules/user/infrastructure/prisma/repositories/prismaUser.repository";

import { IUserAuthProviderConnRepository } from "@modules/user/repositories/IUserAuthProviderConn.repository";
import { PrismaUserAuthProviderConnRepository } from "@modules/user/infrastructure/prisma/repositories/prismaUserAuthProviderConn.repository";

import { IFileRepository } from "@modules/file/repositories/IFile.repository";
import { PrismaFileRepository } from "@modules/file/infrastructure/prisma/repositories/prismaFile.repository";

import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";
import { PrismaDatasetRepository } from "@modules/dataset/infrastructure/prisma/repositories/prismaDataset.repository";

import { IProcessorRepository } from "@modules/processor/repositories/IProcessor.repository";
import { PrismaProcessorRepository } from "@modules/processor/infrastructure/prisma/repositories/prismaProcessor.repository";

import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";
import { PrismaWorkerRepository } from "@modules/worker/infrastructure/prisma/repositories/prismaWorker.repository";

import { IWorkerRegistrationTokenRepository } from "@modules/worker/repositories/IWorkerRegistrationToken.repository";
import { PrismaWorkerRegistrationTokenRepository } from "@modules/worker/infrastructure/prisma/repositories/prismaWorkerRegistrationToken.repository";

import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";
import { PrismaProcessingRepository } from "@modules/processing/infrastructure/prisma/repositories/prismaProcessing.repository";

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
};

export { initRepositories, repositories };
