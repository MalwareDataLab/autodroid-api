import { container } from "tsyringe";

// Configuration import
import { getAdminConfig } from "@config/admin";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Util import
import type { PaginationContractRow } from "./paginationContractFixture.util";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";
import { PROCESSOR_VISIBILITY } from "@modules/processor/types/processorVisibility.enum";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Repository import
import {
  IDatasetRepository,
  IProcessingRepository,
  IProcessorRepository,
} from "@shared/container/repositories";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { processorFactory } from "@modules/processor/entities/factories/processor.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";
import { workerRegistrationTokenFactory } from "@modules/worker/entities/factories/workerRegistrationToken.factory";

type PaginationContractRows = {
  seed: (rows: PaginationContractRow[]) => Promise<void>;
  seedOutOfScope?: (rows: PaginationContractRow[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  unlist?: (id: string) => Promise<void>;
};

const ARCHIVED_AT = new Date("2024-06-01T00:00:00.000Z");

const databaseClient = () =>
  container.resolve<IDatabaseProvider>("DatabaseProvider").client;

const createEach = async (
  rows: PaginationContractRow[],
  create: (row: PaginationContractRow, index: number) => Promise<unknown>,
) => {
  await Promise.all(rows.map(create));
};

const createPaginationContractAdmin = () =>
  userFactory.create({ email: getAdminConfig().emails[0] });

const userProcessorRows = (user: User, otherUser: User) => {
  const processorRepository = container.resolve<IProcessorRepository>(
    "ProcessorRepository",
  );

  return {
    seed: rows =>
      createEach(rows, (row, index) =>
        processorFactory.create(
          index % 2 === 0
            ? {
                ...row,
                user_id: user.id,
                visibility: PROCESSOR_VISIBILITY.HIDDEN,
              }
            : {
                ...row,
                user_id: otherUser.id,
                visibility: PROCESSOR_VISIBILITY.PUBLIC,
              },
        ),
      ),
    seedOutOfScope: rows =>
      createEach(rows, row =>
        processorFactory.create({
          ...row,
          user_id: otherUser.id,
          visibility: PROCESSOR_VISIBILITY.HIDDEN,
        }),
      ),
    remove: async id => {
      await processorRepository.deleteOne({ id });
    },
    unlist: async id => {
      await processorRepository.updateOne(
        { id },
        { visibility: PROCESSOR_VISIBILITY.HIDDEN },
      );
    },
  } satisfies PaginationContractRows;
};

const userDatasetRows = (user: User, otherUser: User) => {
  const datasetRepository =
    container.resolve<IDatasetRepository>("DatasetRepository");

  return {
    seed: rows =>
      createEach(rows, (row, index) =>
        datasetFactory.create(
          index % 2 === 0
            ? {
                ...row,
                user_id: user.id,
                visibility: DATASET_VISIBILITY.PRIVATE,
              }
            : {
                ...row,
                user_id: otherUser.id,
                visibility: DATASET_VISIBILITY.PUBLIC,
              },
        ),
      ),
    seedOutOfScope: rows =>
      createEach(rows, row =>
        datasetFactory.create({
          ...row,
          user_id: otherUser.id,
          visibility: DATASET_VISIBILITY.PRIVATE,
        }),
      ),
    remove: async id => {
      await datasetRepository.deleteOne({ id });
    },
    unlist: async id => {
      await datasetRepository.updateOne(
        { id },
        { visibility: DATASET_VISIBILITY.PRIVATE },
      );
    },
  } satisfies PaginationContractRows;
};

const prepareUserProcessingRows = async (user: User, otherUser: User) => {
  const [listedDataset, otherDataset, processor] = await Promise.all([
    datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    }),
    datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
    }),
    processorFactory.create({ visibility: PROCESSOR_VISIBILITY.PUBLIC }),
  ]);
  const processingRepository = container.resolve<IProcessingRepository>(
    "ProcessingRepository",
  );

  return {
    listedDataset,
    processor,
    seed: rows =>
      createEach(rows, (row, index) =>
        processingFactory.create({
          ...row,
          dataset_id: listedDataset.id,
          processor_id: processor.id,
          ...(index % 2 === 0
            ? { user_id: user.id, visibility: PROCESSING_VISIBILITY.PRIVATE }
            : {
                user_id: otherUser.id,
                visibility: PROCESSING_VISIBILITY.PUBLIC,
              }),
        }),
      ),
    seedOutOfScope: rows =>
      createEach(rows, (row, index) =>
        processingFactory.create({
          ...row,
          processor_id: processor.id,
          ...[
            {
              dataset_id: listedDataset.id,
              user_id: otherUser.id,
              visibility: PROCESSING_VISIBILITY.PRIVATE,
            },
            {
              dataset_id: listedDataset.id,
              user_id: user.id,
              visibility: PROCESSING_VISIBILITY.PRIVATE,
              archived_at: ARCHIVED_AT,
            },
            {
              dataset_id: otherDataset.id,
              user_id: user.id,
              visibility: PROCESSING_VISIBILITY.PRIVATE,
            },
          ][index % 3],
        }),
      ),
    remove: async id => {
      await databaseClient().processing.delete({ where: { id } });
    },
    unlist: async id => {
      await processingRepository.deleteOne({ id });
    },
  } satisfies PaginationContractRows & Record<string, unknown>;
};

const adminDatasetRows = (owner: User, otherOwner: User) =>
  ({
    seed: rows =>
      createEach(rows, (row, index) =>
        datasetFactory.create({
          ...row,
          user_id: owner.id,
          visibility:
            index % 2 === 0
              ? DATASET_VISIBILITY.PRIVATE
              : DATASET_VISIBILITY.PUBLIC,
        }),
      ),
    seedOutOfScope: rows =>
      createEach(rows, row =>
        datasetFactory.create({
          ...row,
          user_id: otherOwner.id,
          visibility: DATASET_VISIBILITY.PRIVATE,
        }),
      ),
    remove: async id => {
      await databaseClient().dataset.delete({ where: { id } });
    },
  }) satisfies PaginationContractRows;

const prepareAdminProcessingRows = async (owner: User, otherOwner: User) => {
  const [dataset, processor] = await Promise.all([
    datasetFactory.create({ user_id: owner.id }),
    processorFactory.create(),
  ]);
  const processingRepository = container.resolve<IProcessingRepository>(
    "ProcessingRepository",
  );

  return {
    seed: rows =>
      createEach(rows, (row, index) =>
        processingFactory.create({
          ...row,
          user_id: owner.id,
          dataset_id: dataset.id,
          processor_id: processor.id,
          visibility:
            index % 2 === 0
              ? PROCESSING_VISIBILITY.PRIVATE
              : PROCESSING_VISIBILITY.PUBLIC,
        }),
      ),
    seedOutOfScope: rows =>
      createEach(rows, (row, index) =>
        processingFactory.create({
          ...row,
          dataset_id: dataset.id,
          processor_id: processor.id,
          visibility: PROCESSING_VISIBILITY.PRIVATE,
          ...(index % 2 === 0
            ? { user_id: otherOwner.id }
            : { user_id: owner.id, archived_at: ARCHIVED_AT }),
        }),
      ),
    remove: async id => {
      await databaseClient().processing.delete({ where: { id } });
    },
    unlist: async id => {
      await processingRepository.deleteOne({ id });
    },
  } satisfies PaginationContractRows;
};

const adminProcessorRows = (owners: [User, User]) =>
  ({
    seed: rows =>
      createEach(rows, (row, index) =>
        processorFactory.create({
          ...row,
          user_id: owners[index % 2].id,
          visibility:
            index % 3 === 0
              ? PROCESSOR_VISIBILITY.HIDDEN
              : PROCESSOR_VISIBILITY.PUBLIC,
        }),
      ),
    remove: async id => {
      await databaseClient().processor.delete({ where: { id } });
    },
  }) satisfies PaginationContractRows;

const adminWorkerRows = (owners: [User, User]) =>
  ({
    seed: rows =>
      createEach(rows, (row, index) =>
        workerFactory.create({
          ...row,
          user_id: owners[index % 2].id,
          archived_at: null,
        }),
      ),
    seedOutOfScope: rows =>
      createEach(rows, (row, index) =>
        workerFactory.create({
          ...row,
          user_id: owners[index % 2].id,
          archived_at: ARCHIVED_AT,
        }),
      ),
    remove: async id => {
      await databaseClient().worker.delete({ where: { id } });
    },
  }) satisfies PaginationContractRows;

const adminWorkerRegistrationTokenRows = (owner: User) =>
  ({
    seed: rows =>
      createEach(rows, (row, index) =>
        workerRegistrationTokenFactory.create({
          ...row,
          user_id: owner.id,
          is_unlimited_usage: index % 2 === 0,
          archived_at: null,
        }),
      ),
    seedOutOfScope: rows =>
      createEach(rows, row =>
        workerRegistrationTokenFactory.create({
          ...row,
          user_id: owner.id,
          archived_at: ARCHIVED_AT,
        }),
      ),
    remove: async id => {
      await databaseClient().workerRegistrationToken.delete({ where: { id } });
    },
  }) satisfies PaginationContractRows;

export {
  adminDatasetRows,
  adminProcessorRows,
  adminWorkerRegistrationTokenRows,
  adminWorkerRows,
  createPaginationContractAdmin,
  prepareAdminProcessingRows,
  prepareUserProcessingRows,
  userDatasetRows,
  userProcessorRows,
};
