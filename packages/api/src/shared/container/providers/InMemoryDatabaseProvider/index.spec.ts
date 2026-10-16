import { describe, expect, it, vi } from "vitest";

// Provider import
import { RedisInMemoryDatabaseProvider } from "./implementations/redisInMemoryDatabase.provider";

// Target import
import { InMemoryDatabaseProvider } from ".";

vi.mock("./implementations/redisInMemoryDatabase.provider", () => ({
  RedisInMemoryDatabaseProvider: vi.fn(
    function redisInMemoryDatabaseProviderMock(this: Record<string, unknown>) {
      this.provider = { name: "default redis connection" };
      this.initialization = Promise.resolve();
    },
  ),
}));

describe("Provider: InMemoryDatabaseProvider", () => {
  it("should expose the connection and initialization of the client it is given", () => {
    const client = {
      provider: { name: "given redis connection" },
      initialization: Promise.resolve(),
    } as unknown as RedisInMemoryDatabaseProvider;

    const inMemoryDatabaseProvider = new InMemoryDatabaseProvider(client);

    expect(RedisInMemoryDatabaseProvider).not.toHaveBeenCalled();
    expect(inMemoryDatabaseProvider.connection).toBe(client.provider);
    expect(inMemoryDatabaseProvider.initialization).toBe(client.initialization);
    expect(inMemoryDatabaseProvider.Adapter).toBe(
      RedisInMemoryDatabaseProvider,
    );
  });

  it("should open a default Redis client when it is given none", () => {
    const inMemoryDatabaseProvider = new InMemoryDatabaseProvider();

    expect(RedisInMemoryDatabaseProvider).toHaveBeenCalledExactlyOnceWith();
    const [defaultClient] = vi.mocked(RedisInMemoryDatabaseProvider).mock
      .instances;
    expect(inMemoryDatabaseProvider.connection).toBe(defaultClient.provider);
    expect(inMemoryDatabaseProvider.initialization).toBe(
      defaultClient.initialization,
    );
  });
});
