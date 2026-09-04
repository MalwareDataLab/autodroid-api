import { Router } from "express";

// Controller import
import { AdminRemoveAllDanglingFilesController } from "../controllers/adminRemoveAllDanglingFiles.controller";

const adminFileRouter = Router();

const adminRemoveAllDanglingFilesController =
  new AdminRemoveAllDanglingFilesController();

adminFileRouter.delete(
  "/remove-dangling-files",
  adminRemoveAllDanglingFilesController.delete,
);

export { adminFileRouter };
