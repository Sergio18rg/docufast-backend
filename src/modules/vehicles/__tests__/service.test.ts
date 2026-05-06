jest.mock("../../../lib/prisma");
import {
  listVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deactivateVehicle,
  activateVehicle,
} from "../service";
import { STATUS } from "../../../constants";
import {
  getMockedPrismaModel,
  setupTestEnvironment,
  mockPrismaTransaction,
  mockEmptyDocuments,
} from "../../../helpers";

const mockPrismaVehicle = getMockedPrismaModel("vehicle");
const mockPrisma$transaction = getMockedPrismaModel("$transaction");

describe("Vehicles Service", () => {
  setupTestEnvironment();

  describe("listVehicles", () => {
    it("should return all vehicles with worker assignments", async () => {
      const mockVehicles = [
        {
          vehicle_id: 1,
          license_plate: "ABC123",
          vehicle_type: "Van",
          company_owner: "Rumofast",
          status: STATUS.ACTIVE,
          worker_assignments: [
            {
              worker: {
                worker_id: 10,
                first_name: "John",
                last_name_1: "Doe",
              },
            },
          ],
        },
      ];

      mockPrismaVehicle.findMany.mockResolvedValue(mockVehicles as any);
      mockEmptyDocuments();

      const result = await listVehicles();

      expect(mockPrismaVehicle.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("current_workers");
      expect(result[0]).toHaveProperty("documents");
    });
  });

  describe("getVehicleById", () => {
    it("should return vehicle by ID", async () => {
      const mockVehicle = {
        vehicle_id: 1,
        license_plate: "ABC123",
        status: STATUS.ACTIVE,
        worker_assignments: [],
      };

      mockPrismaVehicle.findUnique.mockResolvedValue(mockVehicle as any);
      mockEmptyDocuments();

      const result = await getVehicleById(1);

      expect(result).toBeDefined();
    });
  });

  describe("createVehicle", () => {
    it("should create vehicle with normalized data", async () => {
      const payload = {
        license_plate: "XYZ789",
        vehicle_type: "Van",
        company_owner: "Rumofast",
        documents: [],
      };

      const createdVehicle = {
        vehicle_id: 1,
        ...payload,
        status: STATUS.ACTIVE,
        worker_assignments: [],
      };

      mockPrismaVehicle.create.mockResolvedValue(createdVehicle as any);
      mockPrismaTransaction();
      mockPrismaVehicle.findUnique.mockResolvedValue(createdVehicle as any);
      mockEmptyDocuments();

      const result = await createVehicle(payload as any);

      expect(result).toBeDefined();
    });
  });

  describe("updateVehicle", () => {
    it("should update vehicle successfully", async () => {
      const payload = {
        license_plate: "ABC123",
        vehicle_type: "Truck",
        company_owner: "Rumofast",
        documents: [],
      };

      const updatedVehicle = {
        vehicle_id: 1,
        ...payload,
        status: STATUS.ACTIVE,
        worker_assignments: [],
      };

      mockPrismaTransaction();
      mockPrismaVehicle.findUnique.mockResolvedValue(updatedVehicle as any);
      mockEmptyDocuments();

      const result = await updateVehicle(1, payload as any);

      expect(result).toBeDefined();
    });
  });

  describe("deactivateVehicle and activateVehicle", () => {
    it("should deactivate and activate vehicle", async () => {
      mockPrismaTransaction();
      mockPrismaVehicle.update.mockResolvedValue({
        vehicle_id: 1,
        status: STATUS.ACTIVE,
      } as any);

      await deactivateVehicle(1);
      await activateVehicle(1);

      expect(mockPrisma$transaction).toHaveBeenCalled();
      expect(mockPrismaVehicle.update).toHaveBeenCalled();
    });
  });
});
