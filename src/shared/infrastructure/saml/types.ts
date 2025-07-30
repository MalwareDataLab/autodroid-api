import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: any;
  session?: any;
}

export interface SamlUserProfile {
  uid?: string;
  email?: string;
  givenName?: string;
  sn?: string;
  eduPersonPrincipalName?: string;
  nameID?: string;
  [key: string]: any;
}

export interface ParsedSamlUser {
  uid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  nameID?: string;
  rawClaims: Record<string, any>;
}
