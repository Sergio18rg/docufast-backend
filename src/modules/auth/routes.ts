import { Router } from "express";
import { changePasswordHandler, getProfile, login } from "./controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";

const router = Router();

router.post("/login", login);
router.post("/change-password", authenticate, changePasswordHandler);
router.get("/profile", authenticate, getProfile);

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

router.get(
  "/internal",
  authenticate,
  authorize(["Administrator", "Worker"]),
  (_req, res) => {
    res.json({ success: true, message: "Administrator or Worker access" });
  },
);

export default router;
