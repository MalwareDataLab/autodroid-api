import { Router } from "express";

// Controller import
import { HealthCheckReadinessCheckController } from "../controllers/healthCheckReadinessCheck.controller";

const healthCheckRouter = Router();

const healthCheckReadinessCheckController =
  new HealthCheckReadinessCheckController();

healthCheckRouter.get("/", (req, res) => res.status(200).send());
healthCheckRouter.get("/readiness", healthCheckReadinessCheckController.show);
healthCheckRouter.get("/liveness", (req, res) => res.status(200).send());

export { healthCheckRouter };
