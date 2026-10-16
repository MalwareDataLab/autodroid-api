import { container as mainContainer } from "tsyringe";
import { afterEach, describe, expect, it, vi } from "vitest";

// Repository import
import { initRepositories } from "./repositories";

// Target import
import {
  afterInitBootstrapList,
  initAndWaitRequisites,
  initContainer,
  initPrimaryProviders,
  initSecondaryProviders,
  primaryProviderKeys,
  secondaryProviderKeys,
} from ".";

const providerClass = vi.hoisted(
  () => (token: string) =>
    ({
      [token]: class {
        readonly token = token;

        readonly initialization = Promise.resolve();
      },
    })[token],
);

vi.mock("./providers/DatabaseProvider", () => ({
  DatabaseProvider: providerClass("DatabaseProvider"),
}));
vi.mock("./providers/NonRelationalDatabaseProvider", () => ({
  NonRelationalDatabaseProvider: providerClass("NonRelationalDatabaseProvider"),
}));
vi.mock("./providers/InMemoryDatabaseProvider", () => ({
  InMemoryDatabaseProvider: providerClass("InMemoryDatabaseProvider"),
}));
vi.mock("./providers/UserAgentInfoProvider", () => ({
  UserAgentInfoProvider: providerClass("UserAgentInfoProvider"),
}));
vi.mock("./providers/StorageProvider", () => ({
  StorageProvider: providerClass("StorageProvider"),
}));
vi.mock("./providers/AuthenticationProvider", () => ({
  AuthenticationProvider: providerClass("AuthenticationProvider"),
}));
vi.mock("./providers/WebsocketProvider", () => ({
  WebsocketProvider: providerClass("WebsocketProvider"),
}));
vi.mock("./providers/EmailNotificationProvider", () => ({
  EmailNotificationProvider: providerClass("EmailNotificationProvider"),
}));
vi.mock("./providers/DatasetProcessorProvider", () => ({
  DatasetProcessorProvider: providerClass("DatasetProcessorProvider"),
}));
vi.mock("./providers/JobProvider", () => ({
  JobProvider: providerClass("JobProvider"),
}));
vi.mock("./repositories", () => ({ initRepositories: vi.fn() }));

const PRIMARY_PROVIDER_KEYS = [
  "DatabaseProvider",
  "NonRelationalDatabaseProvider",
  "InMemoryDatabaseProvider",
];

const SECONDARY_PROVIDER_KEYS = [
  "UserAgentInfoProvider",
  "StorageProvider",
  "AuthenticationProvider",
  "WebsocketProvider",
  "EmailNotificationProvider",
  "DatasetProcessorProvider",
  "JobProvider",
];

const STANDARD_PREREQUISITES = [
  "DatabaseProvider",
  "NonRelationalDatabaseProvider",
  "InMemoryDatabaseProvider",
  "UserAgentInfoProvider",
  "StorageProvider",
  "AuthenticationProvider",
  "EmailNotificationProvider",
  "JobProvider",
];

const registeredOf = (
  selectedContainer: typeof mainContainer,
  tokens: string[],
) => tokens.filter(token => selectedContainer.isRegistered(token));

const deferredProvider = () => {
  let resolveInitialization = () => {};
  const initialization = new Promise<void>(resolve => {
    resolveInitialization = resolve;
  });
  return { provider: { initialization }, resolveInitialization };
};

describe("Container: dependency injection bootstrap", () => {
  afterEach(() => {
    mainContainer.reset();
  });

  it("should list the providers by bootstrap stage", () => {
    expect(primaryProviderKeys).toEqual(PRIMARY_PROVIDER_KEYS);
    expect(secondaryProviderKeys).toEqual(SECONDARY_PROVIDER_KEYS);
    expect(afterInitBootstrapList).toEqual([
      "WebsocketProvider",
      "DatasetProcessorProvider",
    ]);
  });

  it("should register the primary providers, then the repositories, then the secondary providers, each as a singleton", () => {
    const childContainer = mainContainer.createChildContainer();
    vi.mocked(initRepositories).mockImplementationOnce(async () => {
      expect(registeredOf(childContainer, PRIMARY_PROVIDER_KEYS)).toEqual(
        PRIMARY_PROVIDER_KEYS,
      );
      expect(registeredOf(childContainer, SECONDARY_PROVIDER_KEYS)).toEqual([]);
    });

    initContainer(childContainer);

    expect(initRepositories).toHaveBeenCalledExactlyOnceWith(childContainer);
    [...PRIMARY_PROVIDER_KEYS, ...SECONDARY_PROVIDER_KEYS].forEach(token => {
      const provider = childContainer.resolve<{ token: string }>(token);
      expect(provider.token).toBe(token);
      expect(childContainer.resolve(token)).toBe(provider);
    });
    expect(
      registeredOf(mainContainer, [
        ...PRIMARY_PROVIDER_KEYS,
        ...SECONDARY_PROVIDER_KEYS,
      ]),
    ).toEqual([]);
  });

  it("should register each stage alone in the given container", () => {
    const primaryContainer = mainContainer.createChildContainer();
    const secondaryContainer = mainContainer.createChildContainer();

    initPrimaryProviders(primaryContainer);
    initSecondaryProviders(secondaryContainer);

    expect(registeredOf(primaryContainer, SECONDARY_PROVIDER_KEYS)).toEqual([]);
    expect(registeredOf(primaryContainer, PRIMARY_PROVIDER_KEYS)).toEqual(
      PRIMARY_PROVIDER_KEYS,
    );
    expect(registeredOf(secondaryContainer, PRIMARY_PROVIDER_KEYS)).toEqual([]);
    expect(registeredOf(secondaryContainer, SECONDARY_PROVIDER_KEYS)).toEqual(
      SECONDARY_PROVIDER_KEYS,
    );
  });

  it("should register every stage in the application container when given none", () => {
    initPrimaryProviders();
    initSecondaryProviders();

    expect(
      registeredOf(mainContainer, [
        ...PRIMARY_PROVIDER_KEYS,
        ...SECONDARY_PROVIDER_KEYS,
      ]),
    ).toEqual([...PRIMARY_PROVIDER_KEYS, ...SECONDARY_PROVIDER_KEYS]);

    mainContainer.reset();
    initContainer();

    expect(initRepositories).toHaveBeenCalledExactlyOnceWith(mainContainer);
    expect(
      registeredOf(mainContainer, [
        ...PRIMARY_PROVIDER_KEYS,
        ...SECONDARY_PROVIDER_KEYS,
      ]),
    ).toEqual([...PRIMARY_PROVIDER_KEYS, ...SECONDARY_PROVIDER_KEYS]);
  });

  it("should wait for each prerequisite to initialize before resolving the next", async () => {
    const childContainer = mainContainer.createChildContainer();
    const first = deferredProvider();
    const second = deferredProvider();
    const resolveSpy = vi.spyOn(childContainer, "resolve");
    childContainer.registerInstance("DatabaseProvider", first.provider);
    childContainer.registerInstance("JobProvider", second.provider);

    const waiting = initAndWaitRequisites({
      selectedContainer: childContainer,
      requisites: ["DatabaseProvider", "JobProvider"],
    });
    await vi.waitFor(() => expect(resolveSpy).toHaveBeenCalledOnce());
    first.resolveInitialization();
    await vi.waitFor(() => expect(resolveSpy).toHaveBeenCalledTimes(2));
    second.resolveInitialization();

    await expect(waiting).resolves.toBeUndefined();
    expect(resolveSpy.mock.calls).toEqual([
      ["DatabaseProvider"],
      ["JobProvider"],
    ]);
  });

  it("should fail naming the prerequisite that has no initialization", async () => {
    const childContainer = mainContainer.createChildContainer();
    childContainer.registerInstance("StorageProvider", {});

    await expect(
      initAndWaitRequisites({
        selectedContainer: childContainer,
        requisites: ["StorageProvider"],
      }),
    ).rejects.toThrowError("❌ StorageProvider initialization failed.");
  });

  it("should wait for the standard prerequisites, in order, in the application container when given nothing", async () => {
    initContainer();
    const resolveSpy = vi.spyOn(mainContainer, "resolve");

    await expect(initAndWaitRequisites()).resolves.toBeUndefined();

    expect(resolveSpy.mock.calls.map(([token]) => token)).toEqual(
      STANDARD_PREREQUISITES,
    );
  });
});
