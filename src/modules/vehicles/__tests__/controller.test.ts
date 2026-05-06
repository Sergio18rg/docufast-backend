jest.mock("../service");

import { Request, Response } from "express";
import {
  getVehicles,
  getVehicle,
  createVehicleHandler,
  updateVehicleHandler,
  deleteVehicleHandler,
} from "../controller";
import {
  listVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deactivateVehicle,
} from "../service";
import { HTTP_STATUS } from "../../../constants";
import {
  setupControllerTest,
  getMockedServiceFunction,
} from "../../../helpers";

const mockListVehicles = getMockedServiceFunction(listVehicles);
const mockGetVehicleById = getMockedServiceFunction(getVehicleById);
const mockCreateVehicle = getMockedServiceFunction(createVehicle);
const mockUpdateVehicle = getMockedServiceFunction(updateVehicle);
const mockDeactivateVehicle = getMockedServiceFunction(deactivateVehicle);

describe("Vehicles Controller", () => {
  const { mockReq, mockRes } = setupControllerTest();

  describe("getVehicles", () => {
    it("should return all vehicles", async () => {
      const vehicles = [{ vehicle_id: 1, license_plate: "ABC123" }];
      mockListVehicles.mockResolvedValue(vehicles as any);

      await getVehicles(mockReq as Request, mockRes as Response);

      expect(mockListVehicles).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getVehicle", () => {
    it("should return vehicle by id or 404 if not found", async () => {
      mockReq.params = { vehicleId: "1" };
      const vehicle = { vehicle_id: 1, license_plate: "ABC123" };
      mockGetVehicleById.mockResolvedValue(vehicle as any);

      await getVehicle(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      jest.clearAllMocks();
      mockReq.params = { vehicleId: "999" };
      mockGetVehicleById.mockResolvedValue(null);
      await getVehicle(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe("createVehicleHandler", () => {
    it("should create vehicle successfully", async () => {
      mockReq.body = {
        license_plate: "XYZ789",
        vehicle_type: "Truck",
        company_owner: "Rumofast",
      };
      const created = { vehicle_id: 1, ...mockReq.body };
      mockCreateVehicle.mockResolvedValue(created as any);

      await createVehicleHandler(mockReq as Request, mockRes as Response);

      expect(mockCreateVehicle).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    });

    it("should return 400 for validation or 409 for duplicate", async () => {
      mockReq.body = { license_plate: "ABC123" };
      await createVehicleHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);

      jest.clearAllMocks();
      mockReq.body = {
        license_plate: "ABC123",
        vehicle_type: "Car",
        company_owner: "Test",
      };
      mockCreateVehicle.mockRejectedValue(
        new Error("Unique constraint failed"),
      );
      await createVehicleHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
    });
  });

  describe("updateVehicleHandler", () => {
    it("should update vehicle successfully", async () => {
      mockReq.params = { vehicleId: "1" };
      mockReq.body = {
        license_plate: "UPD123",
        vehicle_type: "Van",
        company_owner: "Rumofast",
      };
      const existing = { vehicle_id: 1, license_plate: "OLD123" };
      const updated = { vehicle_id: 1, ...mockReq.body };

      mockGetVehicleById.mockResolvedValue(existing as any);
      mockUpdateVehicle.mockResolvedValue(updated as any);

      await updateVehicleHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should return 404 or 400 for errors", async () => {
      mockReq.params = { vehicleId: "999" };
      mockReq.body = {
        license_plate: "ABC123",
        vehicle_type: "Car",
        company_owner: "Test",
      };
      mockGetVehicleById.mockResolvedValue(null);
      await updateVehicleHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);

      jest.clearAllMocks();
      mockReq.params = { vehicleId: "1" };
      mockReq.body = { license_plate: "ABC123" };
      await updateVehicleHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe("deleteVehicleHandler", () => {
    it("should delete vehicle or return 404", async () => {
      mockReq.params = { vehicleId: "1" };
      mockGetVehicleById.mockResolvedValue({ vehicle_id: 1 } as any);
      mockDeactivateVehicle.mockResolvedValue({} as any);

      await deleteVehicleHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      jest.clearAllMocks();
      mockReq.params = { vehicleId: "999" };
      mockGetVehicleById.mockResolvedValue(null);
      await deleteVehicleHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    });
  });
});
