// DTO import
import {
  ICreateMcpAuthorizationGrantDTO,
  IFindMcpAuthorizationGrantDTO,
  IUpdateMcpAuthorizationGrantDTO,
  IUpsertMcpAuthorizationGrantDTO,
} from "../types/IMcpAuthorizationGrant.dto";

// Entity import
import { McpAuthorizationGrant } from "../entities/mcpAuthorizationGrant.entity";

export interface IMcpAuthorizationGrantRepository {
  createOne(
    data: ICreateMcpAuthorizationGrantDTO,
  ): Promise<McpAuthorizationGrant>;

  upsertOne(
    data: IUpsertMcpAuthorizationGrantDTO,
  ): Promise<McpAuthorizationGrant>;

  findOne(
    filter: IFindMcpAuthorizationGrantDTO,
  ): Promise<McpAuthorizationGrant | null>;
  findMany(
    filter: IFindMcpAuthorizationGrantDTO,
  ): Promise<McpAuthorizationGrant[]>;

  updateOne(
    filter: IFindMcpAuthorizationGrantDTO,
    data: IUpdateMcpAuthorizationGrantDTO,
  ): Promise<McpAuthorizationGrant | null>;
  updateMany(
    filter: IFindMcpAuthorizationGrantDTO,
    data: IUpdateMcpAuthorizationGrantDTO,
  ): Promise<number>;
}
