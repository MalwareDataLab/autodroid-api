import fs from "node:fs/promises";
import { Server } from "node:http";
import path from "node:path";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { printSchemaWithDirectives } from "@graphql-tools/utils";
import { GraphQLSchema, lexicographicSortSchema } from "graphql";
import { buildSchemaSync } from "type-graphql";

// Configuration import
import { getEnvConfig } from "@config/env";

// Error import
import { errorHandler, errorPlugin } from "./error";

// Context import
import { GraphQLContext, contextHandler } from "./context";

// Infrastructure import
import { authenticationHandler } from "./authentication";
import { ComplexityPlugin } from "./complexity";
import { resolvers } from "./resolvers";
import { validationHandler } from "./validation";

class GraphQLApp {
  public readonly initialization: Promise<void>;

  public readonly schema: GraphQLSchema;
  public readonly server: ApolloServer<GraphQLContext>;
  public middleware: any;

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
