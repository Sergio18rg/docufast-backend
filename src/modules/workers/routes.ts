import { Router } from "express";
import {
  createWorkerHandler,
  deleteWorkerHandler,
  getWorker,
  getWorkers,
  removeWorkerDocumentHandler,
  updateWorkerHandler,
  uploadWorkerDocumentHandler,
  workerDocumentUploadMiddleware,
} from "./controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { ROLES } from "../../constants";

const router = Router();

router.use(authenticate);

router.get("/", authorize([ROLES.ADMIN, ROLES.EXTERNAL]), getWorkers);
router.get("/:workerId", authorize([ROLES.ADMIN, ROLES.EXTERNAL]), getWorker);

router.post("/", authorize([ROLES.ADMIN]), createWorkerHandler);

router.put("/:workerId", authorize([ROLES.ADMIN]), updateWorkerHandler);

router.delete("/:workerId", authorize([ROLES.ADMIN]), deleteWorkerHandler);

// Documents

router.post(
  "/:workerId/documents/upload",
  authorize([ROLES.ADMIN]),
  workerDocumentUploadMiddleware,
  uploadWorkerDocumentHandler,
);

router.delete(
  "/:workerId/documents/:workerDocumentId",
  authorize([ROLES.ADMIN]),
  removeWorkerDocumentHandler,
);

export default router;
