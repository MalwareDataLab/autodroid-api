import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Entity import
import { McpAuthorizationGrant } from "../entities/mcpAuthorizationGrant.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

interface IRequest {
  user_id: string;
  grant_id: string;
  language: string;
}

const ERROR_KEY_PREFIX = "@user_mcp_authorization_grant_revoke_service";

@injectable()
class UserMcpAuthorizationGrantRevokeService {
  constructor(
    @inject("McpAuthorizationGrantRepository")
    private mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository,
  ) {}

  public async execute({
    user_id,
    grant_id,
    language,
  }: IRequest): Promise<McpAuthorizationGrant> {
    const t = await i18n(language);

    const grant = await this.mcpAuthorizationGrantRepository.updateOne(
      { id: grant_id, user_id, active: true },
      { revoked_at: new Date() },
    );

    if (!grant)
      throw new AppError({
        key: `${ERROR_KEY_PREFIX}/GRANT_NOT_FOUND`,
        message: t(
          `${ERROR_KEY_PREFIX}/GRANT_NOT_FOUND`,
          "Connection not found.",
        ),
        statusCode: 404,
      });

    return grant;
  }
}

export { UserMcpAuthorizationGrantRevokeService };
