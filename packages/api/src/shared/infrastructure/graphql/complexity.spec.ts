import { buildSchema, parse, OperationDefinitionNode } from "graphql";
import { getComplexity } from "graphql-query-complexity";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

// Target import
import { ComplexityPlugin } from "./complexity";

vi.mock("graphql-query-complexity", () => ({
  getComplexity: vi.fn(),
  fieldExtensionsEstimator: vi.fn(() => "fieldEstimator"),
  simpleEstimator: vi.fn(() => "simpleEstimator"),
}));

const schema = buildSchema(`
  type Query {
    page(take: Int): Int
  }
`);
const document = parse(`
  query Op($take: Int) {
    page(take: $take)
  }
`);

const operation = document.definitions[0] as OperationDefinitionNode;

const invokeDidResolveOperation = async (
  request: { variables?: Record<string, unknown> } = { variables: {} },
  resolvedOperation: OperationDefinitionNode = operation,
) => {
  const plugin = ComplexityPlugin(schema);
  const listener: any = await (plugin.requestDidStart as any)();
  await listener.didResolveOperation({
    request: { operationName: "Op", ...request },
    document,
    operation: resolvedOperation,
  });
};

describe("GraphQL: ComplexityPlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow an operation whose complexity is within the limit", async () => {
    (getComplexity as Mock).mockReturnValue(10);

    await expect(invokeDidResolveOperation()).resolves.toBeUndefined();
    expect(getComplexity).toHaveBeenCalledOnce();
  });

  it("should throw when the operation complexity exceeds the maximum", async () => {
    (getComplexity as Mock).mockReturnValue(1000);

    await expect(invokeDidResolveOperation()).rejects.toThrowError(
      expect.objectContaining({ key: "@graphql/TOO_COMPLEX_QUERY" }),
    );
  });

  it.each([
    ["a request that sends no variables", {}, operation],
    [
      "an operation that declares no variables",
      { variables: {} },
      { ...operation, variableDefinitions: undefined },
    ],
  ])("should measure %s", async (_label, request, resolvedOperation) => {
    (getComplexity as Mock).mockReturnValue(10);

    await expect(
      invokeDidResolveOperation(request, resolvedOperation),
    ).resolves.toBeUndefined();
    expect(getComplexity).toHaveBeenCalledOnce();
  });

  it("should leave variables the schema refuses to the execution, which answers them as bad input rather than as a server failure", async () => {
    (getComplexity as Mock).mockImplementation(() => {
      throw new Error('Variable "$take" got invalid value 1.5.');
    });

    await expect(
      invokeDidResolveOperation({ variables: { take: 1.5 } }),
    ).resolves.toBeUndefined();
    expect(getComplexity).not.toHaveBeenCalled();
  });
});
