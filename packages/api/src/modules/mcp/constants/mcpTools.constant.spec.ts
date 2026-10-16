import {
  FieldNode,
  GraphQLInputType,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  getNamedType,
  getVariableValues,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
  parse,
  typeFromAST,
  validate,
  visit,
} from "graphql";
import { buildSchemaSync } from "type-graphql";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// Util import
import {
  IMcpContractTool,
  MCP_TOOL_CONTRACT as contract,
  MCP_TOOL_NAME_PREFIX as REMOTE_NAME_PREFIX,
  mcpToolNamesOf,
} from "@/test/utils/mcpToolContract.util";
import { buildMcpToolInputShape } from "@modules/mcp/utils/mcpToolInputShape.util";
import { wholeListResult } from "@modules/mcp/utils/mcpToolResult.util";

// Constant import
import { MCP_TAKE_LIMIT, MCP_UNOFFERED_ARGUMENTS } from "./mcp.constant";

// DTO import
import { IMcpToolDefinition } from "@modules/mcp/types/IMcpToolDefinition.dto";

// Infrastructure import
import { authenticationHandler } from "@shared/infrastructure/graphql/authentication";
import { ComplexityPlugin } from "@shared/infrastructure/graphql/complexity";
import { resolvers } from "@shared/infrastructure/graphql/resolvers";
import { validationHandler } from "@shared/infrastructure/graphql/validation";

// Target import
import { MCP_ADMIN_TOOLS, MCP_USER_TOOLS } from "./mcpTools.constant";

const REMOTE_CREATE_DATASET_EXTRA_OUTPUT = ["file"];

const REMOTE_DESCRIPTIONS: Record<string, string> = {
  create_dataset:
    "Register a new dataset from its file's metadata. Returns the dataset and a short-lived signed URL: upload the file bytes to it with an HTTP PUT whose Content-Type is the MIME type mime_type names, before it expires.",
  admin_update_processor:
    "Replace a processor's whole definition with the given one. Requires admin access.",
};

const ALL_TOOLS = [...MCP_USER_TOOLS, ...MCP_ADMIN_TOOLS];

const inputJsonSchemaOf = (tool: IMcpToolDefinition) =>
  z.toJSONSchema(z.object(buildMcpToolInputShape(tool)), { io: "input" });

const toolOf = (name: string) =>
  ALL_TOOLS.find(tool => tool.name === `${REMOTE_NAME_PREFIX}${name}`)!;

const annotationsFor = (effect: IMcpContractTool["effect"]) => ({
  readOnlyHint: effect === "read",
  destructiveHint: effect === "destructive",
  openWorldHint: false,
});

const schema = buildSchemaSync({
  resolvers,
  authChecker: authenticationHandler,
  authMode: "error",
  validateFn: validationHandler,
});

const operationOf = (document: string): OperationDefinitionNode =>
  parse(document).definitions.find(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === Kind.OPERATION_DEFINITION,
  )!;

const rootFieldOf = (document: string): FieldNode => {
  const { selections } = operationOf(document).selectionSet;
  return selections[0] as FieldNode;
};

const selectionNames = (selectionSet: SelectionSetNode | undefined) =>
  (selectionSet?.selections ?? []).map(
    selection => (selection as FieldNode).name.value,
  );

const askedFields = (document: string) =>
  selectionNames(rootFieldOf(document).selectionSet);

const askedItemFields = (document: string) => {
  const edges = (
    rootFieldOf(document).selectionSet!.selections as FieldNode[]
  ).find(selection => selection.name.value === "edges")!;
  return selectionNames(
    (edges.selectionSet!.selections[0] as FieldNode).selectionSet,
  );
};

const selectedFieldNames = (document: string) => {
  const names: string[] = [];
  visit(parse(document), {
    Field: node => {
      names.push(node.name.value);
    },
  });
  return names;
};

const graphqlPathsOf = (
  type: GraphQLInputType,
  path: string,
): (readonly [string, boolean])[] => {
  const namedType = getNamedType(type);
  return isInputObjectType(namedType)
    ? Object.values(namedType.getFields()).flatMap(field => [
        [`${path}.${field.name}`, isNonNullType(field.type)] as const,
        ...graphqlPathsOf(field.type, `${path}.${field.name}`),
      ])
    : [];
};

const presentBranchOf = (
  jsonSchema: Record<string, any>,
): Record<string, any> =>
  jsonSchema.anyOf
    ? jsonSchema.anyOf.find((branch: any) => branch.type !== "null")
    : jsonSchema;

const objectSchemaOf = (
  jsonSchema: Record<string, any>,
): Record<string, any> => {
  const present = presentBranchOf(jsonSchema);
  return present.type === "array" ? objectSchemaOf(present.items) : present;
};

const jsonPathsOf = (
  jsonSchema: Record<string, any>,
  path: string,
): (readonly [string, boolean])[] => {
  const objectSchema = objectSchemaOf(jsonSchema);
  const required: string[] = objectSchema.required ?? [];
  return Object.entries(objectSchema.properties ?? {}).flatMap(
    ([name, property]) => {
      const propertyPath = path ? `${path}.${name}` : name;
      return [
        [propertyPath, required.includes(name)] as const,
        ...jsonPathsOf(property as Record<string, any>, propertyPath),
      ];
    },
  );
};

const undescribedPathsOf = (
  jsonSchema: Record<string, any>,
  path: string,
): string[] =>
  Object.entries(objectSchemaOf(jsonSchema).properties ?? {}).flatMap(
    ([name, property]) => {
      const propertyPath = path ? `${path}.${name}` : name;
      return [
        ...((property as Record<string, any>).description
          ? []
          : [propertyPath]),
        ...undescribedPathsOf(property as Record<string, any>, propertyPath),
      ];
    },
  );

const sampleValue = (type: GraphQLInputType): unknown => {
  if (isNonNullType(type)) return sampleValue(type.ofType);
  if (isListType(type)) return [];
  if (isEnumType(type)) return type.getValues()[0].name;
  if (isInputObjectType(type))
    return Object.fromEntries(
      Object.values(type.getFields())
        .filter(field => isNonNullType(field.type))
        .map(field => [field.name, sampleValue(field.type)]),
    );

  return (
    (
      {
        Int: 1,
        Boolean: true,
        DateTimeISO: "2026-01-01T00:00:00.000Z",
        JSON: {},
      } as Record<string, unknown>
    )[getNamedType(type).name] ?? "x"
  );
};

const sampleVariables = (document: string) =>
  Object.fromEntries(
    (operationOf(document).variableDefinitions ?? []).map(definition => [
      definition.variable.name.value,
      sampleValue(typeFromAST(schema, definition.type as any) as any),
    ]),
  );

const OPERATION_TOOL_NAMES: Record<string, string> = Object.fromEntries(
  contract.map(tool => [tool.field, `${REMOTE_NAME_PREFIX}${tool.name}`]),
);

const WORKER_MACHINE_OPERATIONS = [
  "worker",
  "workerProcessing",
  "workerProcessingCaptureMetricsFileUpload",
  "workerProcessingCaptureResultFileUpload",
  "workerProcessingGenerateMetricsFileUpload",
  "workerProcessingGenerateResultFileUpload",
  "workerProcessingRegisterFailure",
  "workerProcessingRegisterProgress",
  "workerProcessingRegisterSuccess",
  "workerRegister",
  "workerUpdateAccessToken",
  "workerUpdateRefreshToken",
];

const rootOperationNames = [
  ...Object.keys(schema.getQueryType()!.getFields()),
  ...Object.keys(schema.getMutationType()!.getFields()),
].sort();

const SECRET_FIELDS = [
  "access_token",
  "refresh_token",
  "payload",
  "provider_path",
  "seq",
  "internal_id",
  "signature",
  "system_info",
  "agent_info",
  "registration_token",
  "registration_token_id",
  "learning_data",
  "phone_number",
  "md5_hash",
  "storage_provider",
];

const SECRET_FIELD_EXCEPTIONS: Record<string, string[]> = {
  token: [
    "autodroid_admin_show_worker_registration_token",
    "autodroid_admin_create_worker_registration_token",
  ],
  upload_url: ["autodroid_create_dataset"],
  upload_url_expires_at: ["autodroid_create_dataset"],
};

describe("MCP: shared tool contract", () => {
  it("should load the 53-tool contract", () => {
    expect(contract).toHaveLength(53);
  });

  it("should offer exactly the contract's user tools, in its order", () => {
    expect(MCP_USER_TOOLS.map(tool => tool.name)).toEqual(
      mcpToolNamesOf("user"),
    );
  });

  it("should offer exactly the contract's admin tools, in its order", () => {
    expect(MCP_ADMIN_TOOLS.map(tool => tool.name)).toEqual(
      mcpToolNamesOf("admin"),
    );
  });

  it.each(contract.map(tool => [tool.name, tool] as const))(
    "%s should carry the annotations its effect implies",
    (name, contractTool) => {
      expect(toolOf(name).annotations).toEqual(
        annotationsFor(contractTool.effect),
      );
    },
  );

  it.each(contract.map(tool => [tool.name, tool] as const))(
    "%s should be described as the contract describes it",
    (name, contractTool) => {
      expect(toolOf(name).description).toBe(
        REMOTE_DESCRIPTIONS[name] ?? contractTool.description,
      );
    },
  );

  describe("GraphQL operation parity", () => {
    it("should take a distinct GraphQL root field for every tool of the contract", () => {
      expect(Object.keys(OPERATION_TOOL_NAMES)).toHaveLength(contract.length);
    });

    it("should map every GraphQL query and mutation to a tool or to the worker machine list", () => {
      const unmappedOperations = rootOperationNames.filter(
        operationName =>
          !(operationName in OPERATION_TOOL_NAMES) &&
          !WORKER_MACHINE_OPERATIONS.includes(operationName),
      );

      expect(unmappedOperations).toEqual([]);
    });

    it("should only map operations the GraphQL schema still exposes", () => {
      expect(
        [
          ...Object.keys(OPERATION_TOOL_NAMES),
          ...WORKER_MACHINE_OPERATIONS,
        ].sort(),
      ).toEqual(rootOperationNames);
    });

    it("should not offer any tool that no GraphQL operation backs", () => {
      expect(ALL_TOOLS.map(tool => tool.name).sort()).toEqual(
        Object.values(OPERATION_TOOL_NAMES).sort(),
      );
    });
  });

  describe.each(contract.map(tool => [tool.name, tool] as const))(
    "%s operation",
    (name, contractTool) => {
      const tool = toolOf(name);

      it("should be valid against the GraphQL schema", () => {
        expect(validate(schema, parse(tool.document))).toEqual([]);
      });

      it("should run only the contract's GraphQL field, as a query when it only reads", () => {
        const operation = operationOf(tool.document);

        expect(operation.selectionSet.selections).toHaveLength(1);
        expect(rootFieldOf(tool.document).name.value).toBe(contractTool.field);
        expect(operation.operation).toBe(
          contractTool.effect === "read" ? "query" : "mutation",
        );
      });

      it("should stay within the API's query complexity limit", async () => {
        const operation = operationOf(tool.document);
        const variables = sampleVariables(tool.document);
        const hooks = await ComplexityPlugin(schema).requestDidStart!(
          {} as any,
        );

        expect(
          getVariableValues(schema, operation.variableDefinitions!, variables)
            .errors,
        ).toBeUndefined();
        await expect(
          (hooks as any).didResolveOperation({
            request: {
              operationName: undefined,
              variables,
            },
            document: parse(tool.document),
            operation,
          }),
        ).resolves.toBeUndefined();
      });

      it("should not ask for a secret field", () => {
        const asked = selectedFieldNames(tool.document);

        expect(asked.filter(field => SECRET_FIELDS.includes(field))).toEqual(
          [],
        );
      });

      it("should ask for a restricted field only when it is the tool's purpose", () => {
        const asked = selectedFieldNames(tool.document);

        Object.entries(SECRET_FIELD_EXCEPTIONS).forEach(([field, allowed]) => {
          expect(asked.includes(field)).toBe(allowed.includes(tool.name));
        });
      });
    },
  );

  describe.each(ALL_TOOLS.map(tool => [tool.name, tool] as const))(
    "%s input",
    (_name, tool) => {
      const input = inputJsonSchemaOf(tool);
      const operation = operationOf(tool.document);
      const rootField = rootFieldOf(tool.document);
      const rootType =
        operation.operation === "mutation"
          ? schema.getMutationType()!
          : schema.getQueryType()!;
      const offeredArguments = rootType
        .getFields()
        [
          rootField.name.value
        ].args.filter(argument => !MCP_UNOFFERED_ARGUMENTS.includes(argument.name));

      it("should offer exactly the arguments and input object fields its GraphQL field declares, requiring at least what GraphQL requires", () => {
        const declared = Object.fromEntries(
          offeredArguments.flatMap(argument => [
            [argument.name, isNonNullType(argument.type)] as const,
            ...graphqlPathsOf(argument.type, argument.name),
          ]),
        );
        const offered = Object.fromEntries(jsonPathsOf(input, ""));

        expect(Object.keys(offered).sort()).toEqual(
          Object.keys(declared).sort(),
        );
        expect(
          Object.keys(declared).filter(
            path => declared[path] && !offered[path],
          ),
        ).toEqual([]);
      });

      it("should pass each input to the same-named argument through a same-named variable", () => {
        const variableNames = operation.variableDefinitions!.map(
          variable => variable.variable.name.value,
        );
        const argumentBindings = (rootField.arguments ?? []).map(argument => [
          argument.name.value,
          argument.value.kind === Kind.VARIABLE
            ? argument.value.name.value
            : null,
        ]);

        expect(variableNames.sort()).toEqual(
          Object.keys(input.properties!).sort(),
        );
        expect(argumentBindings).toEqual(
          argumentBindings.map(([argumentName]) => [
            argumentName,
            argumentName,
          ]),
        );
      });

      it("should describe every input it offers, nested input object fields included", () => {
        expect(undescribedPathsOf(input, "")).toEqual([]);
      });
    },
  );

  const connectionTools = contract.filter(
    tool => tool.itemOutput && !toolOf(tool.name).result,
  );
  const wholeListTools = contract.filter(
    tool => toolOf(tool.name).result === wholeListResult,
  );
  const plainTools = contract.filter(
    tool => !tool.itemOutput && !toolOf(tool.name).result,
  );

  it.each(connectionTools.map(tool => [tool.name, tool] as const))(
    "%s should ask for the contract's item fields in each item of its page",
    (name, contractTool) => {
      expect(askedItemFields(toolOf(name).document).sort()).toEqual(
        [...contractTool.itemOutput!].sort(),
      );
      expect(askedFields(toolOf(name).document).sort()).toEqual(
        ["edges", "pageInfo", "totalCount"].sort(),
      );
    },
  );

  it.each(wholeListTools.map(tool => [tool.name, tool] as const))(
    "%s should ask for the contract's item fields of the list it returns whole",
    (name, contractTool) => {
      expect(askedFields(toolOf(name).document).sort()).toEqual(
        [...contractTool.itemOutput!].sort(),
      );
    },
  );

  it.each(plainTools.map(tool => [tool.name, tool] as const))(
    "%s should ask for exactly the fields the contract returns",
    (name, contractTool) => {
      expect(askedFields(toolOf(name).document).sort()).toEqual(
        [
          ...contractTool.output,
          ...(name === "create_dataset"
            ? REMOTE_CREATE_DATASET_EXTRA_OUTPUT
            : []),
        ].sort(),
      );
    },
  );

  describe("list tools", () => {
    it.each(
      ALL_TOOLS.filter(tool => tool.inputPolicy).map(
        tool => [tool.name, tool] as const,
      ),
    )(
      "%s should give both take and skip a default, as the API wants both or neither",
      (_name, tool) => {
        const variables = operationOf(tool.document).variableDefinitions!;
        const defaultOf = (name: string) =>
          variables.find(variable => variable.variable.name.value === name)!
            .defaultValue;

        expect(defaultOf("take")).toMatchObject({
          kind: Kind.INT,
          value: "10",
        });
        expect(defaultOf("skip")).toMatchObject({ kind: Kind.INT, value: "0" });
      },
    );

    it.each(
      ALL_TOOLS.filter(tool => tool.inputPolicy).map(
        tool => [tool.name, tool] as const,
      ),
    )(
      "%s should hand its page and sorting to the GraphQL field and take no page above the cap",
      (_name, tool) => {
        const pageArguments = Object.fromEntries(
          (rootFieldOf(tool.document).arguments ?? []).map(argument => [
            argument.name.value,
            argument.value.kind === Kind.VARIABLE
              ? argument.value.name.value
              : null,
          ]),
        );
        const input = z.object(buildMcpToolInputShape(tool));

        expect({
          take: pageArguments.take,
          skip: pageArguments.skip,
          sorting: pageArguments.sorting,
          acceptsTheCap: input.safeParse({ take: MCP_TAKE_LIMIT }).success,
          acceptsAboveTheCap: input.safeParse({ take: MCP_TAKE_LIMIT + 1 })
            .success,
          acceptsNoPage: input.safeParse({ take: 0 }).success,
        }).toEqual({
          take: "take",
          skip: "skip",
          sorting: "sorting",
          acceptsTheCap: true,
          acceptsAboveTheCap: false,
          acceptsNoPage: false,
        });
      },
    );
  });

  describe("results", () => {
    it("should return the session's validity and the user, never its tokens", () => {
      expect(
        toolOf("show_session").result!({
          session: {
            user: { id: "user-1" },
            user_auth_provider_conn: { id: "conn-1" },
            user_session: {
              access_token_expires_at: "2026-01-01T00:00:00.000Z",
              refresh_token_expires_at: null,
            },
          },
        }),
      ).toEqual({
        user: { id: "user-1" },
        user_auth_provider_conn_id: "conn-1",
        access_token_expires_at: "2026-01-01T00:00:00.000Z",
        refresh_token_expires_at: null,
      });
    });

    it("should confirm that every session was closed", () => {
      expect(
        toolOf("close_sessions").result!({ userSessionsClose: { id: "c" } }),
      ).toEqual({ closed: true });
    });
  });
});
