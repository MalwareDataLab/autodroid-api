import { Request, Response } from "express";
import { container } from "tsyringe";

// Service import
import { CliAuthorizationAuthorizeService } from "@modules/cliAuthorization/services/cliAuthorizationAuthorize.service";
import { CliAuthorizationRegisterService } from "@modules/cliAuthorization/services/cliAuthorizationRegister.service";
import { CliAuthorizationTokenRedeemService } from "@modules/cliAuthorization/services/cliAuthorizationTokenRedeem.service";

class CliAuthorizationController {
  public async register(req: Request, res: Response) {
    const cliAuthorizationRegisterService = container.resolve(
      CliAuthorizationRegisterService,
    );

    await cliAuthorizationRegisterService.execute({
      code_challenge: req.body.code_challenge,
      user_code: req.body.user_code,
    });

    return res.json({ success: true });
  }

  public async authorize(req: Request, res: Response) {
    const cliAuthorizationAuthorizeService = container.resolve(
      CliAuthorizationAuthorizeService,
    );

    await cliAuthorizationAuthorizeService.execute({
      user_code: req.body.user_code,
      user_auth_provider_conn: req.user_session.user_auth_provider_conn,
      language: req.language,
    });

    return res.json({ success: true });
  }

  public async token(req: Request, res: Response) {
    const cliAuthorizationTokenRedeemService = container.resolve(
      CliAuthorizationTokenRedeemService,
    );

    const token = await cliAuthorizationTokenRedeemService.execute({
      code_verifier: req.body.code_verifier,
    });

    return res.json({ token });
  }
}

export { CliAuthorizationController };
