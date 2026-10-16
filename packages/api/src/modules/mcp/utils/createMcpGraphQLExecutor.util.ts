import { ValidationError } from "class-validator";

// Error import
import { AppError } from "@shared/errors/AppError";

// Context import
import {
  GraphQLContext,
  contextHandler,
} from "@shared/infrastructure/graphql/context";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";

// Infrastructure import
import type { GraphQLApp } from "@shared/infrastructure/graphql";

interface IMcpGraphQLExecution {
  document: string;
  variables: Record<string, unknown>;
  session: Session;
  req: GraphQLContext["req"];
  res: GraphQLContext["res"];
}

const findNestedConstraintMessage = (
  errors: ValidationError[],
): string | undefined =>
  errors.reduce<string | undefined>(
    (foundMessage, error) =>
      foundMessage ??
      (error.constraints
        ? Object.values(error.constraints)[0]
        : findNestedConstraintMessage(error.children ?? [])),
    undefined,
  );

const createMcpGraphQLExecutor =
  (graphqlApp: GraphQLApp) =>
  async ({
    document,
    variables,
    session,
    req,
    res,
  }: IMcpGraphQLExecution): Promise<Record<string, any>> => {
    await graphqlApp.initialization;

    const { body } = await graphqlApp.server.executeOperation(
      { query: document, variables },
      {
        contextValue: {
          ...(await contextHandler({ req, res })),
          user_session: session,
          worker_session: undefined as never,
        },
      },
    );

    if (body.kind !== "single")
      throw new Error("The GraphQL API answered with a stream.");

    const { data, errors } = body.singleResult;

    if (errors?.length) {
      const [error] = errors;
      const { validationErrors } = error.extensions ?? {};

      throw new AppError({
        key: String(error.extensions?.code ?? "@mcp_tools/OPERATION_FAILED"),
        message:
          (Array.isArray(validationErrors)
            ? findNestedConstraintMessage(validationErrors)
            : undefined) ?? error.message,
      });
    }

    return data as Record<string, any>;
  };

export { createMcpGraphQLExecutor };
