import { NextFunction, Request, Response } from "express";

// Error import
import { AppError } from "@shared/errors/AppError";

const workerAuthenticationGuardMiddleware = async (
  req: Request,
  _: Response,
  next: NextFunction,
): Promise<void> => {
  const { t, worker_session } = req;

  if (!worker_session?.worker)
    throw new AppError({
      key: "@worker_auth_middleware/NOT_AUTHENTICATED",
      message: t(
        "@worker_auth_middleware/NOT_AUTHENTICATED",
        "Not authenticated",
      ),
      statusCode: 401,
    });

  return next();
};

export { workerAuthenticationGuardMiddleware };
