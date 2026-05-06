jest.mock("../../../lib/prisma");

import { prisma } from "../../../lib/prisma";
import {
  adminToken,
  externalToken,
  mockVehicle,
  validVehiclePayload,
  api,
} from "../../../helpers";
import { HTTP_STATUS } from "../../../constants/httpStatus";

const mockVehicleModel = prisma.vehicle as jest.Mocked<typeof prisma.vehicle>;
const mockEntityDocument = prisma.entityDocument as jest.Mocked<
  typeof prisma.entityDocument
>;
const mockWorkerModel = prisma.worker as jest.Mocked<typeof prisma.worker>;
const mockWorkerVehicleAssignment =
  prisma.workerVehicleAssignment as jest.Mocked<
    typeof prisma.workerVehicleAssignment
  >;
const mockTransaction = prisma.$transaction as jest.MockedFunction<
  typeof prisma.$transaction
>;

beforeEach(() => jest.resetAllMocks());

describe("Integration: Vehicles CRUD", () => {
  describe("List vehicles", () => {
    it("should return vehicles for Admin and External", async () => {
      mockVehicleModel.findMany.mockResolvedValue([mockVehicle]);
      mockEntityDocument.findMany.mockResolvedValue([]);

      const adminRes = await api.get("/api/vehicles", adminToken());
      expect(adminRes.status).toBe(HTTP_STATUS.OK);
      expect(Array.isArray(adminRes.body.data)).toBe(true);

      const externalRes = await api.get("/api/vehicles", externalToken());
      expect(externalRes.status).toBe(HTTP_STATUS.OK);
    });
  });

  describe("Vehicle CRUD operations", () => {
    it("should complete create flow successfully", async () => {
      const vehicleWithAssignments = { ...mockVehicle, worker_assignments: [] };
      mockVehicleModel.create.mockResolvedValue(vehicleWithAssignments);
      mockVehicleModel.findUnique.mockResolvedValue(vehicleWithAssignments);
      mockEntityDocument.findMany.mockResolvedValue([]);

      const res = await api
        .post("/api/vehicles", adminToken())
        .send(validVehiclePayload);

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.data).toHaveProperty("vehicle_id");
    });

    it("should complete update flow successfully", async () => {
      const mockVeh = { ...mockVehicle, worker_assignments: [] };
      mockVehicleModel.findUnique.mockResolvedValue(mockVeh);
      mockEntityDocument.findMany.mockResolvedValue([]);

      const res = await api
        .put("/api/vehicles/1", adminToken())
        .send({ ...validVehiclePayload, vehicle_type: "Car" });

      expect(res.status).toBe(HTTP_STATUS.OK);
    });

    it("should complete soft delete flow successfully", async () => {
      mockVehicleModel.findUnique.mockResolvedValue({
        ...mockVehicle,
        worker_assignments: [],
      } as any);
      mockEntityDocument.findMany.mockResolvedValue([]);
      mockTransaction.mockImplementation((callback: any) => callback(prisma));
      mockVehicleModel.update.mockResolvedValue({
        ...mockVehicle,
        status: "Inactive",
      } as any);
      mockWorkerModel.updateMany.mockResolvedValue({ count: 0 } as any);
      mockWorkerVehicleAssignment.updateMany.mockResolvedValue({
        count: 0,
      } as any);

      const res = await api.delete("/api/vehicles/1", adminToken());

      expect(res.status).toBe(HTTP_STATUS.OK);
    });

    it("should complete restore flow successfully", async () => {
      mockVehicleModel.findUnique.mockResolvedValue({
        ...mockVehicle,
        status: "Inactive",
        worker_assignments: [],
      } as any);
      mockEntityDocument.findMany.mockResolvedValue([]);
      mockVehicleModel.update.mockResolvedValue({
        ...mockVehicle,
        status: "Active",
      } as any);

      const res = await api.post("/api/vehicles/1/restore", adminToken());

      expect(res.status).toBe(HTTP_STATUS.OK);
    });
  });
});

describe("POST /api/vehicles/:vehicleId/documents/upload", () => {
  it("returns 400 when no file is attached", async () => {
    const res = await api
      .post("/api/vehicles/1/documents/upload", adminToken())
      .field("documentKey", "vehicle_insurance")
      .field("documentName", "Insurance");

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body.success).toBe(false);
  });
});
