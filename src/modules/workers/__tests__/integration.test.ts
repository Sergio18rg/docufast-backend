jest.mock("../../../lib/prisma");

import { prisma } from "../../../lib/prisma";
import {
  adminToken,
  externalToken,
  mockWorker,
  validWorkerPayload,
  api,
} from "../../../helpers";
import { HTTP_STATUS } from "../../../constants/httpStatus";

const mockWorkerModel = prisma.worker as jest.Mocked<typeof prisma.worker>;
const mockClientModel = prisma.client as jest.Mocked<typeof prisma.client>;
const mockEntityDocument = prisma.entityDocument as jest.Mocked<
  typeof prisma.entityDocument
>;
const mockTransaction = prisma.$transaction as jest.MockedFunction<
  typeof prisma.$transaction
>;

beforeEach(() => jest.resetAllMocks());

describe("Integration: Workers CRUD", () => {
  describe("List workers with client filtering", () => {
    it("should return workers for Admin without filtering", async () => {
      mockWorkerModel.findMany.mockResolvedValue([mockWorker]);
      mockEntityDocument.findMany.mockResolvedValue([]);

      const res = await api.get("/api/workers", adminToken());

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should filter workers by client for External role", async () => {
      mockClientModel.findFirst.mockResolvedValue({
        client_id: 1,
        status: "Active",
      } as any);
      mockWorkerModel.findMany.mockResolvedValue([]);

      const res = await api.get("/api/workers", externalToken());

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data).toEqual([]);
    });
  });

  describe("Worker CRUD operations", () => {
    it("should complete create flow successfully", async () => {
      mockWorkerModel.create.mockResolvedValue(mockWorker);
      mockWorkerModel.findFirst.mockResolvedValue(mockWorker);
      mockEntityDocument.findMany.mockResolvedValue([]);

      const res = await api
        .post("/api/workers", adminToken())
        .send(validWorkerPayload);

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.data).toHaveProperty("worker_id");
    });

    it("should complete update flow successfully", async () => {
      mockWorkerModel.findFirst.mockResolvedValue(mockWorker);
      mockWorkerModel.findUnique.mockResolvedValue({
        worker_id: 1,
        user_id: null,
      } as any);
      mockEntityDocument.findMany.mockResolvedValue([]);

      const res = await api
        .put("/api/workers/1", adminToken())
        .send({ ...validWorkerPayload, first_name: "Updated" });

      expect(res.status).toBe(HTTP_STATUS.OK);
    });

    it("should complete soft delete flow successfully", async () => {
      mockWorkerModel.findFirst.mockResolvedValue({
        ...mockWorker,
        user_id: null,
      } as any);
      mockEntityDocument.findMany.mockResolvedValue([]);
      mockTransaction.mockImplementation((callback: any) => callback(prisma));
      mockWorkerModel.findUnique.mockResolvedValue({
        ...mockWorker,
        user_id: null,
      } as any);
      mockWorkerModel.update.mockResolvedValue({
        ...mockWorker,
        status: "Inactive",
      } as any);

      const res = await api.delete("/api/workers/1", adminToken());

      expect(res.status).toBe(HTTP_STATUS.OK);
    });

    it("should complete restore flow successfully", async () => {
      mockWorkerModel.findFirst.mockResolvedValue({
        ...mockWorker,
        status: "Inactive",
        user_id: null,
      } as any);
      mockEntityDocument.findMany.mockResolvedValue([]);
      mockTransaction.mockImplementation((callback: any) => callback(prisma));
      mockWorkerModel.findUnique.mockResolvedValue({
        ...mockWorker,
        status: "Inactive",
        user_id: null,
      } as any);
      mockWorkerModel.update.mockResolvedValue({
        ...mockWorker,
        status: "Active",
      } as any);

      const res = await api.post("/api/workers/1/restore", adminToken());

      expect(res.status).toBe(HTTP_STATUS.OK);
    });
  });
});
