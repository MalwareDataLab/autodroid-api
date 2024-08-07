import { Router } from "express";

// Controller import
import { ProcessorController } from "../controllers/processor.controller";

const processorRouter = Router();

processorRouter.get("/", ProcessorController.index);
processorRouter.get("/:processor_code", ProcessorController.show);

export { processorRouter };
