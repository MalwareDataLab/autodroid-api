/* eslint-disable no-console */
import "reflect-metadata";
import "@shared/infrastructure/sentry";
import "express-async-errors";

import http, { Server } from "node:http";
import * as Sentry from "@sentry/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express } from "express";
import session from "express-session";
import useragent from "express-useragent";
import helmet from "helmet";
import * as i18nextMiddleware from "i18next-http-middleware";

// i18n import
import { i18next } from "@shared/i18n";

// Configuration import
import { getCorsOptionsDelegate } from "@config/cors";
import { getEnvConfig } from "@config/env";
import { getSessionConfig } from "@config/session";

// Middleware import
import { authenticationMiddleware } from "@modules/authentication/infrastructure/http/middlewares/authentication.middleware";
import { workerAuthenticationMiddleware } from "@modules/worker/infrastructure/http/middlewares/workerAuthentication.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";
import { lightRateLimiterMiddleware } from "./middlewares/lightRateLimiter.middleware";
import { userAgentMiddleware } from "./middlewares/userAgent.middleware";

// Strategy import
import { federationManager } from "../saml/strategy";

// Router import
import { buildMcpRouter } from "@modules/mcp/infrastructure/http/routes/mcp.routes";
import { mcpAuthorizationRouter } from "@modules/mcpAuthorization/infrastructure/http/routes/mcpAuthorization.routes";
import { samlRouter } from "../saml/routes";
import { router } from "./routes";

// Infrastructure import
import { GraphQLApp } from "../graphql";
import { WebsocketApp } from "../websocket";

class App {
  public readonly express: Express;
  public readonly httpServer: Server;
  public readonly graphqlServer: GraphQLApp;
  public readonly websocketServer: WebsocketApp;
  public readonly samlManager: typeof federationManager;

  constructor() {
    this.express = express();
    this.httpServer = http.createServer(this.express);
    this.graphqlServer = new GraphQLApp(this.httpServer);
    this.websocketServer = new WebsocketApp(this.httpServer);
    this.samlManager = federationManager;
    this.express.set("trust proxy", 1);

    this.middlewares();
    this.routes();
    this.gql();
    this.fallbackHandler();
    this.errorHandler();
  }

  private middlewares() {
    if (getEnvConfig().NODE_ENV === "production") this.express.use(helmet());
    this.express.use(cors(getCorsOptionsDelegate()));
    this.express.use(cookieParser());
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));

    this.express.use(lightRateLimiterMiddleware);

    this.express.use(i18nextMiddleware.handle(i18next) as any);
    this.express.use(useragent.express());

    this.express.use(userAgentMiddleware);

    this.express.use(mcpAuthorizationRouter);
    this.express.use("/mcp", buildMcpRouter(this.graphqlServer));

    const samlPassport = this.samlManager.getPassport();
    this.express.use(session(getSessionConfig()));
    this.express.use(samlPassport.initialize());
    this.express.use(samlPassport.session());
    this.express.use(this.samlManager.BASE_SAML_PATH, samlRouter);

    this.express.use(authenticationMiddleware);
    this.express.use("/graphql", workerAuthenticationMiddleware);
  }

  private routes() {
    this.express.use(router);
  }

  private async gql() {
    await this.graphqlServer.initialization;
    this.express.use(this.graphqlServer.middleware);
  }

  private errorHandler() {
    Sentry.setupExpressErrorHandler(this.express);
    this.express.use(errorMiddleware);
  }

  private fallbackHandler() {
    this.express.use((req, res, next) => {
      if (req.path.startsWith("/graphql")) return next();
      return res.status(404).send();
    });
  }
}

const app = new App();
export { App, app };
