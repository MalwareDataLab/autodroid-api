/* eslint-disable no-console */
import "reflect-metadata";
import "@shared/infrastructure/sentry";

import express, { Express } from "express";
import "express-async-errors";
import * as Sentry from "@sentry/node";
import cors from "cors";
import useragent from "express-useragent";
import helmet from "helmet";
import http, { Server } from "node:http";
import * as i18nextMiddleware from "i18next-http-middleware";
import cookieParser from "cookie-parser";
import session from "express-session";

// i18n import
import { i18next } from "@shared/i18n";

// Configuration import
import { getEnvConfig } from "@config/env";
import { getCorsConfig } from "@config/cors";
import { getSessionConfig } from "@config/session";

// Middleware import
import { authenticationMiddleware } from "@modules/authentication/infrastructure/http/middlewares/authentication.middleware";
import { userAgentMiddleware } from "./middlewares/userAgent.middleware";
import { lightRateLimiterMiddleware } from "./middlewares/lightRateLimiter.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";

// Route import
import { router } from "./routes";
import { samlRouter } from "../saml/routes";

// App import
import { GraphQLApp } from "../graphql";
import { WebsocketApp } from "../websocket";
import { federationManager } from "../saml/strategy";

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
    this.express.use(cors(getCorsConfig()));
    this.express.use(cookieParser());
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));

    this.express.use(lightRateLimiterMiddleware);

    this.express.use(i18nextMiddleware.handle(i18next) as any);
    this.express.use(useragent.express());

    this.express.use(userAgentMiddleware);

    const samlPassport = this.samlManager.getPassport();
    this.express.use(session(getSessionConfig()));
    this.express.use(samlPassport.initialize());
    this.express.use(samlPassport.session());
    this.express.use(this.samlManager.BASE_SAML_PATH, samlRouter);

    this.express.use(authenticationMiddleware);
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
