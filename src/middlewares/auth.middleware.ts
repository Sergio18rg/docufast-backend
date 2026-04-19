import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";
import { HTTP_STATUS } from "../constants";
import { MESSAGES } from "../modules/auth/constants";

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    email: string;
    role: string;
    must_change_password: boolean;
  };
}

const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    const invalidAuthHeader = !authHeader || !authHeader.startsWith("Bearer ");
    if (invalidAuthHeader) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.ERROR.NO_VALID_TOKEN,
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyToken(token) as {
      user_id: number;
      email: string;
      role: string;
      must_change_password?: boolean;
    };

    req.user = {
      ...decoded,
      must_change_password: !!decoded.must_change_password,
    };

    next();
  } catch {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: MESSAGES.ERROR.NO_VALID_TOKEN,
    });
  }
};

const ensurePasswordChanged = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const userMustChangePassword = req.user?.must_change_password;
  if (userMustChangePassword)
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: MESSAGES.ERROR.CHANGE_PASSWORD_REQUIRED,
    });

  next();
};

export { authenticate, ensurePasswordChanged };
export type { AuthenticatedRequest };
