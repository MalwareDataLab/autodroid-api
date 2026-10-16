import { describe, expect, it } from "vitest";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { gql } from "@/test/utils/gql.util";

// Constant import
import { MCP_DEFAULT_SCOPES } from "@modules/mcpAuthorization/constants/mcpAuthorization.constant";

// Repository import
import { IMcpAuthorizationGrantRepository } from "@modules/mcpAuthorization/repositories/IMcpAuthorizationGrant.repository";

// Factory import
import { mcpAuthorizationGrantFactory } from "@modules/mcpAuthorization/entities/factories/mcpAuthorizationGrant.factory";

// Service import
import { McpAuthorizationTokenIssueService } from "@modules/mcpAuthorization/services/mcpAuthorizationTokenIssue.service";

const GRANTS_QUERY = gql`
  query UserMcpAuthorizationGrants {
    userMcpAuthorizationGrants {
      id
      seq
      user_id
      client_id
      client_name
      client_verified_host
      resource
      scopes
      created_at
      updated_at
      last_used_at
      expires_at
      revoked_at
    }
  }
`;

const REVOKE_MUTATION = gql`
  mutation UserMcpAuthorizationGrantRevoke($grantId: String!) {
    userMcpAuthorizationGrantRevoke(mcp_authorization_grant_id: $grantId) {
      id
      client_name
      revoked_at
    }
  }
`;

describe("E2E: UserMcpAuthorizationGrantResolver", () => {
  const signedInUserId = async (context: any): Promise<string> => {
    const userResponse = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: gql`
          query {
            user {
              id
            }
          }
        `,
      });
    return userResponse.body.data.user.id;
  };

  const seedGrant = async (
    context: any,
    clientName: string,
    clientId: string = `mcpc1.${clientName}`,
  ): Promise<string> => {
    const userId = await signedInUserId(context);

    await new McpAuthorizationTokenIssueService(
      context.container.resolve(
        "InMemoryDatabaseProvider",
      ) as IInMemoryDatabaseProvider,
      context.container.resolve(
        "McpAuthorizationGrantRepository",
      ) as IMcpAuthorizationGrantRepository,
    ).execute({
      client_id: clientId,
      user_auth_provider_conn_id: "conn-not-used-by-this-test",
      resource: getMcpConfig().resource,
      scopes: MCP_DEFAULT_SCOPES,
      user_id: userId,
      client_name: clientName,
    });

    return userId;
  };

  it("should list and then revoke the signed-in user's own connection", async context => {
    const userId = await seedGrant(context, "Example Agent");

    const listed = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: GRANTS_QUERY });

    expect(listed.status).toBe(200);
    expect(listed.body.errors).toBeUndefined();
    const agent = listed.body.data.userMcpAuthorizationGrants.find(
      (grant: { client_name: string }) => grant.client_name === "Example Agent",
    );
    expect(agent).toEqual({
      id: expect.any(String),
      seq: expect.stringMatching(/^\d+$/),
      user_id: userId,
      client_id: "mcpc1.Example Agent",
      client_name: "Example Agent",
      client_verified_host: null,
      resource: getMcpConfig().resource,
      scopes: MCP_DEFAULT_SCOPES,
      created_at: expect.any(String),
      updated_at: expect.any(String),
      last_used_at: expect.any(String),
      expires_at: expect.any(String),
      revoked_at: null,
    });

    const revoked = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: REVOKE_MUTATION, variables: { grantId: agent.id } });

    expect(revoked.body.errors).toBeUndefined();
    expect(revoked.body.data.userMcpAuthorizationGrantRevoke).toEqual({
      id: agent.id,
      client_name: "Example Agent",
      revoked_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });

    const listedAfter = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: GRANTS_QUERY });
    expect(
      listedAfter.body.data.userMcpAuthorizationGrants.map(
        (grant: { id: string }) => grant.id,
      ),
    ).not.toContain(agent.id);
  });

  it.for([["token_generation"], ["user"]])(
    "should not offer %s on a connection",
    async ([hiddenField], context) => {
      const response = await context
        .userAuthorized(context.request.post("/graphql"))
        .send({
          query: `query { userMcpAuthorizationGrants { id ${hiddenField} } }`,
        });

      expect(response.body.errors).toEqual([
        expect.objectContaining({
          extensions: expect.objectContaining({
            code: "GRAPHQL_VALIDATION_FAILED",
          }),
        }),
      ]);
    },
  );

  it("should name the host that vouches for a metadata-document client", async context => {
    await seedGrant(
      context,
      "Hosted Agent",
      "https://agent.example.com/.well-known/mcp-client.json",
    );

    const listed = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: GRANTS_QUERY });

    expect(listed.body.errors).toBeUndefined();
    expect(
      listed.body.data.userMcpAuthorizationGrants.find(
        (grant: { client_name: string }) =>
          grant.client_name === "Hosted Agent",
      ),
    ).toMatchObject({
      client_id: "https://agent.example.com/.well-known/mcp-client.json",
      client_verified_host: "agent.example.com",
    });
  });

  it("should not let another user see or revoke someone else's connection", async context => {
    await seedGrant(context, "Second Agent");
    const mine = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: GRANTS_QUERY });
    const grantOfSignedInUser = mine.body.data.userMcpAuthorizationGrants.find(
      (grant: { client_name: string }) => grant.client_name === "Second Agent",
    );

    const adminList = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({ query: GRANTS_QUERY });
    expect(
      adminList.body.data.userMcpAuthorizationGrants.map(
        (grant: { id: string }) => grant.id,
      ),
    ).not.toContain(grantOfSignedInUser.id);

    const adminRevoke = await context
      .adminAuthorized(context.request.post("/graphql"))
      .send({
        query: REVOKE_MUTATION,
        variables: { grantId: grantOfSignedInUser.id },
      });
    expect(adminRevoke.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@user_mcp_authorization_grant_revoke_service/GRANT_NOT_FOUND",
          },
        }),
      ]),
    );

    const stillThere = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: GRANTS_QUERY });
    expect(
      stillThere.body.data.userMcpAuthorizationGrants.map(
        (grant: { id: string }) => grant.id,
      ),
    ).toContain(grantOfSignedInUser.id);
  });

  it("should list every connection past the 100th, newest first, and revoke the oldest", async context => {
    const userId = await signedInUserId(context);
    const base = Date.now() - 200 * 60 * 1000;
    const ids = await Promise.all(
      Array.from(
        { length: 101 },
        async (_, index) =>
          (
            await mcpAuthorizationGrantFactory.create({
              user_id: userId,
              created_at: new Date(base + index * 60 * 1000),
            })
          ).id,
      ),
    );

    const listed = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: GRANTS_QUERY });
    expect(listed.body.errors).toBeUndefined();
    expect(
      listed.body.data.userMcpAuthorizationGrants.map(
        (grant: { id: string }) => grant.id,
      ),
    ).toEqual([...ids].reverse());

    const revoked = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: REVOKE_MUTATION, variables: { grantId: ids[0] } });
    expect(revoked.body.errors).toBeUndefined();
    expect(revoked.body.data.userMcpAuthorizationGrantRevoke.id).toBe(ids[0]);

    const listedAfter = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: GRANTS_QUERY });
    expect(
      listedAfter.body.data.userMcpAuthorizationGrants.map(
        (grant: { id: string }) => grant.id,
      ),
    ).toEqual([...ids].slice(1).reverse());
  });

  it("should answer revoking an already revoked connection as not found", async context => {
    await seedGrant(context, "Revoked Agent");
    const listed = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: GRANTS_QUERY });
    const agent = listed.body.data.userMcpAuthorizationGrants.find(
      (grant: { client_name: string }) => grant.client_name === "Revoked Agent",
    );
    await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: REVOKE_MUTATION, variables: { grantId: agent.id } });

    const again = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({ query: REVOKE_MUTATION, variables: { grantId: agent.id } });

    expect(again.body.errors).toEqual([
      expect.objectContaining({
        message: "Connection not found.",
        extensions: {
          code: "@user_mcp_authorization_grant_revoke_service/GRANT_NOT_FOUND",
        },
      }),
    ]);
  });

  it("should return an error revoking a connection that does not exist", async context => {
    const response = await context
      .userAuthorized(context.request.post("/graphql"))
      .send({
        query: REVOKE_MUTATION,
        variables: { grantId: "does-not-exist" },
      });

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extensions: {
            code: "@user_mcp_authorization_grant_revoke_service/GRANT_NOT_FOUND",
          },
        }),
      ]),
    );
  });

  it("should reject listing and revoking when unauthorized", async context => {
    const listed = await context.request
      .post("/graphql")
      .send({ query: GRANTS_QUERY });
    const revoked = await context.request.post("/graphql").send({
      query: REVOKE_MUTATION,
      variables: { grantId: "whatever" },
    });

    [listed, revoked].forEach(response => {
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ extensions: { code: "UNAUTHORIZED" } }),
        ]),
      );
    });
  });
});
