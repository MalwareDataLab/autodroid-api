import { inject, injectable } from "tsyringe";

// Entity import
import { McpAuthorizationGrant } from "../entities/mcpAuthorizationGrant.entity";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

interface IRequest {
  user_id: string;
}

@injectable()
class UserMcpAuthorizationGrantIndexService {
  constructor(
    @inject("McpAuthorizationGrantRepository")
    private mcpAuthorizationGrantRepository: IMcpAuthorizationGrantRepository,
  ) {}

  public async execute({
    user_id,
  }: IRequest): Promise<McpAuthorizationGrant[]> {
    return this.mcpAuthorizationGrantRepository.findMany({
      user_id,
      active: true,
    });
  }
}

export { UserMcpAuthorizationGrantIndexService };
