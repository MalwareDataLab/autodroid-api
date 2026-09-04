import { NextFunction, Request, Response } from "express";
import { container } from "tsyringe";

// Service import
import { HandleWorkerAuthenticationService } from "@modules/worker/services/handleWorkerAuthentication.service";

const workerAuthenticationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { language, headers } = req;
  const { authorization } = headers;

  if (authorization) {
    const [, access_token] = authorization.split(" ");

    try {
      const handleWorkerAuthenticationService = container.resolve(
        HandleWorkerAuthenticationService,
      );

      const session = await handleWorkerAuthenticationService.execute({
        access_token,
        language,
        agent_info: req.agent_info,
      });

      req.worker_session = session;

      return next();
    } catch {
      req.worker_session = undefined as any;
    }
  }

  req.worker_session = null as any;
  return next();
};

export { workerAuthenticationMiddleware };
