import { Response } from "express";
import { authorize } from "../role.middleware";
import { AuthenticatedRequest } from "../auth.middleware";
import { HTTP_STATUS } from "../../constants";

describe("Role Middleware", () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe("authorize", () => {
    it("should allow access for authorized roles", () => {
      mockReq.user = {
        user_id: 1,
        email: "admin@test.com",
        role: "Administrator",
        must_change_password: false,
      };

      const middleware = authorize(["Administrator", "External"]);
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should deny access for unauthorized scenarios", () => {
      const middleware = authorize(["Administrator"]);
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext,
      );
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);

      jest.clearAllMocks();
      mockReq.user = {
        user_id: 3,
        email: "worker@test.com",
        role: "Worker",
        must_change_password: false,
      };
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext,
      );
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.FORBIDDEN);
    });
  });
});
