import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Target import
import { CliAuthorizationRegisterService } from "./cliAuthorizationRegister.service";

describe("Service: CliAuthorizationRegisterService", () => {
  const challenge = "a".repeat(43);
  const userCode = "ABCDEFGH";

  let inMemoryDatabaseProvider: IInMemoryDatabaseProvider;
  let cliAuthorizationRegisterService: CliAuthorizationRegisterService;

  beforeEach(() => {
    inMemoryDatabaseProvider = container.resolve("InMemoryDatabaseProvider");
    cliAuthorizationRegisterService = new CliAuthorizationRegisterService(
      inMemoryDatabaseProvider,
    );
  });

  it("should store the mapping in real Redis with the shared TTL", async () => {
    await cliAuthorizationRegisterService.execute({
      code_challenge: challenge,
      user_code: userCode,
    });

    const storedChallenge = await inMemoryDatabaseProvider.connection.get(
      `cli-authorization-code:${userCode}`,
    );
    expect(storedChallenge).toBe(challenge);

    const storedTtl = await inMemoryDatabaseProvider.connection.ttl(
      `cli-authorization-code:${userCode}`,
    );
    expect(storedTtl).toBeGreaterThan(0);
    expect(storedTtl).toBeLessThanOrEqual(300);
  });

  it("should throw a 409 against real Redis and leave the first mapping untouched when the user code collides", async () => {
    await cliAuthorizationRegisterService.execute({
      code_challenge: challenge,
      user_code: userCode,
    });

    await expect(
      cliAuthorizationRegisterService.execute({
        code_challenge: "z".repeat(43),
        user_code: userCode,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@cli_authorization_register_service/CODE_ALREADY_REGISTERED",
        statusCode: 409,
      }),
    );

    const storedChallenge = await inMemoryDatabaseProvider.connection.get(
      `cli-authorization-code:${userCode}`,
    );
    expect(storedChallenge).toBe(challenge);
  });
});
