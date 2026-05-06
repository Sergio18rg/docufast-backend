jest.mock("../service");

import { Request, Response } from "express";
import {
  getWorkers,
  getWorker,
  createWorkerHandler,
  updateWorkerHandler,
  deleteWorkerHandler,
} from "../controller";
import {
  listWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deactivateWorker,
} from "../service";
import { HTTP_STATUS } from "../../../constants";
import { AuthenticatedRequest } from "../../../middlewares/auth.middleware";
import {
  setupControllerTest,
  getMockedServiceFunction,
} from "../../../helpers";

const mockListWorkers = getMockedServiceFunction(listWorkers);
const mockGetWorkerById = getMockedServiceFunction(getWorkerById);
const mockCreateWorker = getMockedServiceFunction(createWorker);
const mockUpdateWorker = getMockedServiceFunction(updateWorker);
const mockDeactivateWorker = getMockedServiceFunction(deactivateWorker);

describe("Workers Controller", () => {
  const { mockReq, mockRes } = setupControllerTest();

  describe("getWorkers", () => {
    it("should return all workers", async () => {
      (mockReq as AuthenticatedRequest).user = {
        user_id: 1,
        email: "admin@test.com",
        role: "Administrator",
        must_change_password: false,
      };
      const workers = [{ worker_id: 1, first_name: "John" }];
      mockListWorkers.mockResolvedValue(workers as any);

      await getWorkers(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockListWorkers).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getWorker", () => {
    it("should return worker by id or 404 if not found", async () => {
      (mockReq as AuthenticatedRequest).user = {
        user_id: 1,
        email: "admin@test.com",
        role: "Administrator",
        must_change_password: false,
      };
      mockReq.params = { workerId: "1" };
      const worker = { worker_id: 1, first_name: "John" };
      mockGetWorkerById.mockResolvedValue(worker as any);

      await getWorker(mockReq as AuthenticatedRequest, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      jest.clearAllMocks();
      mockReq.params = { workerId: "999" };
      mockGetWorkerById.mockResolvedValue(null);
      await getWorker(mockReq as AuthenticatedRequest, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe("createWorkerHandler", () => {
    it("should create worker successfully", async () => {
      mockReq.body = {
        company_worker_code: "W001",
        first_name: "John",
        last_name_1: "Doe",
        email: "john@test.com",
      };
      const created = { worker_id: 1, ...mockReq.body };
      mockCreateWorker.mockResolvedValue(created as any);

      await createWorkerHandler(mockReq as Request, mockRes as Response);

      expect(mockCreateWorker).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    });

    it("should return 400 for validation or 409 for duplicate", async () => {
      mockReq.body = { company_worker_code: "W001" };
      await createWorkerHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);

      jest.clearAllMocks();
      mockReq.body = {
        company_worker_code: "W001",
        first_name: "John",
        last_name_1: "Doe",
        email: "john@test.com",
      };
      mockCreateWorker.mockRejectedValue(new Error("Unique constraint failed"));
      await createWorkerHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
    });
  });

  describe("updateWorkerHandler", () => {
    it("should update worker successfully", async () => {
      mockReq.params = { workerId: "1" };
      mockReq.body = {
        company_worker_code: "W001",
        first_name: "John",
        last_name_1: "Doe",
        email: "updated@test.com",
      };
      const existing = { worker_id: 1, first_name: "Old Name" };
      const updated = { worker_id: 1, ...mockReq.body };

      mockGetWorkerById.mockResolvedValue(existing as any);
      mockUpdateWorker.mockResolvedValue(updated as any);

      await updateWorkerHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should return 404 or 400 for errors", async () => {
      mockReq.params = { workerId: "999" };
      mockReq.body = {
        company_worker_code: "W001",
        first_name: "John",
        last_name_1: "Doe",
        email: "test@test.com",
      };
      mockGetWorkerById.mockResolvedValue(null);
      await updateWorkerHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);

      jest.clearAllMocks();
      mockReq.params = { workerId: "1" };
      mockReq.body = { company_worker_code: "W001" };
      await updateWorkerHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe("deleteWorkerHandler", () => {
    it("should delete worker or return 404", async () => {
      mockReq.params = { workerId: "1" };
      mockGetWorkerById.mockResolvedValue({ worker_id: 1 } as any);
      mockDeactivateWorker.mockResolvedValue({} as any);

      await deleteWorkerHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      jest.clearAllMocks();
      mockReq.params = { workerId: "999" };
      mockGetWorkerById.mockResolvedValue(null);
      await deleteWorkerHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    });
  });
});
