import { ApolloServerPlugin } from "@apollo/server";
import { GraphQLSchema, getVariableValues } from "graphql";
import {
  getComplexity,
  fieldExtensionsEstimator,
  simpleEstimator,
} from "graphql-query-complexity";

// Error import
import { AppError } from "@shared/errors/AppError";

const MAX_COMPLEXITY = 220;

export const ComplexityPlugin = (
  schema: GraphQLSchema,
): ApolloServerPlugin => ({
  requestDidStart: async () => ({
    async didResolveOperation({ request, document, operation }) {
      const { errors: variableErrors } = getVariableValues(
        schema,
        operation!.variableDefinitions ?? [],
        request.variables ?? {},
      );
      if (variableErrors) return;

      const complexity = getComplexity({
        schema,
        operationName: request.operationName,
        query: document,
        variables: request.variables,
        estimators: [
          fieldExtensionsEstimator(),
          simpleEstimator({ defaultComplexity: 1 }),
        ],
      });

      if (complexity > MAX_COMPLEXITY) {
        throw new AppError({
          key: "@graphql/TOO_COMPLEX_QUERY",
          message: `Query too complex! ${complexity} exceeded the maximum allowed complexity of ${MAX_COMPLEXITY}`,
        });
      }
    },
  }),
});
