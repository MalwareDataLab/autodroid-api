import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  helmet: vi.fn(() => vi.fn()),
  getEnvConfig: vi.fn(() => ({ NODE_ENV: "test" })),
  setupExpressErrorHandler: vi.fn(),
  getPassport: vi.fn(() => ({
    initialize: vi.fn(() => vi.fn()),
    session: vi.fn(() => vi.fn()),
  })),
}));

vi.mock("helmet", () => ({ default: hoisted.helmet }));

vi.mock("@config/env", () => ({ getEnvConfig: hoisted.getEnvConfig }));

vi.mock("@config/cors", () => ({ getCorsConfig: () => ({ origin: "*" }) }));

vi.mock("@config/session", () => ({
  getSessionConfig: () => ({
    secret: "test-secret",
    resave: false,
    saveUninitialized: false,
  }),
}));

vi.mock("@sentry/node", () => ({
  setupExpressErrorHandler: hoisted.setupExpressErrorHandler,
}));

vi.mock("@shared/infrastructure/sentry", () => ({}));

vi.mock("../graphql", () => ({
  GraphQLApp: class {
    initialization = Promise.resolve();

    middleware = vi.fn();
  },
}));

vi.mock("../websocket", () => ({
  WebsocketApp: class {
    server = { close: vi.fn() };
  },
}));

vi.mock("../saml/strategy", () => ({
  federationManager: {
    getPassport: hoisted.getPassport,
    BASE_SAML_PATH: "/saml",
  },
}));

vi.mock("../saml/routes", () => ({
  samlRouter: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("./routes", () => ({
  router: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("./middlewares/lightRateLimiter.middleware", () => ({
  lightRateLimiterMiddleware: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("./middlewares/userAgent.middleware", () => ({
  userAgentMiddleware: (_req: any, _res: any, next: any) => next(),
}));

vi.mock(
  "@modules/authentication/infrastructure/http/middlewares/authentication.middleware",
  () => ({
    authenticationMiddleware: (_req: any, _res: any, next: any) => next(),
  }),
);

vi.mock(
  "@modules/worker/infrastructure/http/middlewares/workerAuthentication.middleware",
  () => ({
    workerAuthenticationMiddleware: (_req: any, _res: any, next: any) => next(),
  }),
);

const buildApp = async () => {
  const [
    { App },
    { authenticationMiddleware },
    { workerAuthenticationMiddleware },
  ] = await Promise.all([
    import("./app"),
    import(
      "@modules/authentication/infrastructure/http/middlewares/authentication.middleware"
    ),
    import(
      "@modules/worker/infrastructure/http/middlewares/workerAuthentication.middleware"
    ),
  ]);

  const app = new App();
  const { stack } = (app.express as any)._router;

  return {
    app,
    stack,
    handlers: stack.map((layer: any) => layer.handle),
    authenticationMiddleware,
    workerAuthenticationMiddleware,
  };
};

describe("App: http", () => {
  beforeEach(() => {
    vi.resetModules();
    hoisted.helmet.mockClear();
    hoisted.getEnvConfig.mockReturnValue({ NODE_ENV: "test" } as any);
  });

  it("should scope exactly one middleware to the graphql path", async () => {
    const { stack } = await buildApp();

    const graphqlScoped = stack.filter(
      (layer: any) =>
        layer.regexp?.test?.("/graphql") &&
        !layer.regexp?.test?.("/processing"),
    );

    expect(graphqlScoped).toHaveLength(1);
  });

  it("should scope the saml router to its base path only", async () => {
    const { stack } = await buildApp();

    const samlLayer = stack.find(
      (layer: any) =>
        layer.regexp?.test?.("/saml") && !layer.regexp?.test?.("/graphql"),
    );

    expect(samlLayer).toBeDefined();
    expect(samlLayer.regexp.test("/processing")).toBe(false);
  });

  it("should skip helmet outside production", async () => {
    await buildApp();

    expect(hoisted.helmet).not.toHaveBeenCalled();
  });

  it("should mount helmet in production", async () => {
    hoisted.getEnvConfig.mockReturnValue({ NODE_ENV: "production" } as any);

    await buildApp();

    expect(hoisted.helmet).toHaveBeenCalled();
  });

  it("should register the sentry error handler against the express instance", async () => {
    const { app } = await buildApp();

    expect(hoisted.setupExpressErrorHandler).toHaveBeenCalledWith(app.express);
  });

  it("should trust the first proxy hop", async () => {
    const { app } = await buildApp();

    expect(app.express.get("trust proxy")).toBe(1);
  });

  it("should answer an unmatched path with a 404", async () => {
    const { stack } = await buildApp();

    const fallback = stack
      .filter((layer: any) => layer.handle?.length === 3)
      .slice(-1)[0].handle;
    const send = vi.fn();
    const res = { status: vi.fn(() => ({ send })) };
    const next = vi.fn();

    fallback({ path: "/unknown" }, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });

  it("should hand a graphql path past the fallback", async () => {
    const { stack } = await buildApp();

    const fallback = stack
      .filter((layer: any) => layer.handle?.length === 3)
      .slice(-1)[0].handle;
    const res = { status: vi.fn() };
    const next = vi.fn();

    fallback({ path: "/graphql" }, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should build the graphql and websocket servers on the same http server", async () => {
    const { app } = await buildApp();

    expect(app.httpServer.listeners("request")).toContain(app.express);
    await expect(app.graphqlServer.initialization).resolves.toBeUndefined();
    expect(app.websocketServer.server).toHaveProperty("close");
  });
});
