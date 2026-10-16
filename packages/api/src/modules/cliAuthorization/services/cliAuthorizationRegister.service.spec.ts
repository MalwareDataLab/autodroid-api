import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Target import
import { CliAuthorizationRegisterService } from "./cliAuthorizationRegister.service";

describe("Service: CliAuthorizationRegisterService", () => {
  const challenge = "a".repeat(43);
  const userCode = "ABCDEFGH";

  let setMock: ReturnType<typeof vi.fn>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;

  let cliAuthorizationRegisterService: CliAuthorizationRegisterService;

  beforeEach(() => {
    setMock = vi.fn().mockResolvedValue("OK");

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { set: setMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    cliAuthorizationRegisterService = new CliAuthorizationRegisterService(
      inMemoryDatabaseProviderMock,
    );
  });

  it("should store the user code to challenge mapping with the shared TTL", async () => {
    await cliAuthorizationRegisterService.execute({
      code_challenge: challenge,
      user_code: userCode,
    });

    expect(setMock).toHaveBeenCalledWith(
      `cli-authorization-code:${userCode}`,
      challenge,
      "EX",
      300,
      "NX",
    );
  });

  it("should throw a 409 when the user code is already registered", async () => {
    setMock.mockResolvedValueOnce(null);

    await expect(() =>
      cliAuthorizationRegisterService.execute({
        code_challenge: challenge,
        user_code: userCode,
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@cli_authorization_register_service/CODE_ALREADY_REGISTERED",
        statusCode: 409,
      }),
    );
  });
});
