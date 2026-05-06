jest.mock("../../../lib/prisma");
import {
  listWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deactivateWorker,
  restoreWorker,
} from "../service";
import { STATUS, ROLES } from "../../../constants";
import {
  getMockedPrismaModel,
  setupTestEnvironment,
  mockPrismaTransaction,
  mockEmptyDocuments,
} from "../../../helpers";

const mockPrismaWorker = getMockedPrismaModel("worker");
const mockPrismaClient = getMockedPrismaModel("client");
const mockPrisma$transaction = getMockedPrismaModel("$transaction");

describe("Workers Service", () => {
  setupTestEnvironment();

  describe("listWorkers", () => {
    it("should return all workers for admin users", async () => {
      const mockWorkers = [
        {
          worker_id: 1,
          first_name: "John",
          last_name_1: "Doe",
          status: STATUS.ACTIVE,
          client: { client_id: 5 },
          current_vehicle: null,
        },
      ];

      mockPrismaWorker.findMany.mockResolvedValue(mockWorkers as any);
      mockEmptyDocuments();

      const result = await listWorkers();

      expect(result).toHaveLength(1);
    });

    it("should filter workers for external users", async () => {
      const mockClient = { client_id: 5, status: STATUS.ACTIVE };
      const mockWorker = {
        worker_id: 1,
        client_id: 5,
        first_name: "John",
        status: STATUS.ACTIVE,
        client: { client_id: 5 },
        current_vehicle: null,
      };

      mockPrismaClient.findFirst.mockResolvedValue(mockClient as any);
      mockPrismaWorker.findMany.mockResolvedValue([mockWorker] as any);
      mockEmptyDocuments();

      const result = await listWorkers({ user_id: 100, role: ROLES.EXTERNAL });

      expect(result).toHaveLength(1);
    });
  });

  describe("getWorkerById", () => {
    it("should return worker by ID", async () => {
      const mockWorker = {
        worker_id: 1,
        first_name: "John",
        status: STATUS.ACTIVE,
        client: { client_id: 5 },
        current_vehicle: null,
      };

      mockPrismaWorker.findFirst.mockResolvedValue(mockWorker as any);
      mockEmptyDocuments();

      const result = await getWorkerById(1);

      expect(result).toBeDefined();
    });
  });

  describe("createWorker", () => {
    it("should create worker with normalized data", async () => {
      const payload = {
        company_worker_code: "W001",
        first_name: "John",
        last_name_1: "Doe",
        email: "john@test.com",
        documents: [],
      };

      const createdWorker = {
        worker_id: 1,
        ...payload,
        status: STATUS.ACTIVE,
        user_id: null,
      };

      const mockRole = { role_id: 2, name: ROLES.WORKER };
      const mockPrismaRole = getMockedPrismaModel("role");
      const mockPrismaUser = getMockedPrismaModel("user");
      const mockPrismaWorkerVehicleAssignment = getMockedPrismaModel(
        "workerVehicleAssignment",
      );

      mockPrismaRole.findUnique = jest.fn().mockResolvedValue(mockRole);
      mockPrismaUser.create = jest
        .fn()
        .mockResolvedValue({ user_id: 10 } as any);
      mockPrismaWorkerVehicleAssignment.findMany = jest
        .fn()
        .mockResolvedValue([]);
      mockPrismaWorker.create.mockResolvedValue(createdWorker as any);
      mockPrismaTransaction();
      mockPrismaWorker.findFirst.mockResolvedValue({
        ...createdWorker,
        client: { client_id: 5 },
        current_vehicle: null,
      } as any);
      mockEmptyDocuments();

      const result = await createWorker(payload as any);

      expect(result).toBeDefined();
    });
  });

  describe("updateWorker", () => {
    it("should update worker successfully", async () => {
      const payload = {
        company_worker_code: "W001",
        first_name: "John",
        last_name_1: "Doe",
        email: "john@test.com",
        status: STATUS.ACTIVE,
        documents: [],
      };

      const existingWorker = { user_id: 10 };
      const mockPrismaUser = getMockedPrismaModel("user");
      const mockPrismaWorkerVehicleAssignment = getMockedPrismaModel(
        "workerVehicleAssignment",
      );

      mockPrismaWorker.findUnique.mockResolvedValue(existingWorker as any);
      mockPrismaUser.update = jest
        .fn()
        .mockResolvedValue({ user_id: 10 } as any);
      mockPrismaWorkerVehicleAssignment.findMany = jest
        .fn()
        .mockResolvedValue([]);
      mockPrismaTransaction();
      mockPrismaWorker.findFirst.mockResolvedValue({ worker_id: 1 } as any);
      mockEmptyDocuments();

      const result = await updateWorker(1, payload as any);

      expect(result).toBeDefined();
    });
  });

  describe("deactivateWorker and restoreWorker", () => {
    it("should deactivate and restore worker", async () => {
      mockPrismaTransaction();
      mockPrismaWorker.update.mockResolvedValue({
        worker_id: 1,
        status: STATUS.ACTIVE,
      } as any);

      await deactivateWorker(1);
      await restoreWorker(1);

      expect(mockPrisma$transaction).toHaveBeenCalled();
      expect(mockPrismaWorker.update).toHaveBeenCalled();
    });
  });
});
