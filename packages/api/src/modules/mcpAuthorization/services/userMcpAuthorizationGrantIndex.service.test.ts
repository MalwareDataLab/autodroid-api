import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Constant import
import { MCP_DEFAULT_SCOPES } from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { mcpAuthorizationGrantFactory } from "../entities/factories/mcpAuthorizationGrant.factory";

// Service import
import { McpAuthorizationTokenIssueService } from "./mcpAuthorizationTokenIssue.service";

// Target import
import { UserMcpAuthorizationGrantIndexService } from "./userMcpAuthorizationGrantIndex.service";

describe("Service: UserMcpAuthorizationGrantIndexService", () => {
  let mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository;
  let tokenIssueService: McpAuthorizationTokenIssueService;
  let service: UserMcpAuthorizationGrantIndexService;

  beforeEach(() => {
    mcpAuthorizationGrantRepository = container.resolve(
      "McpAuthorizationGrantRepository",
    );
    tokenIssueService = new McpAuthorizationTokenIssueService(
      container.resolve<IInMemoryDatabaseProvider>("InMemoryDatabaseProvider"),
      mcpAuthorizationGrantRepository,
    );
    service = new UserMcpAuthorizationGrantIndexService(
      mcpAuthorizationGrantRepository,
    );
  });

  it("should list, from the database, exactly the grants minted for this user", async () => {
    const mine = await userFactory.create();
    const theirs = await userFactory.create();
    await tokenIssueService.execute({
      client_id: "mcpc1.mine",
      user_auth_provider_conn_id: "conn-mine",
      resource: "https://api.autodroid.example/mcp",
      scopes: MCP_DEFAULT_SCOPES,
      user_id: mine.id,
      client_name: "Example Agent",
    });
    await tokenIssueService.execute({
      client_id: "mcpc1.theirs",
      user_auth_provider_conn_id: "conn-theirs",
      resource: "https://api.autodroid.example/mcp",
      scopes: MCP_DEFAULT_SCOPES,
      user_id: theirs.id,
    });

    const result = await service.execute({ user_id: mine.id });

    expect(result).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        user_id: mine.id,
        client_id: "mcpc1.mine",
        client_name: "Example Agent",
        client_verified_host: null,
        resource: "https://api.autodroid.example/mcp",
        scopes: MCP_DEFAULT_SCOPES,
        created_at: expect.any(Date),
        last_used_at: expect.any(Date),
        expires_at: expect.any(Date),
        revoked_at: null,
      }),
    ]);
    expect(
      result[0].expires_at.getTime() - result[0].last_used_at!.getTime(),
    ).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it("should leave out a revoked grant and one past its absolute lifetime", async () => {
    const user = await userFactory.create();
    const active = await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
    });
    await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
      revoked_at: new Date(),
    });
    await mcpAuthorizationGrantFactory.create({
      user_id: user.id,
      expires_at: new Date(Date.now() - 1000),
    });

    const result = await service.execute({ user_id: user.id });

    expect(result.map(grant => grant.id)).toEqual([active.id]);
  });

  it("should list every grant, newest first, when the user has more than 100", async () => {
    const user = await userFactory.create();
    const base = Date.now() - 200 * 60 * 1000;
    const ids = await Promise.all(
      Array.from(
        { length: 101 },
        async (_, index) =>
          (
            await mcpAuthorizationGrantFactory.create({
              user_id: user.id,
              created_at: new Date(base + index * 60 * 1000),
            })
          ).id,
      ),
    );

    const result = await service.execute({ user_id: user.id });

    expect(result.map(grant => grant.id)).toEqual([...ids].reverse());
  });
});
