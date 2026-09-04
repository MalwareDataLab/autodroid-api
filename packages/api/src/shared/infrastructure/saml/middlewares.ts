import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./types";

export function ensureSamlAuthenticated(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  res.redirect("/rnp-cafe-saml/discovery");
}
