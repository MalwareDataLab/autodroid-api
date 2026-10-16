import { timingSafeEqual } from "node:crypto";
import { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { inject, injectable } from "tsyringe";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { signMcpAuthorizationClientIdPayload } from "../utils/signMcpAuthorizationClientIdPayload.util";

// Constant import
import { MCP_AUTHORIZATION_DCR_CLIENT_ID_PREFIX } from "../constants/mcpAuthorization.constant";

// Service import
import { McpAuthorizationClientMetadataFetchService } from "./mcpAuthorizationClientMetadataFetch.service";

interface IRequest {
  client_id: string;
}

interface IDcrClientIdPayload {
  redirect_uris: string[];
  client_name?: string;
}

const isValidPayloadShape = (value: unknown): value is IDcrClientIdPayload =>
  !!value &&
  typeof value === "object" &&
  Array.isArray((value as IDcrClientIdPayload).redirect_uris);

@injectable()
class McpAuthorizationClientResolveService {
  constructor(
    @inject("InMemoryDatabaseProvider")
    private inMemoryDatabaseProvider: IInMemoryDatabaseProvider,
  ) {}

  public async execute({
    client_id,
  }: IRequest): Promise<OAuthClientInformationFull | undefined> {
    if (client_id.startsWith(MCP_AUTHORIZATION_DCR_CLIENT_ID_PREFIX))
      return this.resolveDcrClient(client_id);

    if (client_id.startsWith("https://")) {
      const clientMetadataFetchService =
        new McpAuthorizationClientMetadataFetchService(
          this.inMemoryDatabaseProvider,
        );

      try {
        return await clientMetadataFetchService.execute({ client_id });
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  private resolveDcrClient(
    client_id: string,
  ): OAuthClientInformationFull | undefined {
    const remainder = client_id.slice(
      MCP_AUTHORIZATION_DCR_CLIENT_ID_PREFIX.length,
    );
    const separatorIndex = remainder.indexOf(".");
    if (separatorIndex === -1) return undefined;

    const encodedPayload = remainder.slice(0, separatorIndex);
    const signature = remainder.slice(separatorIndex + 1);

    if (!this.isValidSignature(encodedPayload, signature)) return undefined;

    let payload: unknown;
    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      );
    } catch {
      return undefined;
    }

    if (!isValidPayloadShape(payload)) return undefined;

    return {
      client_id,
      redirect_uris: payload.redirect_uris,
      ...(payload.client_name && { client_name: payload.client_name }),
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    };
  }

  private isValidSignature(encodedPayload: string, signature: string): boolean {
    const expected = signMcpAuthorizationClientIdPayload(encodedPayload);

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (signatureBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  }
}

export { McpAuthorizationClientResolveService };
