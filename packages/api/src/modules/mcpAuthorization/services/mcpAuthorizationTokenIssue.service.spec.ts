import { createHash } from "node:crypto";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Target import
import { McpAuthorizationTokenIssueService } from "./mcpAuthorizationTokenIssue.service";

const NOW = new Date("2026-01-01T00:00:00.000Z");

const SCOPES = ["autodroid:read", "autodroid:write"];

const RESOURCE = "https://api.autodroid.example/mcp";

const STORED_EXPIRES_AT = new Date("2026-03-01T00:00:00.000Z");

describe("Service: McpAuthorizationTokenIssueService", () => {
  let setMock: ReturnType<typeof vi.fn>;
  let upsertOneMock: ReturnType<typeof vi.fn>;
  let updateManyMock: ReturnType<typeof vi.fn>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;
  let service: McpAuthorizationTokenIssueService;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(NOW);

    setMock = vi.fn().mockResolvedValue("OK");
    upsertOneMock = vi.fn().mockResolvedValue({
      id: "grant-stored",
      token_generation: 2,
      expires_at: STORED_EXPIRES_AT,
    });
    updateManyMock = vi.fn().mockResolvedValue(1);
    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { set: setMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    service = new McpAuthorizationTokenIssueService(
      inMemoryDatabaseProviderMock,
      {
        upsertOne: upsertOneMock,
        updateMany: updateManyMock,
      } as unknown as Mocked<IMcpAuthorizationGrantRepository>,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should record the connection, then mint and store an access and refresh token pair bound to the row it landed on and to that row's absolute deadline", async () => {
    const result = await service.execute({
      client_id: "mcpc1.abc.def",
      user_auth_provider_conn_id: "conn-1",
      scopes: SCOPES,
      resource: RESOURCE,
      user_id: "user-1",
      client_name: "Example Agent",
    });

    expect(result).toEqual({
      access_token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      scope: "autodroid:read autodroid:write",
    });
    expect(result.access_token).not.toBe(result.refresh_token);

    expect(setMock).toHaveBeenCalledTimes(2);

    expect(upsertOneMock).toHaveBeenCalledOnce();
    expect(upsertOneMock).toHaveBeenCalledWith({
      id: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/),
      user_id: "user-1",
      client_id: "mcpc1.abc.def",
      client_name: "Example Agent",
      resource: RESOURCE,
      scopes: SCOPES,
      expires_at: new Date(NOW.getTime() + 7776000 * 1000),
      last_used_at: NOW,
    });
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(upsertOneMock.mock.invocationCallOrder[0]).toBeLessThan(
      setMock.mock.invocationCallOrder[0],
    );

    const expectedAccessRecord = JSON.stringify({
      client_id: "mcpc1.abc.def",
      user_auth_provider_conn_id: "conn-1",
      resource: RESOURCE,
      scopes: SCOPES,
      grant_id: "grant-stored",
      token_generation: 2,
      grant_expires_at: STORED_EXPIRES_AT.getTime(),
      expires_at: Math.floor(NOW.getTime() / 1000) + 3600,
    });
    const expectedRefreshRecord = JSON.stringify({
      client_id: "mcpc1.abc.def",
      user_auth_provider_conn_id: "conn-1",
      resource: RESOURCE,
      scopes: SCOPES,
      grant_id: "grant-stored",
      token_generation: 2,
      grant_expires_at: STORED_EXPIRES_AT.getTime(),
    });

    const accessHash = createHash("sha256")
      .update(result.access_token as string)
      .digest("base64url");
    expect(setMock).toHaveBeenCalledWith(
      `mcp-oauth:access:${accessHash}`,
      expectedAccessRecord,
      "EX",
      3600,
    );

    const refreshHash = createHash("sha256")
      .update(result.refresh_token as string)
      .digest("base64url");
    expect(setMock).toHaveBeenCalledWith(
      `mcp-oauth:refresh:${refreshHash}`,
      expectedRefreshRecord,
      "EX",
      2592000,
    );
  });

  it("should reuse an existing grant, its token generation and its chain's own absolute deadline when refreshing, recording the use without touching anything else", async () => {
    await service.execute({
      client_id: "mcpc1.abc.def",
      user_auth_provider_conn_id: "conn-1",
      resource: RESOURCE,
      scopes: SCOPES,
      grant_id: "existing-grant-id",
      token_generation: 3,
      grant_expires_at: 1767225600123,
    });

    expect(setMock).toHaveBeenCalledTimes(2);
    expect(upsertOneMock).not.toHaveBeenCalled();
    expect(updateManyMock).toHaveBeenCalledExactlyOnceWith(
      { id: "existing-grant-id" },
      { last_used_at: NOW },
    );

    const [, accessStoredValue] = setMock.mock.calls[0];
    const [, refreshStoredValue] = setMock.mock.calls[1];
    expect(JSON.parse(accessStoredValue)).toMatchObject({
      grant_id: "existing-grant-id",
      token_generation: 3,
      grant_expires_at: 1767225600123,
    });
    expect(JSON.parse(refreshStoredValue)).toMatchObject({
      grant_id: "existing-grant-id",
      token_generation: 3,
      grant_expires_at: 1767225600123,
    });
  });

  it("should keep the grant's scopes on the refresh token when the access token gets fewer", async () => {
    const result = await service.execute({
      client_id: "mcpc1.abc.def",
      user_auth_provider_conn_id: "conn-1",
      resource: RESOURCE,
      scopes: ["autodroid:read"],
      grant_scopes: SCOPES,
      grant_id: "existing-grant-id",
      token_generation: 0,
      grant_expires_at: 1767225600123,
    });

    expect(result.scope).toBe("autodroid:read");
    const [, accessStoredValue] = setMock.mock.calls[0];
    const [, refreshStoredValue] = setMock.mock.calls[1];
    expect(JSON.parse(accessStoredValue).scopes).toEqual(["autodroid:read"]);
    expect(JSON.parse(refreshStoredValue).scopes).toEqual(SCOPES);
  });

  it("should store a null client name when the client declared none", async () => {
    await service.execute({
      client_id: "mcpc1.abc.def",
      user_auth_provider_conn_id: "conn-1",
      resource: RESOURCE,
      scopes: SCOPES,
      user_id: "user-1",
    });

    expect(upsertOneMock).toHaveBeenCalledWith(
      expect.objectContaining({ client_name: null }),
    );
  });

  it("should mint no token when the grant row cannot be written", async () => {
    upsertOneMock.mockRejectedValueOnce(new Error("database is down"));

    await expect(
      service.execute({
        client_id: "mcpc1.abc.def",
        user_auth_provider_conn_id: "conn-1",
        resource: RESOURCE,
        scopes: SCOPES,
        user_id: "user-1",
      }),
    ).rejects.toThrowError("database is down");
    expect(setMock).not.toHaveBeenCalled();
  });
});
