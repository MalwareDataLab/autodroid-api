/* eslint-disable func-names */
/* eslint-disable no-param-reassign */

// Error import
import { AppError } from "@shared/errors/AppError";

function RequireAdminPermission() {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const req = args[0];
      if (!req || !req.user || !req.user.is_admin) {
        throw new AppError({
          key: "@require_admin_permission/FORBIDDEN",
          message: "You don't have permission to access this resource.",
        });
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

export { RequireAdminPermission };
