import { Router } from "express";
import {
  authenticate,
  ensurePasswordChanged,
  authorize,
} from "../../middlewares";
import { ROLES } from "../../constants";
import {
  clientDocumentUploadMiddleware,
  createClientHandler,
  deleteClientHandler,
  getClient,
  getClients,
  removeClientDocumentHandler,
  restoreClientHandler,
  updateClientHandler,
  uploadClientDocumentHandler,
} from "./controller";

const router = Router();

router.use(authenticate, ensurePasswordChanged, authorize([ROLES.ADMIN]));
router.get("/", getClients);
router.get("/:clientId", getClient);

router.put("/:clientId", updateClientHandler);

router.post("/", createClientHandler);
router.post("/:clientId/restore", restoreClientHandler);
router.post(
  "/:clientId/documents/upload",
  clientDocumentUploadMiddleware,
  uploadClientDocumentHandler,
);

router.delete("/:clientId", deleteClientHandler);
router.delete(
  "/:clientId/documents/:clientDocumentId",
  removeClientDocumentHandler,
);

export default router;
