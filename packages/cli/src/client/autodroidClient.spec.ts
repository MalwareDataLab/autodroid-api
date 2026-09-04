import { beforeEach, describe, expect, it, vi } from "vitest";

// Target import
import { executeGraphQL } from "./autodroidClient";

describe("CLI: autodroidClient", () => {
  const params = {
    endpoint: "https://api.example.test/graphql",
    idToken: "id-token",
    query: "query User { user { id } }",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should send the query with the bearer token", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { user: { id: "user-1" } } }),
    } as Response);

    const result = await executeGraphQL({
      ...params,
      variables: { first: 10 },
    });

    expect(result).toEqual({ user: { id: "user-1" } });
    expect(fetch).toHaveBeenCalledWith(params.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer id-token",
      },
      body: JSON.stringify({ query: params.query, variables: { first: 10 } }),
    });
  });

  it("should default the variables to an empty set", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: {} }),
    } as Response);

    await executeGraphQL(params);

    expect(fetch).toHaveBeenCalledWith(
      params.endpoint,
      expect.objectContaining({
        body: JSON.stringify({ query: params.query, variables: {} }),
      }),
    );
  });

  it("should omit the authorization header when there is no token", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: {} }),
    } as Response);

    await executeGraphQL({ ...params, idToken: undefined });

    expect(fetch).toHaveBeenCalledWith(
      params.endpoint,
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("should fail with the transport status when the request is rejected", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    await expect(executeGraphQL(params)).rejects.toThrowError(
      "AutoDroid API request failed with status 503.",
    );
  });

  it("should fail with the first graphql error message", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        errors: [{ message: "Unauthorized." }, { message: "Ignored." }],
      }),
    } as Response);

    await expect(executeGraphQL(params)).rejects.toThrowError("Unauthorized.");
  });
});
