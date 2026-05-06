jest.mock("../../../lib/prisma");

import { prisma } from "../../../lib/prisma";
import {
  adminToken,
  mockClient,
  validClientPayload,
  api,
} from "../../../helpers";
import { HTTP_STATUS } from "../../../constants/httpStatus";

const mockPrismaClient = prisma.client as jest.Mocked<typeof prisma.client>;
const mockEntityDocument = prisma.entityDocument as jest.Mocked<
  typeof prisma.entityDocument
>;
const mockWorkerModel = prisma.worker as jest.Mocked<typeof prisma.worker>;
const mockTransaction = prisma.$transaction as jest.MockedFunction<
  typeof prisma.$transaction
>;

beforeEach(() => jest.resetAllMocks());

describe("Integration: Clients CRUD (Admin-only)", () => {
  describe("List clients", () => {
    it("should return client list for Admin", async () => {
      mockPrismaClient.findMany.mockResolvedValue([mockClient]);
      mockEntityDocument.findMany.mockResolvedValue([]);

      const res = await api.get("/api/clients", adminToken());

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("Client CRUD operations", () => {
    it("should complete create flow successfully", async () => {
      const clientWithWorkers = { ...mockClient, workers: [] };
      mockPrismaClient.create.mockResolvedValue(clientWithWorkers);
      mockPrismaClient.findUnique.mockResolvedValue(clientWithWorkers);
      mockEntityDocument.findMany.mockResolvedValue([]);

      const res = await api
        .post("/api/clients", adminToken())
        .send(validClientPayload);

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.data).toHaveProperty("client_id");
    });

    it("should complete update flow successfully", async () => {
      mockPrismaClient.findUnique.mockResolvedValue({
        ...mockClient,
        workers: [],
      } as any);
      mockEntityDocument.findMany.mockResolvedValue([]);

      const res = await api
        .put("/api/clients/1", adminToken())
        .send({ ...validClientPayload, business_name: "Updated Corp" });

      expect(res.status).toBe(HTTP_STATUS.OK);
    });

    it("should complete soft delete flow successfully", async () => {
      mockPrismaClient.findUnique.mockResolvedValue({
        ...mockClient,
        user_id: null,
        workers: [],
      } as any);
      mockEntityDocument.findMany.mockResolvedValue([]);
      mockTransaction.mockImplementation((callback: any) => callback(prisma));
      mockPrismaClient.update.mockResolvedValue({
        ...mockClient,
        status: "Inactive",
        user_id: null,
      } as any);
      mockWorkerModel.updateMany.mockResolvedValue({ count: 0 } as any);

      const res = await api.delete("/api/clients/1", adminToken());

      expect(res.status).toBe(HTTP_STATUS.OK);
    });

    it("should complete restore flow successfully", async () => {
      mockPrismaClient.findUnique.mockResolvedValue({
        ...mockClient,
        status: "Inactive",
        user_id: null,
        workers: [],
      } as any);
      mockEntityDocument.findMany.mockResolvedValue([]);
      mockTransaction.mockImplementation((callback: any) => callback(prisma));
      mockPrismaClient.update.mockResolvedValue({
        ...mockClient,
        status: "Active",
        user_id: null,
      } as any);

      const res = await api.post("/api/clients/1/restore", adminToken());

      expect(res.status).toBe(HTTP_STATUS.OK);
    });
  });
});
