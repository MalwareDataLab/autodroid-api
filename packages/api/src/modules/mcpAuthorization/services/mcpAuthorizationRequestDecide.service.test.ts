import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { hashBase64Url } from "@shared/utils/hashBase64Url";

// Constant import
import { MCP_AUTHORIZATION_CODE_KEY_PREFIX } from "../constants/mcpAuthorization.constant";

// DTO import
import type { IMcpAuthorizationCodeRecordDTO } from "../types/IMcpAuthorizationRecord.dto";

// Entity import
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { McpAuthorizationClientRegisterService } from "./mcpAuthorizationClientRegister.service";
import { McpAuthorizationClientResolveService } from "./mcpAuthorizationClientResolve.service";
import { McpAuthorizationRequestCreateService } from "./mcpAuthorizationRequestCreate.service";
import { McpAuthorizationRequestShowService } from "./mcpAuthorizationRequestShow.service";

// Target import
import { McpAuthorizationRequestDecideService } from "./mcpAuthorizationRequestDecide.service";

const REDIRECT_URI = "http://localhost:33418/callback";

describe("Service: McpAuthorizationRequestDecideService", () => {
  let inMemoryDatabaseProvider: IInMemoryDatabaseProvider;
  let mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository;

  const createPresentedRequest = async () => {
    const { client_id } = new McpAuthorizationClientRegisterService().execute({
      redirect_uris: [REDIRECT_URI],
      client_name: "Example Agent",
    });
    const client = await new McpAuthorizationClientResolveService(
      inMemoryDatabaseProvider,
    ).execute({ client_id });
    const consentUrl = await new McpAuthorizationRequestCreateService(
      inMemoryDatabaseProvider,
    ).execute({
      client: client!,
      params: { codeChallenge: "challenge", redirectUri: REDIRECT_URI },
    });
    const request_id = new URL(consentUrl).searchParams.get(
      "request_id",
    ) as string;
    await new McpAuthorizationRequestShowService(
      inMemoryDatabaseProvider,
    ).execute({ request_id, is_admin: false });

    return request_id;
  };

  const decide = (request_id: string, user_id: string, approve: boolean) =>
    new McpAuthorizationRequestDecideService(
      inMemoryDatabaseProvider,
      mcpAuthorizationGrantRepository,
    ).execute({
      request_id,
      approve,
      is_admin: false,
      user_auth_provider_conn: {
        id: "conn-1",
        user_id,
      } as UserAuthProviderConn,
    });

  const storedCodeKeys = () =>
    inMemoryDatabaseProvider.connection.keys(
      `${inMemoryDatabaseProvider.connection.options.keyPrefix}${MCP_AUTHORIZATION_CODE_KEY_PREFIX}*`,
    );

  const storedCodeRecord = async (code: string) =>
    JSON.parse(
      (await inMemoryDatabaseProvider.connection.get(
        `${MCP_AUTHORIZATION_CODE_KEY_PREFIX}${hashBase64Url(code)}`,
      ))!,
    ) as IMcpAuthorizationCodeRecordDTO;

  beforeEach(() => {
    inMemoryDatabaseProvider = container.resolve("InMemoryDatabaseProvider");
    mcpAuthorizationGrantRepository = container.resolve(
      "McpAuthorizationGrantRepository",
    );
  });

  it("should let exactly one of two concurrent approvals of the same request mint a code, rejecting the other as not found", async () => {
    const { id: user_id } = await userFactory.create();
    const request_id = await createPresentedRequest();

    const outcomes = await Promise.allSettled([
      decide(request_id, user_id, true),
      decide(request_id, user_id, true),
    ]);

    const fulfilled = outcomes.filter(
      (outcome): outcome is PromiseFulfilledResult<{ redirect_to: string }> =>
        outcome.status === "fulfilled",
    );
    const rejected = outcomes.filter(
      (outcome): outcome is PromiseRejectedResult =>
        outcome.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toEqual(
      expect.objectContaining({
        key: "@mcp_authorization_request_decide_service/REQUEST_NOT_FOUND",
        statusCode: 404,
      }),
    );
    const code = new URL(fulfilled[0].value.redirect_to).searchParams.get(
      "code",
    ) as string;
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await storedCodeKeys()).toHaveLength(1);
    expect(await storedCodeRecord(code)).toEqual(
      expect.objectContaining({ user_id, redirect_uri: REDIRECT_URI }),
    );
  });

  it("should reject a deny that loses the race to an approval as not found, so the user is never told denied while a code was minted", async () => {
    const { id: user_id } = await userFactory.create();
    const request_id = await createPresentedRequest();

    const [approval, denial] = await Promise.allSettled([
      decide(request_id, user_id, true),
      decide(request_id, user_id, false),
    ]);

    expect(approval.status).toBe("fulfilled");
    expect(denial).toEqual({
      status: "rejected",
      reason: expect.objectContaining({
        key: "@mcp_authorization_request_decide_service/REQUEST_NOT_FOUND",
        statusCode: 404,
      }),
    });
    expect(await storedCodeKeys()).toHaveLength(1);
  });
});
