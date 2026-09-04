import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";

const hoisted = vi.hoisted(() => ({
  getEnvConfig: vi.fn(() => ({ NODE_ENV: "test" })),
  buildSchemaSync: vi.fn(() => ({ schema: true })),
  start: vi.fn(),
  expressMiddleware: vi.fn(() => "graphql-middleware"),
  writeFile: vi.fn(),
  printSchemaWithDirectives: vi.fn(() => "type Query { ok: Boolean }"),
  landingPageDisabled: vi.fn(() => "landing-disabled"),
  landingPageLocal: vi.fn(() => "landing-local"),
  drainHttpServer: vi.fn(() => "drain-http"),
  complexityPlugin: vi.fn(() => "complexity"),
}));

vi.mock("@config/env", () => ({ getEnvConfig: hoisted.getEnvConfig }));

vi.mock("type-graphql", () => ({ buildSchemaSync: hoisted.buildSchemaSync }));

vi.mock("graphql", () => ({
  lexicographicSortSchema: (schema: unknown) => schema,
}));

vi.mock("@apollo/server", () => ({
  ApolloServer: class {
    public options: any;

    public start = hoisted.start;

    constructor(options: any) {
      this.options = options;
    }
  },
}));

vi.mock("@apollo/server/express4", () => ({
  expressMiddleware: hoisted.expressMiddleware,
}));

vi.mock("@apollo/server/plugin/drainHttpServer", () => ({
  ApolloServerPluginDrainHttpServer: hoisted.drainHttpServer,
}));

vi.mock("@apollo/server/plugin/disabled", () => ({
  ApolloServerPluginLandingPageDisabled: hoisted.landingPageDisabled,
}));

vi.mock("@apollo/server/plugin/landingPage/default", () => ({
  ApolloServerPluginLandingPageLocalDefault: hoisted.landingPageLocal,
}));

vi.mock("@graphql-tools/utils", () => ({
  printSchemaWithDirectives: hoisted.printSchemaWithDirectives,
}));

vi.mock("node:fs/promises", () => ({
  default: { writeFile: hoisted.writeFile },
}));

vi.mock("./resolvers", () => ({ resolvers: [] }));

vi.mock("./context", () => ({ contextHandler: vi.fn() }));

vi.mock("./authentication", () => ({ authenticationHandler: vi.fn() }));

vi.mock("./error", () => ({
  errorHandler: vi.fn(),
  errorPlugin: "error-plugin",
}));

vi.mock("./validation", () => ({ validationHandler: vi.fn() }));

vi.mock("./complexity", () => ({ ComplexityPlugin: hoisted.complexityPlugin }));

const httpServer = {} as Server;

const buildGraphQLApp = async () => {
  const { GraphQLApp } = await import("./app");
  const app = new GraphQLApp(httpServer);
  await app.initialization;
  return app as typeof app & { server: { options: { plugins: string[] } } };
};

describe("App: GraphQLApp", () => {
  beforeEach(() => {
    vi.resetModules();
    hoisted.getEnvConfig.mockReturnValue({ NODE_ENV: "test" } as any);
  });

  it("should build the schema with the authentication and validation handlers", async () => {
    await buildGraphQLApp();

    expect(hoisted.buildSchemaSync).toHaveBeenCalledWith(
      expect.objectContaining({
        authMode: "error",
        emitSchemaFile: expect.stringContaining("schema.gql"),
      }),
    );
  });

  it("should mount the local landing page outside production", async () => {
    const app = await buildGraphQLApp();

    expect(app.server.options.plugins).toContain("landing-local");
    expect(app.server.options.plugins).toContain("drain-http");
    expect(app.server.options.plugins).not.toContain("landing-disabled");
  });

  it("should disable the landing page in production", async () => {
    hoisted.getEnvConfig.mockReturnValue({ NODE_ENV: "production" } as any);

    const app = await buildGraphQLApp();

    expect(app.server.options.plugins).toContain("landing-disabled");
    expect(app.server.options.plugins).not.toContain("landing-local");
    expect(app.server.options.plugins).not.toContain("drain-http");
  });

  it("should write the sorted schema definition before starting", async () => {
    await buildGraphQLApp();

    expect(hoisted.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("schema.gql"),
      "type Query { ok: Boolean }",
    );
    expect(hoisted.start).toHaveBeenCalledOnce();
  });

  it("should expose the express middleware once initialized", async () => {
    const app = await buildGraphQLApp();

    expect(app.middleware).toBe("graphql-middleware");
    expect(hoisted.expressMiddleware).toHaveBeenCalledWith(
      app.server,
      expect.objectContaining({ context: expect.any(Function) }),
    );
  });

  it("should bound the cache and keep introspection open", async () => {
    const app = await buildGraphQLApp();

    expect(app.server.options).toEqual(
      expect.objectContaining({
        cache: "bounded",
        introspection: true,
        csrfPrevention: true,
      }),
    );
  });
});
