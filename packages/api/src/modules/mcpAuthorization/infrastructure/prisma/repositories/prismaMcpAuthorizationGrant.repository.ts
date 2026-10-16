import { inject, injectable } from "tsyringe";

// Provider import
import {
  DatabaseHelperTypes,
  IDatabaseProvider,
} from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Util import
import { parse } from "@shared/utils/instanceParser";

// DTO import
import {
  ICreateMcpAuthorizationGrantDTO,
  IFindMcpAuthorizationGrantDTO,
  IUpdateMcpAuthorizationGrantDTO,
  IUpsertMcpAuthorizationGrantDTO,
} from "@modules/mcpAuthorization/types/IMcpAuthorizationGrant.dto";

// Entity import
import { McpAuthorizationGrant } from "@modules/mcpAuthorization/entities/mcpAuthorizationGrant.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "@modules/mcpAuthorization/repositories/IMcpAuthorizationGrant.repository";

@injectable()
class PrismaMcpAuthorizationGrantRepository
  implements IMcpAuthorizationGrantRepository
{
  private readonly relations =
    {} satisfies DatabaseHelperTypes.McpAuthorizationGrantInclude;

  constructor(
    @inject("DatabaseProvider")
    private databaseProvider: IDatabaseProvider,
  ) {}

  private getWhereClause({
    id,
    user_id,
    client_id,
    resource,
    active,
  }: IFindMcpAuthorizationGrantDTO): DatabaseHelperTypes.McpAuthorizationGrantWhereInput {
    return {
      id,
      user_id,
      client_id,
      resource,

      ...(active && {
        revoked_at: null,
        expires_at: { gt: new Date() },
      }),
    };
  }

  private getUpdateData(
    data: IUpdateMcpAuthorizationGrantDTO,
  ): DatabaseHelperTypes.McpAuthorizationGrantUpdateManyMutationInput {
    return {
      ...data,

      ...(data.revoked_at && { token_generation: { increment: 1 } }),
    };
  }

  public async createOne(
    data: ICreateMcpAuthorizationGrantDTO,
  ): Promise<McpAuthorizationGrant> {
    const mcpAuthorizationGrant =
      await this.databaseProvider.client.mcpAuthorizationGrant.create({
        data,
        include: this.relations,
      });

    return parse(McpAuthorizationGrant, mcpAuthorizationGrant);
  }

  public async upsertOne({
    id,
    user_id,
    client_id,
    resource,
    ...authorization
  }: IUpsertMcpAuthorizationGrantDTO): Promise<McpAuthorizationGrant> {
    const mcpAuthorizationGrant =
      await this.databaseProvider.client.mcpAuthorizationGrant.upsert({
        where: {
          user_id_client_id_resource: { user_id, client_id, resource },
        },
        create: { id, user_id, client_id, resource, ...authorization },
        update: { ...authorization, revoked_at: null },
        include: this.relations,
      });

    return parse(McpAuthorizationGrant, mcpAuthorizationGrant);
  }

  public async findOne(
    filter: IFindMcpAuthorizationGrantDTO,
  ): Promise<McpAuthorizationGrant | null> {
    if (!filter.id && !filter.user_id)
      throw new Error("A grant lookup needs an id or a user_id.");

    const mcpAuthorizationGrant =
      await this.databaseProvider.client.mcpAuthorizationGrant.findFirst({
        where: this.getWhereClause(filter),
        include: this.relations,
      });

    return mcpAuthorizationGrant
      ? parse(McpAuthorizationGrant, mcpAuthorizationGrant)
      : null;
  }

  public async findMany(
    filter: IFindMcpAuthorizationGrantDTO,
  ): Promise<McpAuthorizationGrant[]> {
    const mcpAuthorizationGrants =
      await this.databaseProvider.client.mcpAuthorizationGrant.findMany({
        where: this.getWhereClause(filter),
        include: this.relations,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
      });

    return parse(McpAuthorizationGrant, mcpAuthorizationGrants);
  }

  public async updateOne(
    filter: IFindMcpAuthorizationGrantDTO,
    data: IUpdateMcpAuthorizationGrantDTO,
  ): Promise<McpAuthorizationGrant | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    const mcpAuthorizationGrant =
      await this.databaseProvider.client.mcpAuthorizationGrant.update({
        where: { id: record.id },
        data: this.getUpdateData(data),
        include: this.relations,
      });

    return parse(McpAuthorizationGrant, mcpAuthorizationGrant);
  }

  public async updateMany(
    filter: IFindMcpAuthorizationGrantDTO,
    data: IUpdateMcpAuthorizationGrantDTO,
  ): Promise<number> {
    if (!filter.id && !filter.user_id)
      throw new Error("A bulk grant update needs an id or a user_id.");

    const { count } =
      await this.databaseProvider.client.mcpAuthorizationGrant.updateMany({
        where: this.getWhereClause(filter),
        data: this.getUpdateData(data),
      });

    return count;
  }
}

export { PrismaMcpAuthorizationGrantRepository };
