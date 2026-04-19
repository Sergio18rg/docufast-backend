import { Request, Response } from "express";
import { changePassword, loginUser } from "./service";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { MESSAGES } from "./constants";
import { HTTP_STATUS } from "../../constants";

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR.REQUIRED_EMAIL_PASSWORD,
      });
    }

    const result = await loginUser({ email, password });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.user.must_change_password
        ? "Password change required"
        : "Login successful",
      data: result,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : MESSAGES.ERROR.INVALID_CREDENTIALS;
    const status =
      message === MESSAGES.ERROR.INACTIVE_USER
        ? HTTP_STATUS.FORBIDDEN
        : HTTP_STATUS.UNAUTHORIZED;
    return res.status(status).json({ success: false, message });
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
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ success: false, message: MESSAGES.ERROR.UNAUTHORIZED });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR.NEW_PASSWORD_REQUIRED,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR.PASSWORDS_DO_NOT_MATCH,
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR.PASSWORD_TOO_SHORT,
      });
    }

    const result = await changePassword({ userId, newPassword });
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.PASSWORD_CHANGED,
      data: result,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : MESSAGES.ERROR.UNABLE_TO_CHANGE_PASSWORD;
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ success: false, message });
  }
};

const getProfile = (req: AuthenticatedRequest, res: Response) =>
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: MESSAGES.SUCCESS.PROTECTED_ROUTE,
    data: req.user,
  });

export { login, getProfile, changePasswordHandler };
