jest.mock("../service");

import { Request, Response } from "express";
import {
  getClients,
  getClient,
  createClientHandler,
  updateClientHandler,
  deleteClientHandler,
} from "../controller";
import {
  listClients,
  getClientById,
  createClient,
  updateClient,
  deactivateClient,
} from "../service";
import { HTTP_STATUS } from "../../../constants";
import {
  setupControllerTest,
  getMockedServiceFunction,
} from "../../../helpers";

const mockListClients = getMockedServiceFunction(listClients);
const mockGetClientById = getMockedServiceFunction(getClientById);
const mockCreateClient = getMockedServiceFunction(createClient);
const mockUpdateClient = getMockedServiceFunction(updateClient);
const mockDeactivateClient = getMockedServiceFunction(deactivateClient);

describe("Clients Controller", () => {
  const { mockReq, mockRes } = setupControllerTest();

  describe("getClients", () => {
    it("should return all clients", async () => {
      const clients = [{ client_id: 1, business_name: "Test Client" }];
      mockListClients.mockResolvedValue(clients as any);

      await getClients(mockReq as Request, mockRes as Response);

      expect(mockListClients).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getClient", () => {
    it("should return client by id or 404 if not found", async () => {
      mockReq.params = { clientId: "1" };
      const client = { client_id: 1, business_name: "Test Client" };
      mockGetClientById.mockResolvedValue(client as any);

      await getClient(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      jest.clearAllMocks();
      mockReq.params = { clientId: "999" };
      mockGetClientById.mockResolvedValue(null);
      await getClient(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe("createClientHandler", () => {
    it("should create client successfully", async () => {
      mockReq.body = {
        client_code: "CL001",
        business_name: "New Client",
        contact_email: "client@test.com",
        badge_color: "#FF0000",
      };
      const created = { client_id: 1, ...mockReq.body };
      mockCreateClient.mockResolvedValue(created as any);

      await createClientHandler(mockReq as Request, mockRes as Response);

      expect(mockCreateClient).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    });

    it("should return 400 for validation or 409 for duplicate", async () => {
      mockReq.body = { client_code: "CL001" };
      await createClientHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);

      jest.clearAllMocks();
      mockReq.body = {
        client_code: "CL001",
        business_name: "Client",
        contact_email: "test@test.com",
        badge_color: "#FF0000",
      };
      mockCreateClient.mockRejectedValue(new Error("Unique constraint failed"));
      await createClientHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
    });
  });

  describe("updateClientHandler", () => {
    it("should update client successfully", async () => {
      mockReq.params = { clientId: "1" };
      mockReq.body = {
        client_code: "CL001",
        business_name: "Updated Client",
        contact_email: "updated@test.com",
        badge_color: "#00FF00",
      };
      const existing = { client_id: 1, business_name: "Old Name" };
      const updated = { client_id: 1, ...mockReq.body };

      mockGetClientById.mockResolvedValue(existing as any);
      mockUpdateClient.mockResolvedValue(updated as any);

      await updateClientHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should return 404 or 400 for errors", async () => {
      mockReq.params = { clientId: "999" };
      mockReq.body = {
        client_code: "CL001",
        business_name: "Client",
        contact_email: "test@test.com",
        badge_color: "#FF0000",
      };
      mockGetClientById.mockResolvedValue(null);
      await updateClientHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);

      jest.clearAllMocks();
      mockReq.params = { clientId: "1" };
      mockReq.body = { client_code: "CL001" };
      await updateClientHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe("deleteClientHandler", () => {
    it("should delete client or return 404", async () => {
      mockReq.params = { clientId: "1" };
      mockGetClientById.mockResolvedValue({ client_id: 1 } as any);
      mockDeactivateClient.mockResolvedValue({} as any);

      await deleteClientHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);

      jest.clearAllMocks();
      mockReq.params = { clientId: "999" };
      mockGetClientById.mockResolvedValue(null);
      await deleteClientHandler(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
    });
  });
});
