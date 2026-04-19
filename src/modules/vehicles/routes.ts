import { Router } from "express";
import {
  authenticate,
  ensurePasswordChanged,
  authorize,
} from "../../middlewares";
import { ROLES } from "../../constants";
import {
  createVehicleHandler,
  deleteVehicleHandler,
  getVehicle,
  getVehicles,
  removeVehicleDocumentHandler,
  restoreVehicleHandler,
  updateVehicleHandler,
  uploadVehicleDocumentHandler,
  vehicleDocumentUploadMiddleware,
} from "./controller";

const router = Router();
router.use(authenticate, ensurePasswordChanged);

router.get("/", authorize([ROLES.ADMIN, ROLES.EXTERNAL]), getVehicles);
router.get("/:vehicleId", authorize([ROLES.ADMIN, ROLES.EXTERNAL]), getVehicle);

router.put("/:vehicleId", authorize([ROLES.ADMIN]), updateVehicleHandler);

router.post("/", authorize([ROLES.ADMIN]), createVehicleHandler);
router.post(
  "/:vehicleId/restore",
  authorize([ROLES.ADMIN]),
  restoreVehicleHandler,
);
router.post(
  "/:vehicleId/documents/upload",
  authorize([ROLES.ADMIN]),
  vehicleDocumentUploadMiddleware,
  uploadVehicleDocumentHandler,
);

router.delete("/:vehicleId", authorize([ROLES.ADMIN]), deleteVehicleHandler);
router.delete(
  "/:vehicleId/documents/:vehicleDocumentId",
  authorize([ROLES.ADMIN]),
  removeVehicleDocumentHandler,
);

export default router;
