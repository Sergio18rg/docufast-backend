import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
import { HTTP_STATUS } from "../constants";

const authorize =
  (allowedRoles: string[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    next();
  };

export { authorize };
