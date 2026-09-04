import { NextFunction, Request, Response } from "express";

// Error import
import { AppError } from "@shared/errors/AppError";

const userAuthenticationMiddleware = async (
  req: Request,
  _: Response,
  next: NextFunction,
): Promise<void> => {
  const { t, user_session } = req;

  if (!user_session?.user)
    throw new AppError({
      key: "@user_auth_middleware/NOT_AUTHENTICATED",
      message: t(
        "@user_auth_middleware/NOT_AUTHENTICATED",
        "Not authenticated",
      ),
      statusCode: 401,
    });

  return next();
};

export { userAuthenticationMiddleware };
