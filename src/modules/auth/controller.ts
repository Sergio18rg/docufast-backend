import { Request, Response } from "express";
import { changePassword, getProfileByUserId, loginUser } from "./service";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { MESSAGES } from "./constants";
import { HTTP_STATUS } from "../../constants";
import { sendSuccess, sendError } from "../../utils/http";

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(
        res,
        MESSAGES.ERROR.REQUIRED_EMAIL_PASSWORD,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const result = await loginUser({ email, password });

    return sendSuccess(
      res,
      result,
      result.user.must_change_password
        ? "Password change required"
        : "Login successful",
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : MESSAGES.ERROR.INVALID_CREDENTIALS;
    const status =
      message === MESSAGES.ERROR.INACTIVE_USER
        ? HTTP_STATUS.FORBIDDEN
        : HTTP_STATUS.UNAUTHORIZED;
    return sendError(res, message, status);
  }
};

const changePasswordHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.user_id;
    const { newPassword, confirmPassword } = req.body;

    if (!userId) {
      return sendError(
        res,
        MESSAGES.ERROR.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    if (!newPassword || !confirmPassword) {
      return sendError(
        res,
        MESSAGES.ERROR.NEW_PASSWORD_REQUIRED,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (newPassword !== confirmPassword) {
      return sendError(
        res,
        MESSAGES.ERROR.PASSWORDS_DO_NOT_MATCH,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (String(newPassword).length < 8) {
      return sendError(
        res,
        MESSAGES.ERROR.PASSWORD_TOO_SHORT,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const result = await changePassword({ userId, newPassword });
    return sendSuccess(res, result, MESSAGES.SUCCESS.PASSWORD_CHANGED);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : MESSAGES.ERROR.UNABLE_TO_CHANGE_PASSWORD;
    return sendError(res, message, HTTP_STATUS.BAD_REQUEST);
  }
};

const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const role = req.user?.role;

    if (!userId || !role) {
      return sendError(
        res,
        MESSAGES.ERROR.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const profile = await getProfileByUserId(userId, role);

    return sendSuccess(
      res,
      profile ?? req.user,
      MESSAGES.SUCCESS.PROTECTED_ROUTE,
    );
  } catch {
    return sendSuccess(res, req.user, MESSAGES.SUCCESS.PROTECTED_ROUTE);
  }
};

export { login, getProfile, changePasswordHandler };
