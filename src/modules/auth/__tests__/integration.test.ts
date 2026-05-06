jest.mock("../../../lib/prisma");
jest.mock("bcrypt");

import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../../app";
import { prisma } from "../../../lib/prisma";
import { adminToken, mustChangeToken, mockUser, api } from "../../../helpers";
import { HTTP_STATUS } from "../../../constants/httpStatus";

const mockPrismaUser = prisma.user as jest.Mocked<typeof prisma.user>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

beforeEach(() => jest.resetAllMocks());

describe("Integration: Auth Flow", () => {
  describe("Login", () => {
    it("should complete successful login flow with valid credentials", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(mockUser as any);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: mockUser.email, password: "correct" });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data).toHaveProperty("token");
      expect(res.body.data.user.email).toBe(mockUser.email);
    });

    it("should flag must_change_password when applicable", async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        ...mockUser,
        must_change_password: true,
      } as any);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: mockUser.email, password: "correct" });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.user.must_change_password).toBe(true);
    });
  });

  describe("Change Password", () => {
    it("should complete password change flow successfully", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(mockUser as any);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue("$2b$hashed");
      mockPrismaUser.update.mockResolvedValue({
        ...mockUser,
        must_change_password: false,
      } as any);

      const res = await api
        .post("/api/auth/change-password", adminToken())
        .send({ newPassword: "NewPass123!", confirmPassword: "NewPass123!" });

      expect(res.status).toBe(HTTP_STATUS.OK);
    });
  });

  describe("Profile", () => {
    it("should retrieve user profile successfully", async () => {
      prisma.worker.findFirst = jest.fn().mockResolvedValue(null);
      (prisma.entityDocument.findMany as jest.Mock).mockResolvedValue([]);

      const res = await api.get("/api/auth/profile", adminToken());

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data).toHaveProperty("email");
    });
  });

  describe("Password Change Enforcement", () => {
    it("should block access when must_change_password is true", async () => {
      const res = await api.get("/api/workers", mustChangeToken());
      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
    });
  });
});
