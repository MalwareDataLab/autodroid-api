import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Target import
import { McpAuthorizationRequestShowService } from "./mcpAuthorizationRequestShow.service";

const REQUEST_ID = "a".repeat(43);

const record = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    client_id: "https://client.example.com/.well-known/mcp-client.json",
    client_kind: "cimd",
    client_name: "Example MCP Client",
    redirect_uris: ["https://client.example.com/callback"],
    redirect_uri: "https://client.example.com/callback",
    code_challenge: "challenge",
    scopes: ["autodroid:read", "autodroid:write", "autodroid:admin"],
    ...overrides,
  });

describe("Service: McpAuthorizationRequestShowService", () => {
  let getMock: ReturnType<typeof vi.fn>;
  let setMock: ReturnType<typeof vi.fn>;
  let inMemoryDatabaseProviderMock: Mocked<IInMemoryDatabaseProvider>;
  let service: McpAuthorizationRequestShowService;

  beforeEach(() => {
    getMock = vi.fn().mockResolvedValue(record());
    setMock = vi.fn().mockResolvedValue("OK");

    inMemoryDatabaseProviderMock = {
      initialization: Promise.resolve(),
      connection: { get: getMock, set: setMock },
    } as unknown as Mocked<IInMemoryDatabaseProvider>;

    service = new McpAuthorizationRequestShowService(
      inMemoryDatabaseProviderMock,
    );
  });

  it("should throw a 404 when the request does not exist", async () => {
    getMock.mockResolvedValueOnce(null);

    await expect(
      service.execute({ request_id: REQUEST_ID, is_admin: false }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_request_show_service/REQUEST_NOT_FOUND",
        statusCode: 404,
      }),
    );
  });

  it("should mark the request as presented, preserving its TTL", async () => {
    await service.execute({ request_id: REQUEST_ID, is_admin: false });

    expect(setMock).toHaveBeenCalledWith(
      `mcp-oauth:request:${REQUEST_ID}`,
      expect.stringContaining('"presented_at":'),
      "KEEPTTL",
      "XX",
    );
  });

  it("should throw a 404 instead of recreating a permanent record when the request was deleted between the read and the write (a decision racing this call)", async () => {
    setMock.mockResolvedValueOnce(null);

    await expect(
      service.execute({ request_id: REQUEST_ID, is_admin: false }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_request_show_service/REQUEST_NOT_FOUND",
        statusCode: 404,
      }),
    );
  });

  it("should describe a CIMD client whose redirect host matches its client_id host", async () => {
    const result = await service.execute({
      request_id: REQUEST_ID,
      is_admin: false,
    });

    expect(result).toStrictEqual({
      scopes: ["autodroid:read", "autodroid:write"],
      client_name: "Example MCP Client",
      redirect_uri: "https://client.example.com/callback",
      redirect_host: "client.example.com",
      only_loopback_redirects: false,
      redirect_host_differs_from_client_id_host: false,
    });
  });

  it("should show an administrator every scope that was asked for", async () => {
    const result = await service.execute({
      request_id: REQUEST_ID,
      is_admin: true,
    });

    expect(result.scopes).toEqual([
      "autodroid:read",
      "autodroid:write",
      "autodroid:admin",
    ]);
  });

  it("should refuse to show a request whose scopes this person may not hold at all, without marking it presented", async () => {
    getMock.mockResolvedValueOnce(record({ scopes: ["autodroid:admin"] }));

    await expect(
      service.execute({ request_id: REQUEST_ID, is_admin: false }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@mcp_authorization_request_show_service/NOTHING_TO_GRANT",
        statusCode: 400,
      }),
    );
    expect(setMock).not.toHaveBeenCalled();
  });

  it("should flag when a CIMD client's redirect host differs from its client_id host", async () => {
    getMock.mockResolvedValueOnce(
      record({ redirect_uri: "https://attacker.example.com/callback" }),
    );

    const result = await service.execute({
      request_id: REQUEST_ID,
      is_admin: false,
    });

    expect(result.redirect_host_differs_from_client_id_host).toBe(true);
  });

  it("should omit the host-mismatch flag for a DCR client", async () => {
    getMock.mockResolvedValueOnce(
      record({ client_id: "mcpc1.abc.def", client_kind: "dcr" }),
    );

    const result = await service.execute({
      request_id: REQUEST_ID,
      is_admin: false,
    });

    expect(result).toStrictEqual({
      scopes: ["autodroid:read", "autodroid:write"],
      client_name: "Example MCP Client",
      redirect_uri: "https://client.example.com/callback",
      redirect_host: "client.example.com",
      only_loopback_redirects: false,
    });
  });

  it("should flag only loopback redirects when the only registered redirect is a loopback address", async () => {
    getMock.mockResolvedValueOnce(
      record({
        client_id: "mcpc1.abc.def",
        client_kind: "dcr",
        redirect_uris: ["http://127.0.0.1:3118/callback"],
        redirect_uri: "http://127.0.0.1:3118/callback",
      }),
    );

    const result = await service.execute({
      request_id: REQUEST_ID,
      is_admin: false,
    });

    expect(result.only_loopback_redirects).toBe(true);
  });

  it("should flag only loopback redirects when the only registered redirect is the IPv6 loopback address", async () => {
    getMock.mockResolvedValueOnce(
      record({
        client_id: "mcpc1.abc.def",
        client_kind: "dcr",
        redirect_uris: ["http://[::1]:3118/callback"],
        redirect_uri: "http://[::1]:3118/callback",
      }),
    );

    const result = await service.execute({
      request_id: REQUEST_ID,
      is_admin: false,
    });

    expect(result.only_loopback_redirects).toBe(true);
  });

  it("should not flag only_loopback_redirects when the client also registered a non-loopback redirect", async () => {
    getMock.mockResolvedValueOnce(
      record({
        client_id: "mcpc1.abc.def",
        client_kind: "dcr",
        redirect_uris: [
          "http://127.0.0.1:3118/callback",
          "https://client.example.com/callback",
        ],
        redirect_uri: "http://127.0.0.1:3118/callback",
      }),
    );

    const result = await service.execute({
      request_id: REQUEST_ID,
      is_admin: false,
    });

    expect(result.only_loopback_redirects).toBe(false);
  });

  it("should omit client_name when the client registered none", async () => {
    getMock.mockResolvedValueOnce(record({ client_name: undefined }));

    const result = await service.execute({
      request_id: REQUEST_ID,
      is_admin: false,
    });

    expect(result.client_name).toBeUndefined();
  });
});
