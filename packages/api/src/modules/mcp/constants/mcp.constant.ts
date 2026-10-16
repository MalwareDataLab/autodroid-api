export const MCP_SERVER_NAME = "autodroid";

export const MCP_TAKE_DEFAULT = 10;
export const MCP_TAKE_LIMIT = 100;

export const MCP_UNOFFERED_ARGUMENTS = ["after", "before", "first", "last"];

export const MCP_LIST_PAGE_DESCRIPTION =
  "Returns one page: items, total_count (how many match in all) and has_next_page.";

export const MCP_READ_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
};
export const MCP_WRITE_TOOL_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: false,
};
export const MCP_DESTRUCTIVE_TOOL_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: false,
};
