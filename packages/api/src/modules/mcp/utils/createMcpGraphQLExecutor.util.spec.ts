import { beforeEach, describe, expect, it, vi } from "vitest";

// Error import
import { AppError } from "@shared/errors/AppError";

// Target import
import { createMcpGraphQLExecutor } from "./createMcpGraphQLExecutor.util";

const SESSION = { user: { id: "user-1" }, is_admin: false } as any;

describe("Util: createMcpGraphQLExecutor", () => {
  const executeOperation = vi.fn();
  let initialized: () => void;
  let graphqlApp: any;

  const execute = (overrides: Record<string, unknown> = {}) =>
    createMcpGraphQLExecutor(graphqlApp)({
      document: "query { user { id } }",
      variables: { take: 5 },
      session: SESSION,
      req: { language: "en", t: "t", i18n: "i18n", languages: ["en"] },
      res: {},
      ...overrides,
    } as any);

  const answer = (singleResult: Record<string, unknown>) =>
    executeOperation.mockResolvedValue({
      body: { kind: "single", singleResult },
    });

  beforeEach(() => {
    graphqlApp = {
      initialization: new Promise<void>(resolve => {
        initialized = resolve;
      }),
      server: { executeOperation },
    };
  });

  it("should run the operation with its variables and return the data", async () => {
    initialized();
    answer({ data: { user: { id: "user-1" } } });

    const data = await execute();

    expect(data).toEqual({ user: { id: "user-1" } });
    expect(executeOperation).toHaveBeenCalledExactlyOnceWith(
      { query: "query { user { id } }", variables: { take: 5 } },
      { contextValue: expect.any(Object) },
    );
  });

  it("should wait for the GraphQL server to start before running anything", async () => {
    answer({ data: { user: { id: "user-1" } } });

    const pending = execute();
    await Promise.resolve();
    expect(executeOperation).not.toHaveBeenCalled();

    initialized();
    await pending;

    expect(executeOperation).toHaveBeenCalledTimes(1);
  });

  it("should give the operation the request's language and translation but the MCP session as the caller", async () => {
    initialized();
    answer({ data: {} });

    await execute();

    expect(executeOperation.mock.calls[0][1].contextValue).toMatchObject({
      language: "en",
      t: "t",
      i18n: "i18n",
      languages: ["en"],
      user_session: SESSION,
    });
  });

  it("should never let the request's own identity reach the operation", async () => {
    initialized();
    answer({ data: {} });

    await execute({
      req: {
        language: "en",
        user_session: { user: { id: "someone-else" }, is_admin: true },
        worker_session: { worker: { id: "worker-1" } },
      },
    });

    const { contextValue } = executeOperation.mock.calls[0][1];
    expect(contextValue.user_session).toBe(SESSION);
    expect(contextValue.worker_session).toBeUndefined();
  });

  it("should fail with the message the API worded for the caller, under its error code", async () => {
    initialized();
    answer({
      data: null,
      errors: [
        { message: "Dataset not found.", extensions: { code: "NOT_FOUND" } },
      ],
    });

    await expect(execute()).rejects.toMatchObject({
      key: "NOT_FOUND",
      message: "Dataset not found.",
    });
    await expect(execute()).rejects.toBeInstanceOf(AppError);
  });

  it("should fail under a generic key when the error carries no code", async () => {
    initialized();
    answer({ data: null, errors: [{ message: "Something failed." }] });

    await expect(execute()).rejects.toMatchObject({
      key: "@mcp_tools/OPERATION_FAILED",
      message: "Something failed.",
    });
  });

  it("should report the first rule an argument broke instead of the generic validation message", async () => {
    initialized();
    answer({
      data: null,
      errors: [
        {
          message: "Argument Validation Error",
          extensions: {
            code: "GRAPHQL_VALIDATION_FAILED",
            validationErrors: [
              { property: "data", children: [{ property: "a" }] },
              {
                property: "data",
                children: [
                  {
                    property: "phone_number",
                    constraints: {
                      isPhoneNumber:
                        "phone_number must be a valid phone number",
                      other: "never reached",
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    await expect(execute()).rejects.toMatchObject({
      message: "phone_number must be a valid phone number",
    });
  });

  it("should keep the API's message when the validation errors name no rule", async () => {
    initialized();
    answer({
      data: null,
      errors: [
        {
          message: "Argument Validation Error",
          extensions: { validationErrors: [{ property: "data" }] },
        },
      ],
    });

    await expect(execute()).rejects.toMatchObject({
      message: "Argument Validation Error",
    });
  });

  it("should keep the API's message when the validation errors are not a list", async () => {
    initialized();
    answer({
      data: null,
      errors: [
        {
          message: "Argument Validation Error",
          extensions: { validationErrors: { property: "data" } },
        },
      ],
    });

    await expect(execute()).rejects.toMatchObject({
      key: "@mcp_tools/OPERATION_FAILED",
      message: "Argument Validation Error",
    });
  });

  it("should refuse an answer that is not a single result", async () => {
    initialized();
    executeOperation.mockResolvedValue({
      body: { kind: "incremental", initialResult: {} },
    });

    await expect(execute()).rejects.toThrowError(
      "The GraphQL API answered with a stream.",
    );
  });
});
