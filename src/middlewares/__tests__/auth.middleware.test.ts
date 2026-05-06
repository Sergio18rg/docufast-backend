jest.mock("../../lib/jwt");

import { Response } from "express";
import {
  authenticate,
  ensurePasswordChanged,
  AuthenticatedRequest,
} from "../auth.middleware";
import { verifyToken } from "../../lib/jwt";
import { HTTP_STATUS } from "../../constants";

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe("Auth Middleware", () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { headers: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe("authenticate", () => {
    it("should authenticate valid token and attach user to request", () => {
      const payload = {
        user_id: 1,
        email: "test@test.com",
        role: "Administrator",
        must_change_password: false,
      };

      mockReq.headers = { authorization: "Bearer valid.jwt.token" };
      mockVerifyToken.mockReturnValue(payload);

      authenticate(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext,
      );

      expect(mockVerifyToken).toHaveBeenCalledWith("valid.jwt.token");
      expect((mockReq as any).user).toEqual(payload);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 401 for invalid authentication", () => {
      authenticate(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext,
      );
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);

      jest.clearAllMocks();
      mockReq.headers = { authorization: "InvalidFormat" };
      authenticate(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext,
      );
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);

      jest.clearAllMocks();
      mockReq.headers = { authorization: "Bearer invalid.token" };
      mockVerifyToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });
      authenticate(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext,
      );
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe("ensurePasswordChanged", () => {
    it("should call next when password already changed", () => {
      mockReq.user = {
        user_id: 1,
        email: "test@test.com",
        role: "Worker",
        must_change_password: false,
      };

      ensurePasswordChanged(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 403 when password change required", () => {
      mockReq.user = {
        user_id: 1,
        email: "test@test.com",
        role: "Administrator",
        must_change_password: true,
      };

      ensurePasswordChanged(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
    });
  });
});
