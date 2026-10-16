import { Request, Response } from "express";
import { container } from "tsyringe";

// Service import
import { McpAuthorizationRequestDecideService } from "@modules/mcpAuthorization/services/mcpAuthorizationRequestDecide.service";
import { McpAuthorizationRequestShowService } from "@modules/mcpAuthorization/services/mcpAuthorizationRequestShow.service";

class McpAuthorizationRequestController {
  public async show(req: Request, res: Response) {
    res.setHeader("Cache-Control", "no-store");

    const mcpAuthorizationRequestShowService = container.resolve(
      McpAuthorizationRequestShowService,
    );

    const result = await mcpAuthorizationRequestShowService.execute({
      request_id: req.params.request_id,
      is_admin: req.user_session.is_admin,
    });

    return res.json(result);
  }

  public async decide(req: Request, res: Response) {
    res.setHeader("Cache-Control", "no-store");

    const mcpAuthorizationRequestDecideService = container.resolve(
      McpAuthorizationRequestDecideService,
    );

    const result = await mcpAuthorizationRequestDecideService.execute({
      request_id: req.params.request_id,
      approve: req.body.approve,
      is_admin: req.user_session.is_admin,
      user_auth_provider_conn: req.user_session.user_auth_provider_conn,
    });

    return res.json(result);
  }
}

export { McpAuthorizationRequestController };
