import { Router } from "express";
import {
  authenticate,
  ensurePasswordChanged,
  authorize,
} from "../../middlewares";
import { ROLES } from "../../constants";
import { getClients } from "./controller";

const router = Router();

router.get(
  "/",
  authenticate,
  ensurePasswordChanged,
  authorize([ROLES.ADMIN]),
  getClients,
);

export default router;
