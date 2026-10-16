import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Target import
import { CliAuthorizationTokenRedeemService } from "./cliAuthorizationTokenRedeem.service";

describe("Service: CliAuthorizationTokenRedeemService", () => {
  const verifier = "b".repeat(43);
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  let getdelMock: ReturnType<typeof vi.fn>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;

  let cliAuthorizationTokenRedeemService: CliAuthorizationTokenRedeemService;

  beforeEach(() => {
    getdelMock = vi.fn().mockResolvedValue("minted-token");

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { getdel: getdelMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    cliAuthorizationTokenRedeemService = new CliAuthorizationTokenRedeemService(
      inMemoryDatabaseProviderMock,
    );
  });

  it("should hash the verifier into its challenge and redeem the stored token exactly once", async () => {
    const token = await cliAuthorizationTokenRedeemService.execute({
      code_verifier: verifier,
    });

    expect(getdelMock).toHaveBeenCalledWith(`cli-authorization:${challenge}`);
    expect(token).toBe("minted-token");
  });

  it("should throw a 404 when the challenge was never authorized or already redeemed", async () => {
    getdelMock.mockResolvedValueOnce(null);

    await expect(() =>
      cliAuthorizationTokenRedeemService.execute({ code_verifier: verifier }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@cli_authorization_token_redeem_service/CHALLENGE_NOT_AUTHORIZED",
        statusCode: 404,
      }),
    );
  });
});
