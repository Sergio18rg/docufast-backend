jest.mock("../../../lib/prisma");
jest.mock("bcrypt");
jest.mock("../../../lib/jwt");

import bcrypt from "bcrypt";
import { prisma } from "../../../lib/prisma";
import { generateToken } from "../../../lib/jwt";
import { loginUser, changePassword, getProfileByUserId } from "../service";
import { MESSAGES } from "../constants";
import { STATUS, ROLES } from "../../../constants";
import {
  getMockedPrismaModel,
  setupTestEnvironment,
  mockEmptyDocuments,
} from "../../../helpers";

const mockPrismaUser = getMockedPrismaModel("user");
const mockPrismaWorker = getMockedPrismaModel("worker");
const mockPrismaClient = getMockedPrismaModel("client");
const mockPrismaEntityDocument = getMockedPrismaModel("entityDocument");
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockGenerateToken = generateToken as jest.MockedFunction<
  typeof generateToken
>;

describe("Auth Service", () => {
  setupTestEnvironment();

  describe("loginUser", () => {
    it("should login successfully with valid credentials", async () => {
      const mockUser = {
        user_id: 1,
        email: "admin@test.com",
        password_hash: "hashed_password",
        status: STATUS.ACTIVE,
        must_change_password: false,
        full_name: "Admin User",
        role: { role_id: 1, name: ROLES.ADMIN },
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockGenerateToken.mockReturnValue("jwt_token_123");

      const result = await loginUser({
        email: "admin@test.com",
        password: "password123",
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashed_password",
      );
      expect(mockGenerateToken).toHaveBeenCalledWith({
        user_id: 1,
        email: "admin@test.com",
        role: ROLES.ADMIN,
        must_change_password: false,
      });
      expect(result.token).toBe("jwt_token_123");
    });

    it("should throw error for invalid credentials or inactive user", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      await expect(
        loginUser({ email: "wrong@test.com", password: "password" }),
      ).rejects.toThrow(MESSAGES.ERROR.INVALID_CREDENTIALS);

      const inactiveUser = {
        user_id: 1,
        status: STATUS.INACTIVE,
        role: { role_id: 1, name: ROLES.ADMIN },
      };
      mockPrismaUser.findUnique.mockResolvedValue(inactiveUser as any);
      await expect(
        loginUser({ email: "inactive@test.com", password: "password" }),
      ).rejects.toThrow(MESSAGES.ERROR.INACTIVE_USER);
    });
  });

  describe("changePassword", () => {
    it("should change password and set must_change_password to false", async () => {
      const mockUser = {
        user_id: 1,
        email: "user@test.com",
        password_hash: "old_hash",
        status: STATUS.ACTIVE,
        must_change_password: true,
        role: { role_id: 2, name: ROLES.WORKER },
      };

      const updatedUser = {
        ...mockUser,
        password_hash: "new_hash",
        must_change_password: false,
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser as any);
      mockBcrypt.hash.mockResolvedValue("new_hash" as never);
      mockPrismaUser.update.mockResolvedValue(updatedUser as any);
      mockGenerateToken.mockReturnValue("new_jwt_token");

      const result = await changePassword({
        userId: 1,
        newPassword: "NewPassword123!",
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith("NewPassword123!", 10);
      expect(mockPrismaUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { password_hash: "new_hash", must_change_password: false },
        }),
      );
      expect(result.token).toBe("new_jwt_token");
    });
  });

  describe("getProfileByUserId", () => {
    it("should return worker profile with client data", async () => {
      const mockWorker = {
        worker_id: 10,
        user_id: 1,
        first_name: "John",
        last_name_1: "Doe",
        user: {
          user_id: 1,
          email: "john@test.com",
          full_name: "John Doe",
          status: STATUS.ACTIVE,
          must_change_password: false,
          role: { role_id: 2, name: ROLES.WORKER },
        },
        client: {
          client_id: 5,
          business_name: "Test Client",
          badge_color: "#FF0000",
          status: STATUS.ACTIVE,
        },
        current_vehicle: null,
      };

      mockPrismaWorker.findFirst.mockResolvedValue(mockWorker as any);
      mockEmptyDocuments();

      const result = await getProfileByUserId(1, ROLES.WORKER);

      expect(result).toEqual(
        expect.objectContaining({
          user_id: 1,
          email: "john@test.com",
          first_name: "John",
          documents: expect.any(Array),
        }),
      );
    });

    it("should return external client profile", async () => {
      const mockClient = {
        client_id: 5,
        user_id: 2,
        badge_color: "#00FF00",
        user: {
          user_id: 2,
          email: "external@test.com",
          status: STATUS.ACTIVE,
          role: { role_id: 3, name: ROLES.EXTERNAL },
        },
      };

      mockPrismaClient.findFirst.mockResolvedValue(mockClient as any);

      const result = await getProfileByUserId(2, ROLES.EXTERNAL);

      expect(result).toEqual(
        expect.objectContaining({
          user_id: 2,
          badge_color: "#00FF00",
        }),
      );
    });
  });
});
