import { Request, Response } from "express";
import { loginUser } from "./service";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await loginUser({ email, password });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (e) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }
};

const getProfile = (req: AuthenticatedRequest, res: Response) =>
  res.status(200).json({
    success: true,
    message: "Protected route accessed successfully",
    data: req.user,
  });

export { login, getProfile };
