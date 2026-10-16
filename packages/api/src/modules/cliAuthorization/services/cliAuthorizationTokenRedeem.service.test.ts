import { createHash } from "node:crypto";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Target import
import { CliAuthorizationTokenRedeemService } from "./cliAuthorizationTokenRedeem.service";

describe("Service: CliAuthorizationTokenRedeemService", () => {
  const verifier = "b".repeat(43);
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  let inMemoryDatabaseProvider: IInMemoryDatabaseProvider;

  let cliAuthorizationTokenRedeemService: CliAuthorizationTokenRedeemService;

  beforeEach(() => {
    inMemoryDatabaseProvider = container.resolve("InMemoryDatabaseProvider");

    cliAuthorizationTokenRedeemService = new CliAuthorizationTokenRedeemService(
      inMemoryDatabaseProvider,
    );
  });

  it("should atomically redeem a token stored in real Redis, deleting it on read", async () => {
    await inMemoryDatabaseProvider.connection.set(
      `cli-authorization:${challenge}`,
      "minted-token",
      "EX",
      300,
      "NX",
    );

    const token = await cliAuthorizationTokenRedeemService.execute({
      code_verifier: verifier,
    });
    expect(token).toBe("minted-token");

    const remaining = await inMemoryDatabaseProvider.connection.get(
      `cli-authorization:${challenge}`,
    );
    expect(remaining).toBeNull();
  });

  it("should throw a 404 when the challenge was never authorized", async () => {
    await expect(
      cliAuthorizationTokenRedeemService.execute({ code_verifier: verifier }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@cli_authorization_token_redeem_service/CHALLENGE_NOT_AUTHORIZED",
        statusCode: 404,
      }),
    );
  });

  it("should throw a 404 when the same challenge is redeemed twice", async () => {
    await inMemoryDatabaseProvider.connection.set(
      `cli-authorization:${challenge}`,
      "minted-token",
      "EX",
      300,
      "NX",
    );

    await cliAuthorizationTokenRedeemService.execute({
      code_verifier: verifier,
    });

    await expect(
      cliAuthorizationTokenRedeemService.execute({ code_verifier: verifier }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@cli_authorization_token_redeem_service/CHALLENGE_NOT_AUTHORIZED",
      }),
    );
  });
});
