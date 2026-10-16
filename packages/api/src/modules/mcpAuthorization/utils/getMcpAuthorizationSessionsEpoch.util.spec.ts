import { describe, expect, it, vi } from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Target import
import {
  getMcpAuthorizationSessionsEpoch,
  getMcpAuthorizationSessionsEpochKey,
} from "./getMcpAuthorizationSessionsEpoch.util";

const inMemoryDatabaseProviderWith = (storedEpoch: string | null) => {
  const getMock = vi.fn().mockResolvedValue(storedEpoch);
  return {
    getMock,
    inMemoryDatabaseProvider: {
      connection: { get: getMock },
    } as unknown as IInMemoryDatabaseProvider,
  };
};

describe("Utils: getMcpAuthorizationSessionsEpoch", () => {
  it("should key the user's sessions epoch by their id", () => {
    expect(getMcpAuthorizationSessionsEpochKey("user-1")).toBe(
      "mcp-oauth:sessions-epoch:user-1",
    );
  });

  it("should read the user's sessions epoch as a number", async () => {
    const { getMock, inMemoryDatabaseProvider } =
      inMemoryDatabaseProviderWith("3");

    await expect(
      getMcpAuthorizationSessionsEpoch({
        inMemoryDatabaseProvider,
        user_id: "user-1",
      }),
    ).resolves.toBe(3);
    expect(getMock).toHaveBeenCalledWith("mcp-oauth:sessions-epoch:user-1");
  });

  it("should be 0 for a user who never closed every session", async () => {
    const { inMemoryDatabaseProvider } = inMemoryDatabaseProviderWith(null);

    await expect(
      getMcpAuthorizationSessionsEpoch({
        inMemoryDatabaseProvider,
        user_id: "user-1",
      }),
    ).resolves.toBe(0);
  });
});
