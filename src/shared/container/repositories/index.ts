/* eslint prettier/prettier: ["error", {"printWidth": 250 }] */
import { container } from "tsyringe";

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

const initRepositories = async () => {
  // MongoDB repositories

  // SQL repositories
  container.registerSingleton<IUserRepository>("UserRepository", PrismaUserRepository);
  container.registerSingleton<IUserAuthProviderConnRepository>("UserAuthProviderConnRepository", PrismaUserAuthProviderConnRepository);
  container.registerSingleton<IFileRepository>("FileRepository", PrismaFileRepository);
  container.registerSingleton<IDatasetRepository>("DatasetRepository", PrismaDatasetRepository);
  container.registerSingleton<IProcessorRepository>("ProcessorRepository", PrismaProcessorRepository);
};

export type {
  /* Document repositories */

  /* Relational repositories */
  IUserRepository,
  IUserAuthProviderConnRepository,
  IFileRepository,
  IDatasetRepository,
  IProcessorRepository,
};

export { initRepositories };
