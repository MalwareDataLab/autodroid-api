import { Request, Response, NextFunction } from "express";

const sessionFixMiddleware = (
  request: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (request.session && !request.session.regenerate) {
    request.session.regenerate = (cb: () => void) => {
      cb();
    };
  }
  if (request.session && !request.session.save) {
    request.session.save = (cb: () => void) => {
      cb();
    };
  }
  next();
};

export { sessionFixMiddleware };
