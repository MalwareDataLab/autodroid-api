import { describe, expect, it } from "vitest";

// Util import
import { completeAuthorization } from "@/test/utils/mcpOAuthFlow.util";

// Type import
import type { TestContext } from "@/test/types/testContext.type";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

const postMcp = async (
  context: TestContext,
  access_token: string,
  method: string,
  params: Record<string, unknown> = {},
) => {
  const response = await context.request
    .post("/mcp")
    .set("Authorization", `Bearer ${access_token}`)
    .set("Accept", "application/json, text/event-stream")
    .send({ jsonrpc: "2.0", id: 11, method, params });
  expect(response.status).toBe(200);
  return response.body.result;
};

const openObjectPathsOf = (
  jsonSchema: Record<string, any>,
  path: string,
): string[] => [
  ...(jsonSchema.properties && jsonSchema.additionalProperties !== false
    ? [path]
    : []),
  ...Object.entries(jsonSchema.properties ?? {}).flatMap(([name, property]) =>
    openObjectPathsOf(property as Record<string, any>, `${path}.${name}`),
  ),
  ...(jsonSchema.anyOf ?? []).flatMap((branch: Record<string, any>) =>
    openObjectPathsOf(branch, path),
  ),
  ...(jsonSchema.items ? openObjectPathsOf(jsonSchema.items, `${path}[]`) : []),
];

describe("E2E: remote MCP tool input keys", () => {
  it("should publish every tool input object, nested ones included, as closed to undeclared keys", async context => {
    const { access_token } = await completeAuthorization(
      context,
      context.adminAuthorized,
    );

    const { tools } = await postMcp(context, access_token, "tools/list");

    expect(tools.length).toBeGreaterThan(0);
    expect(
      tools.flatMap((tool: { name: string; inputSchema: object }) =>
        openObjectPathsOf(tool.inputSchema, tool.name),
      ),
    ).toEqual([]);
  });

  it("should refuse an undeclared key at the top or inside the data, naming it, and leave the dataset untouched", async context => {
    const user = await userFactory.create({ email: context.userSession.email });
    const dataset = await datasetFactory.create({
      user_id: user.id,
      visibility: DATASET_VISIBILITY.PRIVATE,
      description: "Kept description",
      tags: "kept,tags",
    });
    const { access_token } = await completeAuthorization(context);

    const nestedTypoResult = await postMcp(
      context,
      access_token,
      "tools/call",
      {
        name: "autodroid_update_dataset",
        arguments: {
          dataset_id: dataset.id,
          data: { tags: "new,tags", descripton: "Typo" },
        },
      },
    );
    const topLevelKeyResult = await postMcp(
      context,
      access_token,
      "tools/call",
      {
        name: "autodroid_update_dataset",
        arguments: {
          dataset_id: dataset.id,
          data: { description: "New", tags: "new,tags" },
          unexpected_key: true,
        },
      },
    );

    expect(nestedTypoResult).toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: 'MCP error -32602: Input validation error: Invalid arguments for tool autodroid_update_dataset: Unrecognized key: "descripton" at data',
        },
      ],
    });
    expect(topLevelKeyResult).toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: 'MCP error -32602: Input validation error: Invalid arguments for tool autodroid_update_dataset: Unrecognized key: "unexpected_key"',
        },
      ],
    });
    await expect(
      context.repositories.DatasetRepository.findOne({ id: dataset.id }),
    ).resolves.toMatchObject({
      description: "Kept description",
      tags: "kept,tags",
    });
  });
});
