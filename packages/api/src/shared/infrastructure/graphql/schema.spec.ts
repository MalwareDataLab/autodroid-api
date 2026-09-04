import { describe, expect, it } from "vitest";
import { buildSchemaSync } from "type-graphql";
import { GraphQLObjectType, validateSchema } from "graphql";

// Resolver import
import { resolvers } from "./resolvers";

// Helper import
import { authenticationHandler } from "./authentication";
import { validationHandler } from "./validation";

const schema = buildSchemaSync({
  resolvers,
  authChecker: authenticationHandler,
  authMode: "error",
  validateFn: validationHandler,
});

const fieldNames = (type: GraphQLObjectType | null | undefined) =>
  type ? Object.keys(type.getFields()) : [];

describe("GraphQL: schema", () => {
  it("should resolve every registered type reference", () => {
    expect(validateSchema(schema)).toEqual([]);
  });

  it("should expose the user facing queries", () => {
    const queries = fieldNames(schema.getQueryType());

    expect(queries).toEqual(
      expect.arrayContaining([
        "user",
        "userDatasets",
        "userProcesses",
        "userProcessors",
        "healthCheck",
      ]),
    );
  });

  it("should expose the admin queries", () => {
    const queries = fieldNames(schema.getQueryType());

    expect(queries).toEqual(
      expect.arrayContaining([
        "adminDatasets",
        "adminProcesses",
        "adminProcessors",
        "adminWorkers",
      ]),
    );
  });

  it("should expose the worker mutations", () => {
    const mutations = fieldNames(schema.getMutationType());

    expect(mutations).toEqual(
      expect.arrayContaining([
        "workerRegister",
        "workerProcessingRegisterSuccess",
        "workerProcessingRegisterFailure",
      ]),
    );
  });

  it("should type every field of the Processing entity", () => {
    const processing = schema.getType("Processing") as GraphQLObjectType;

    expect(fieldNames(processing)).toEqual(
      expect.arrayContaining(["id", "status", "dataset", "processor"]),
    );
  });

  it("should keep every query and mutation uniquely named", () => {
    const queries = fieldNames(schema.getQueryType());
    const mutations = fieldNames(schema.getMutationType());

    expect(new Set(queries).size).toBe(queries.length);
    expect(new Set(mutations).size).toBe(mutations.length);
  });
});
