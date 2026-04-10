import { Router } from "express";
import { getVehicles } from "./controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { ROLES } from "../../constants";

const router = Router();

router.use(authenticate);

router.get("/", authorize([ROLES.ADMIN, ROLES.EXTERNAL]), getVehicles);

export default router;
