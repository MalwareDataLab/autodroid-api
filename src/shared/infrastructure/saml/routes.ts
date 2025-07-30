import { Request, Response, NextFunction, Router } from "express";

// Util import
import { logger } from "@shared/utils/logger";

// Type import
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
      res.status(500).json({
        success: false,
        error: "Authentication failed",
        message: "Failed to create authentication token",
      });
    }
  },
);

samlRouter.get("/token", (req: AuthenticatedRequest, res: Response) => {
  try {
    const customToken = federationManager.getCustomTokenFromSession(req);

    if (!customToken) {
      return res.status(400).json({
        success: false,
        error: "Token not found",
        message: "No valid custom token available",
      });
    }

    return res.json({
      success: true,
      customToken,
      provider: "saml",
    });
  } catch (error) {
    logger.error(`Error retrieving custom token: ${error}`);
    return res.status(500).json({
      success: false,
      error: "Token retrieval failed",
      message: "Failed to retrieve authentication token",
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
