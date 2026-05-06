jest.mock("../service");

import { Request, Response } from "express";
import { login, changePasswordHandler, getProfile } from "../controller";
import { loginUser, changePassword, getProfileByUserId } from "../service";
import { HTTP_STATUS } from "../../../constants";
import { AuthenticatedRequest } from "../../../middlewares/auth.middleware";
import {
  setupControllerTest,
  getMockedServiceFunction,
} from "../../../helpers";

const mockLoginUser = getMockedServiceFunction(loginUser);
const mockChangePassword = getMockedServiceFunction(changePassword);
const mockGetProfileByUserId = getMockedServiceFunction(getProfileByUserId);

describe("Auth Controller", () => {
  const { mockReq, mockRes } = setupControllerTest();

  describe("login", () => {
    it("should login successfully", async () => {
      mockReq.body = { email: "admin@test.com", password: "password123" };
      mockLoginUser.mockResolvedValue({
        user: {
          user_id: 1,
          email: "admin@test.com",
          role: "Administrator",
          must_change_password: false,
        },
        token: "jwt.token.here",
      } as any);

      await login(mockReq as Request, mockRes as Response);

      expect(mockLoginUser).toHaveBeenCalledWith({
        email: "admin@test.com",
        password: "password123",
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should return 400 for missing credentials or 401/403 for errors", async () => {
      mockReq.body = { email: "test@test.com" };
      await login(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);

      jest.clearAllMocks();
      mockReq.body = { email: "test@test.com", password: "wrong" };
      mockLoginUser.mockRejectedValue(new Error("Invalid credentials"));
      await login(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);

      jest.clearAllMocks();
      mockLoginUser.mockRejectedValue(new Error("User is inactive"));
      await login(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
    });
  });

  describe("changePasswordHandler", () => {
    it("should change password successfully", async () => {
      (mockReq as AuthenticatedRequest).user = {
        user_id: 1,
        email: "test@test.com",
        role: "Worker",
        must_change_password: true,
      };
      mockReq.body = {
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      };
      mockChangePassword.mockResolvedValue({} as any);

      await changePasswordHandler(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
      );

      expect(mockChangePassword).toHaveBeenCalledWith({
        userId: 1,
        newPassword: "newpassword123",
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should return 400 for validation errors or 401 without auth", async () => {
      (mockReq as AuthenticatedRequest).user = {
        user_id: 1,
        email: "test@test.com",
        role: "Worker",
        must_change_password: true,
      };

      mockReq.body = { newPassword: "pass1", confirmPassword: "pass2" };
      await changePasswordHandler(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
      );
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);

      jest.clearAllMocks();
      (mockReq as AuthenticatedRequest).user = undefined;
      mockReq.body = {
        newPassword: "newpass123",
        confirmPassword: "newpass123",
      };
      await changePasswordHandler(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
      );
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe("getProfile", () => {
    it("should return user profile or 401 without auth", async () => {
      (mockReq as AuthenticatedRequest).user = {
        user_id: 1,
        email: "worker@test.com",
        role: "Worker",
        must_change_password: false,
      };
      const profile = { worker_id: 10, first_name: "John", last_name_1: "Doe" };
      mockGetProfileByUserId.mockResolvedValue(profile as any);

      await getProfile(mockReq as AuthenticatedRequest, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      jest.clearAllMocks();
      (mockReq as AuthenticatedRequest).user = undefined;
      await getProfile(mockReq as AuthenticatedRequest, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });
  });
});
