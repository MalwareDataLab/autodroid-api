// Entity import
import { McpAuthorizationGrant } from "../entities/mcpAuthorizationGrant.entity";

export type McpAuthorizationGrantRelationFields = "user";

export type McpAuthorizationGrantComputedFields = "client_verified_host";

export type IMcpAuthorizationGrantBase = Omit<
  McpAuthorizationGrant,
  McpAuthorizationGrantComputedFields | McpAuthorizationGrantRelationFields
>;

export type ICreateMcpAuthorizationGrantDTO = Omit<
  IMcpAuthorizationGrantBase,
  "seq" | "updated_at" | "revoked_at" | "token_generation"
>;

export type IUpsertMcpAuthorizationGrantDTO = Omit<
  ICreateMcpAuthorizationGrantDTO,
  "created_at"
>;

export type IFindMcpAuthorizationGrantDTO = Partial<
  Pick<McpAuthorizationGrant, "id" | "user_id" | "client_id" | "resource">
> & {
  active?: true;
};

export type IUpdateMcpAuthorizationGrantDTO = Partial<
  Pick<McpAuthorizationGrant, "revoked_at" | "last_used_at">
>;
