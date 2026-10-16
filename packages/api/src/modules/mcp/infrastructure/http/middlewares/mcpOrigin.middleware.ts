import { Request, Response, NextFunction } from "express";

// Configuration import
import { getCorsConfig } from "@config/cors";

const mcpOriginMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { origin } = req.headers;
  const allowedOrigin = getCorsConfig().origin as string | string[];

  if (
    !origin ||
    allowedOrigin === "*" ||
    (allowedOrigin as string[]).includes(origin)
  ) {
    next();
    return;
  }

  res.status(403).json({ error: "forbidden_origin" });
};

export { mcpOriginMiddleware };
