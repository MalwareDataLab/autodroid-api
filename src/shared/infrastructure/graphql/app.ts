import path from "node:path";
import { Server } from "node:http";
import fs from "node:fs/promises";
import { GraphQLSchema, lexicographicSortSchema } from "graphql";
import { buildSchemaSync } from "type-graphql";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { RequestHandler } from "express";
import { printSchemaWithDirectives } from "@graphql-tools/utils";

// Configuration import
import { getEnvConfig } from "@config/env";

// Resolver import
import { resolvers } from "./resolvers";

// Helper import
import { GraphQLContext, contextHandler } from "./context";
import { authenticationHandler } from "./authentication";
import { errorHandler, errorPlugin } from "./error";
import { validationHandler } from "./validation";
import { ComplexityPlugin } from "./complexity";

class GraphQLApp {
  public readonly initialization: Promise<void>;

  public readonly schema: GraphQLSchema;
  public readonly server: ApolloServer<GraphQLContext>;
  public middleware: RequestHandler;

  public readonly graphqlSchemaPath = path.resolve(
    __dirname,
    "generated",
    "schema.gql",
  );

  constructor(httpServer: Server) {
    this.schema = buildSchemaSync({
      resolvers,
      emitSchemaFile: this.graphqlSchemaPath,
      authChecker: authenticationHandler,
      authMode: "error",
      validateFn: validationHandler,
    });

    this.server = new ApolloServer<GraphQLContext>({
      schema: this.schema,
      csrfPrevention: true,
      includeStacktraceInErrorResponses:
        process.env.NODE_ENV !== "production" && process.env.DEBUG === "true",
      formatError: errorHandler,
      cache: "bounded",
      introspection: true,
      plugins: [
        errorPlugin,
        ComplexityPlugin(this.schema),
        ...(getEnvConfig().NODE_ENV === "production"
          ? [ApolloServerPluginLandingPageDisabled()]
          : [
              ApolloServerPluginDrainHttpServer({ httpServer }),
              ApolloServerPluginLandingPageLocalDefault({ embed: true }),
            ]),
      ],
    });
    this.initialization = this.init();
  }

  private async emitSchemaDefinitionWithDirectivesFile(): Promise<void> {
    const schemaFileContent = printSchemaWithDirectives(
      lexicographicSortSchema(this.schema),
    );
    await fs.writeFile(this.graphqlSchemaPath, schemaFileContent);
  }

  private async init(): Promise<void> {
    await this.emitSchemaDefinitionWithDirectivesFile();

    await this.server.start();
    this.middleware = expressMiddleware(this.server, {
      context: contextHandler,
    });
  }
}

export { GraphQLApp };
