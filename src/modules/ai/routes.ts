import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { ROLES } from "../../constants";
import {
  aiDocumentsUploadMiddleware,
  extractDocumentDataHandler,
} from "./controller";

const router = Router();

router.post(
  "/extract-data",
  authenticate,
  authorize([ROLES.ADMIN]),
  aiDocumentsUploadMiddleware,
  extractDocumentDataHandler,
);

export default router;
