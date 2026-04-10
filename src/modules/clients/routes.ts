import { Router } from "express";
import { authenticate, authorize } from "../../middlewares";
import { ROLES } from "../../constants";
import { getClients } from "./controller";

const router = Router();

router.get("/", authenticate, authorize([ROLES.ADMIN]), getClients);

export default router;
