import { NextFunction, Request, Response } from "express";

// Error import
import { AppError } from "@shared/errors/AppError";

const adminAuthenticationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { t, session } = req;

  if (!session?.user)
    throw new AppError({
      key: "@admin_auth_middleware/NOT_AUTHENTICATED",
      message: t(
        "@admin_auth_middleware/NOT_AUTHENTICATED",
        "You're not authenticated",
      ),
      statusCode: 401,
    });

  if (!session.is_admin)
    throw new AppError({
      key: "@admin_auth_middleware/NOT_AN_ADMIN",
      message: t("@admin_auth_middleware/NOT_AN_ADMIN", "You're not an admin."),
      statusCode: 401,
    });

  return next();
};

export { adminAuthenticationMiddleware };
