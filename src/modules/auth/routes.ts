import { Router } from "express";
import { getProfile, login } from "./controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";

const router = Router();

router.post("/login", login);

// Cualquier usuario autenticado
router.get("/profile", authenticate, getProfile);

// Solo administrador
router.get(
  "/admin-only",
  authenticate,
  authorize(["Administrator"]),
  (_req, res) => {
    res.json({
      success: true,
      message: "Only administrators can access this route",
    });
  },
);

// Administrador o Worker
router.get(
  "/internal",
  authenticate,
  authorize(["Administrator", "Worker"]),
  (_req, res) => {
    res.json({
      success: true,
      message: "Administrator or Worker access",
    });
  },
);

export default router;
