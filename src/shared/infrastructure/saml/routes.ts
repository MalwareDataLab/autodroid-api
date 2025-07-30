import { Request, Response, NextFunction, Router } from "express";

// Util import
import { logger } from "@shared/utils/logger";

// Type import
import { AppError } from "@shared/errors/AppError";
import { AuthenticatedRequest } from "./types";

// Strategy import
import { federationManager } from "./strategy";

const samlRouter = Router();

samlRouter.get(
  "/discovery",
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.query.idp) {
      (req.session as any).idpEntityID = req.query.idp;
      federationManager.getPassport().authenticate("saml")(req, res, next);
      return;
    }

    const returnURL = encodeURIComponent(
      federationManager.LOCAL_DISCOVERY_RESPONSE_URL,
    );
    const spEntityID = encodeURIComponent(federationManager.SAML_ISSUER);

    res.redirect(
      `${federationManager.DISCOVERY_SERVICE_URL}?entityID=${spEntityID}` +
        `&return=${returnURL}&returnIDParam=idp`,
    );
  },
);

samlRouter.post(
  "/callback",
  federationManager
    .getPassport()
    .authenticate("saml", { failureRedirect: "/" }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user as any;

      await federationManager.storeCustomTokenInSession(req, user);
      const redirectUrl = await federationManager.getFrontendRedirectUrl();

      res.redirect(redirectUrl);
    } catch (error) {
      logger.error(`Error in SAML callback: ${error}`);
      throw new AppError({
        key: "@saml/callback_failed",
        message: "Erro ao criar token de autenticação",
        statusCode: 500,
      });
    }
  },
);

samlRouter.get("/token", (req: AuthenticatedRequest, res: Response) => {
  try {
    const customToken = federationManager.getCustomTokenFromSession(req);

    if (!customToken) {
      throw new AppError({
        key: "@saml/token_not_found",
        message: "Nenhum token disponível.",
        statusCode: 400,
      });
    }

    return res.json({
      customToken,
      provider: "saml",
    });
  } catch (error) {
    if (AppError.isInstance(error)) {
      throw error;
    }

    logger.error(`Error retrieving custom token: ${error}`);
    throw new AppError({
      key: "@saml/token_retrieval_failed",
      message: "Erro ao recuperar token de autenticação",
      statusCode: 500,
    });
  }
});

samlRouter.get("/logout", (req: AuthenticatedRequest, res: Response) => {
  res.redirect(`${process.env.FRONTEND_URL}/logout`);
});

samlRouter.get("/idps", (req: Request, res: Response) => {
  res.json({
    availableIdPs: federationManager.listIdps(),
    count: federationManager.listIdps().length,
  });
});

samlRouter.get("/metadata", (req: Request, res: Response) => {
  const metadata = federationManager.generateMetadata();

  res.set("Content-Type", "application/xml");
  res.send(metadata);
});

export { samlRouter };
