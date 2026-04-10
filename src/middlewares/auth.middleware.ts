import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";
import { HTTP_STATUS } from "../constants";

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    email: string;
    role: string;
  };
}

const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Authorization token required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyToken(token) as {
      user_id: number;
      email: string;
      role: string;
    };

    req.user = decoded;

    next();
  } catch (e) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: "No valid or expired token",
    });
  }
};

export { authenticate };
export type { AuthenticatedRequest };
