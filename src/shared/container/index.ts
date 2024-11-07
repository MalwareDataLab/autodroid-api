/* eslint prettier/prettier: ["error", {"printWidth": 250 }] */
import "reflect-metadata";
import { DependencyContainer, container as mainContainer } from "tsyringe";

// Providers import
import { IDatabaseProvider } from "./providers/DatabaseProvider/models/IDatabase.provider";
import { DatabaseProvider } from "./providers/DatabaseProvider";

import { INonRelationalDatabaseProvider } from "./providers/NonRelationalDatabaseProvider/models/INonRelationalDatabase.provider";
import { NonRelationalDatabaseProvider } from "./providers/NonRelationalDatabaseProvider";

import { IInMemoryDatabaseProvider } from "./providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";
import { InMemoryDatabaseProvider } from "./providers/InMemoryDatabaseProvider";

import { IUserAgentInfoProvider } from "./providers/UserAgentInfoProvider/models/IUserAgentInfo.provider";
import { UserAgentInfoProvider } from "./providers/UserAgentInfoProvider";

import { IStorageProvider } from "./providers/StorageProvider/models/IStorage.provider";
import { StorageProvider } from "./providers/StorageProvider";

import { IAuthenticationProvider } from "./providers/AuthenticationProvider/models/IAuthentication.provider";
import { AuthenticationProvider } from "./providers/AuthenticationProvider";

import { IWebsocketProvider } from "./providers/WebsocketProvider/models/IWebsocket.provider";
import { WebsocketProvider } from "./providers/WebsocketProvider";

import { IDatasetProcessorProvider } from "./providers/DatasetProcessorProvider/models/IDatasetProcessor.provider";
import { DatasetProcessorProvider } from "./providers/DatasetProcessorProvider";

import { IJobProvider } from "./providers/JobProvider/models/IJob.provider";
import { JobProvider } from "./providers/JobProvider";

// Repository import
import { initRepositories } from "./repositories";

const primaryProviders = {
  DatabaseProvider: DatabaseProvider as ClassType<IDatabaseProvider>,
  NonRelationalDatabaseProvider: NonRelationalDatabaseProvider as ClassType<INonRelationalDatabaseProvider>,
  InMemoryDatabaseProvider: InMemoryDatabaseProvider as ClassType<IInMemoryDatabaseProvider>,
} as const;
const primaryProviderKeys = Object.keys(primaryProviders) as ReadonlyArray<keyof typeof primaryProviders>;

const secondaryProviders = {
  UserAgentInfoProvider: UserAgentInfoProvider as ClassType<IUserAgentInfoProvider>,
  StorageProvider: StorageProvider as ClassType<IStorageProvider>,
  AuthenticationProvider: AuthenticationProvider as ClassType<IAuthenticationProvider>,
  WebsocketProvider: WebsocketProvider as ClassType<IWebsocketProvider>,

  DatasetProcessorProvider: DatasetProcessorProvider as ClassType<IDatasetProcessorProvider>,

  JobProvider: JobProvider as ClassType<IJobProvider>,
} as const;
const secondaryProviderKeys = Object.keys(secondaryProviders) as ReadonlyArray<keyof typeof secondaryProviders>;

const providers = { ...primaryProviders, ...secondaryProviders } as const;
type ProviderKeys = (typeof primaryProviderKeys)[number] | (typeof secondaryProviderKeys)[number];

const initContainerByKeys = ({ selectedContainer = mainContainer, containers }: { selectedContainer: DependencyContainer; containers: ReadonlyArray<ProviderKeys> }) => {
  containers.forEach(containerKey => {
    const provider = providers[containerKey];
    selectedContainer.registerSingleton<InstanceType<typeof provider>>(containerKey, provider);
  });
};

const initPrimaryProviders = (selectedContainer: DependencyContainer = mainContainer) => {
  initContainerByKeys({
    selectedContainer,
    containers: primaryProviderKeys,
  });
};

const initSecondaryProviders = (selectedContainer: DependencyContainer = mainContainer) => {
  initContainerByKeys({
    selectedContainer,
    containers: secondaryProviderKeys,
  });
};

const initContainer = (selectedContainer: DependencyContainer = mainContainer) => {
  initPrimaryProviders(selectedContainer);
  initRepositories(selectedContainer);
  initSecondaryProviders(selectedContainer);
};

const standardPreRequisites = [
  // Primary (NOTE: order is important | InMemoryDatabaseProvider is a keep-alive service)
  "DatabaseProvider",
  "NonRelationalDatabaseProvider",
  "InMemoryDatabaseProvider",

  // Secondary
  "UserAgentInfoProvider",
  "StorageProvider",
  "AuthenticationProvider",

  // Tertiary

  // Quaternary
  "JobProvider",
] satisfies ReadonlyArray<ProviderKeys>;
const initAndWaitPreRequisites = async (selectedContainer: DependencyContainer = mainContainer, prerequisites = standardPreRequisites) => {
  await prerequisites.reduce<Promise<any>>((promise, prerequisite) => {
    return promise.then(async () => {
      const dependency: any = selectedContainer.resolve(prerequisite);
      await dependency.initialization;
      if (!dependency.initialization) throw new Error(`❌ ${prerequisite} initialization failed.`);
      return dependency.initialization;
    });
  }, Promise.resolve());
};

type Providers = typeof providers;
export type ProviderToken = keyof Providers;
export type Provider<T extends ProviderToken> = InstanceType<Providers[T]>;

export { primaryProviderKeys, secondaryProviderKeys, initPrimaryProviders, initSecondaryProviders, initContainer, initAndWaitPreRequisites };
