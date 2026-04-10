import { Router } from "express";
import authRoutes from "../modules/auth/routes";
import workersRoutes from "../modules/workers/routes";
import clientsRoutes from "../modules/clients/routes";
import vehiclesRoutes from "../modules/vehicles/routes";
import { HTTP_STATUS } from "../constants";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "DocuFast API is running",
  });
});

router.use("/auth", authRoutes);
router.use("/workers", workersRoutes);
router.use("/clients", clientsRoutes);
router.use("/vehicles", vehiclesRoutes);

export default router;
