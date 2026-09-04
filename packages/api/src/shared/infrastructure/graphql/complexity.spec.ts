import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

// Plugin import
import { getComplexity } from "graphql-query-complexity";
import { ComplexityPlugin } from "./complexity";

// Library import

vi.mock("graphql-query-complexity", () => ({
  getComplexity: vi.fn(),
  fieldExtensionsEstimator: vi.fn(() => "fieldEstimator"),
  simpleEstimator: vi.fn(() => "simpleEstimator"),
}));

const invokeDidResolveOperation = async () => {
  const plugin = ComplexityPlugin({} as any);
  const listener: any = await (plugin.requestDidStart as any)();
  await listener.didResolveOperation({
    request: { operationName: "Op", variables: {} },
    document: {},
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
});
