import { Request, Response, NextFunction, Router } from "express";
import { AuthenticatedRequest } from "./types";
import { federationManager } from "./strategy";

const BASE_SAML_URL = "/rnp-cafe-saml";

const samlRouter = Router();

samlRouter.get(
  `${BASE_SAML_URL}/discovery`,
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
  `${BASE_SAML_URL}/callback`,
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
  `${BASE_SAML_URL}/logout`,
  (req: AuthenticatedRequest, res: Response) => {
    req.logout((err: any) => {
      if (err) {
        res.status(500).json({ error: "Logout failed" });
        return;
      }
      res.json({ message: "Logged out successfully" });
    });
  },
);

samlRouter.get(`${BASE_SAML_URL}/idps`, (req: Request, res: Response) => {
  res.json({
    availableIdPs: federationManager.listIdps(),
    count: federationManager.listIdps().length,
  });
});

samlRouter.get(`${BASE_SAML_URL}/metadata`, (req: Request, res: Response) => {
  const metadata = federationManager.generateMetadata();

  res.set("Content-Type", "application/xml");
  res.send(metadata);
});

export { samlRouter };
