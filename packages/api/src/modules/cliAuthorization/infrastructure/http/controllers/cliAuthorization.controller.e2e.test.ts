import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

describe("E2E: CliAuthorizationController", () => {
  it("should register a challenge/user-code pair, authorize it for the signed-in user and let the token route redeem the matching verifier", async context => {
    const verifier = "d".repeat(43);
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const userCode = "ABCDEFGH";

    const registerResponse = await context.request
      .post("/cli-auth/register")
      .send({ code_challenge: challenge, user_code: userCode });
    expect(registerResponse.status).toBe(200);
    expect(registerResponse.body).toEqual({ success: true });

    const authorizeResponse = await context
      .userAuthorized(context.request.post("/cli-auth/authorize"))
      .send({ user_code: userCode });
    expect(authorizeResponse.status).toBe(200);
    expect(authorizeResponse.body).toEqual({ success: true });

    const tokenResponse = await context.request
      .post("/cli-auth/token")
      .send({ code_verifier: verifier });

    expect(tokenResponse.status).toBe(200);
    expect(typeof tokenResponse.body.token).toBe("string");
    expect(tokenResponse.body.token.length).toBeGreaterThan(0);
  });

  it("should return 404 authorizing the same user code twice (single-use)", async context => {
    const challenge = "e".repeat(43);
    const userCode = "BBCDEFGH";

    await context.request
      .post("/cli-auth/register")
      .send({ code_challenge: challenge, user_code: userCode });
    await context
      .userAuthorized(context.request.post("/cli-auth/authorize"))
      .send({ user_code: userCode });

    const secondAuthorizeResponse = await context
      .userAuthorized(context.request.post("/cli-auth/authorize"))
      .send({ user_code: userCode });

    expect(secondAuthorizeResponse.status).toBe(404);
    expect(secondAuthorizeResponse.body).toMatchObject({
      code: "@cli_authorization_authorize_service/CODE_NOT_FOUND",
    });
  });

  it("should return 404 authorizing a user code that was never registered", async context => {
    const response = await context
      .userAuthorized(context.request.post("/cli-auth/authorize"))
      .send({ user_code: "CBCDEFGH" });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      code: "@cli_authorization_authorize_service/CODE_NOT_FOUND",
    });
  });

  it("should return 409 when two user codes resolve to the same already-authorized challenge", async context => {
    const challenge = "f".repeat(43);
    const firstUserCode = "DBCDEFGH";
    const secondUserCode = "EBCDEFGH";

    await context.request
      .post("/cli-auth/register")
      .send({ code_challenge: challenge, user_code: firstUserCode });
    await context.request
      .post("/cli-auth/register")
      .send({ code_challenge: challenge, user_code: secondUserCode });

    await context
      .userAuthorized(context.request.post("/cli-auth/authorize"))
      .send({ user_code: firstUserCode });

    const secondAuthorizeResponse = await context
      .userAuthorized(context.request.post("/cli-auth/authorize"))
      .send({ user_code: secondUserCode });

    expect(secondAuthorizeResponse.status).toBe(409);
    expect(secondAuthorizeResponse.body).toMatchObject({
      code: "@cli_authorization_authorize_service/CHALLENGE_ALREADY_AUTHORIZED",
    });
  });

  it("should return 401 authorizing without an authenticated session", async context => {
    const response = await context
      .userAuthorized(context.request.post("/cli-auth/authorize"))
      .set("Authorization", `Bearer someToken`)
      .send({ user_code: "FBCDEFGH" });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "@user_auth_middleware/NOT_AUTHENTICATED",
    });
  });

  it("should return 400 authorizing an invalid user code", async context => {
    const response = await context
      .userAuthorized(context.request.post("/cli-auth/authorize"))
      .send({ user_code: "too-short" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      key: "@general/VALIDATION_FAIL",
    });
  });

  it("should return 400 registering an invalid challenge", async context => {
    const response = await context.request
      .post("/cli-auth/register")
      .send({ code_challenge: "too-short", user_code: "GBCDEFGH" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      key: "@general/VALIDATION_FAIL",
    });
  });

  it("should return 400 registering an invalid user code", async context => {
    const response = await context.request
      .post("/cli-auth/register")
      .send({ code_challenge: "h".repeat(43), user_code: "toolongorbad" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      key: "@general/VALIDATION_FAIL",
    });
  });

  it("should return 404 redeeming a verifier that was never authorized", async context => {
    const response = await context.request
      .post("/cli-auth/token")
      .send({ code_verifier: "g".repeat(43) });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      code: "@cli_authorization_token_redeem_service/CHALLENGE_NOT_AUTHORIZED",
    });
  });

  it("should return 400 redeeming an invalid verifier", async context => {
    const response = await context.request
      .post("/cli-auth/token")
      .send({ code_verifier: "too-short" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      key: "@general/VALIDATION_FAIL",
    });
  });
});
