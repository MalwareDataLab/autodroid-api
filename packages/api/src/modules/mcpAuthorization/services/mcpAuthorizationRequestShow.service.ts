import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { grantableMcpAuthorizationScopes } from "../utils/resolveMcpAuthorizationScopes.util";

// Constant import
import {
  MCP_AUTHORIZATION_LOOPBACK_HOSTNAMES,
  MCP_AUTHORIZATION_REQUEST_KEY_PREFIX,
} from "../constants/mcpAuthorization.constant";

// DTO import
import type { IMcpAuthorizationRequestRecordDTO } from "../types/IMcpAuthorizationRecord.dto";

interface IRequest {
  request_id: string;
  is_admin: boolean;
}

interface IResult {
  scopes: string[];
  client_name?: string;
  redirect_uri: string;
  redirect_host: string;
  only_loopback_redirects: boolean;
  redirect_host_differs_from_client_id_host?: boolean;
}

@injectable()
class McpAuthorizationRequestShowService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,
  ) {}

  public async execute({ request_id, is_admin }: IRequest): Promise<IResult> {
    const key = `${MCP_AUTHORIZATION_REQUEST_KEY_PREFIX}${request_id}`;

    const raw = await this.inMemoryDatabaseProvider.connection.get(key);
    if (!raw)
      throw new AppError({
        key: "@mcp_authorization_request_show_service/REQUEST_NOT_FOUND",
        message: "This authorization request was not found or has expired.",
        statusCode: 404,
      });

    const record: IMcpAuthorizationRequestRecordDTO = JSON.parse(raw);

    if (!grantableMcpAuthorizationScopes(record.scopes, is_admin).length)
      throw new AppError({
        key: "@mcp_authorization_request_show_service/NOTHING_TO_GRANT",
        message:
          "Nothing this request asks for may be granted to your account.",
        statusCode: 400,
      });

    const setResult = await this.inMemoryDatabaseProvider.connection.set(
      key,
      JSON.stringify({ ...record, presented_at: Date.now() }),
      "KEEPTTL",
      "XX",
    );
    if (!setResult)
      throw new AppError({
        key: "@mcp_authorization_request_show_service/REQUEST_NOT_FOUND",
        message: "This authorization request was not found or has expired.",
        statusCode: 404,
      });

    return this.buildResult(record, is_admin);
  }

  private buildResult(
    record: IMcpAuthorizationRequestRecordDTO,
    is_admin: boolean,
  ): IResult {
    const redirectHost = new URL(record.redirect_uri).hostname;
    const isCimdClient = record.client_kind === "cimd";

    return {
      scopes: grantableMcpAuthorizationScopes(record.scopes, is_admin),
      client_name: record.client_name,
      redirect_uri: record.redirect_uri,
      redirect_host: redirectHost,
      only_loopback_redirects: record.redirect_uris.every(uri =>
        MCP_AUTHORIZATION_LOOPBACK_HOSTNAMES.includes(new URL(uri).hostname),
      ),
      ...(isCimdClient && {
        redirect_host_differs_from_client_id_host:
          new URL(record.client_id).hostname !== redirectHost,
      }),
    };
  }
}

export { McpAuthorizationRequestShowService };
