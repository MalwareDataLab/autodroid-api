import { Request, Response, NextFunction, Router } from "express";
import { AuthenticatedRequest } from "./types";
import { federationManager } from "./strategy";

const samlRouter = Router();

samlRouter.get(
  `${federationManager.BASE_SAML_PATH}/discovery`,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.query.idp) {
      if (req.session) {
        req.session.idpEntityID = req.query.idp as string;
      }
      federationManager.getPassport().authenticate("saml")(req, res, next);
      return;
    }

    const returnURL = encodeURIComponent(
      `${federationManager.BASE_URL}/rnp-cafe-saml/discovery`,
    );
    const spEntityID = encodeURIComponent(federationManager.SAML_ISSUER);

    res.redirect(
      `${federationManager.DISCOVERY_SERVICE_URL}?entityID=${spEntityID}` +
        `&return=${returnURL}&returnIDParam=idp`,
    );
  },
);

samlRouter.post(
  `${federationManager.BASE_SAML_PATH}/callback`,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    federationManager
      .getPassport()
      .authenticate("saml", { failureRedirect: "/" })(req, res, next);
  },
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user as any;

      const redirectUrl = await federationManager.getFrontendRedirectUrl(user);

      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Error in SAML callback:", error);
      res.status(500).json({
        success: false,
        error: "Authentication failed",
        message: "Failed to create authentication token",
      });
    }
  },
);

samlRouter.get(
  `${federationManager.BASE_SAML_PATH}/logout`,
  (req: AuthenticatedRequest, res: Response) => {
    res.redirect(`${process.env.FRONTEND_URL}/logout`);
  },
);

samlRouter.get(
  `${federationManager.BASE_SAML_PATH}/idps`,
  (req: Request, res: Response) => {
    res.json({
      availableIdPs: federationManager.listIdps(),
      count: federationManager.listIdps().length,
    });
  },
);

samlRouter.get(
  `${federationManager.BASE_SAML_PATH}/metadata`,
  (req: Request, res: Response) => {
    const metadata = federationManager.generateMetadata();

    res.set("Content-Type", "application/xml");
    res.send(metadata);
  },
);

export { samlRouter };
