jest.mock("../../../lib/prisma");
import {
  listClients,
  getClientById,
  createClient,
  updateClient,
  deactivateClient,
  activateClient,
} from "../service";
import { STATUS, ROLES } from "../../../constants";
import {
  getMockedPrismaModel,
  setupTestEnvironment,
  mockPrismaTransaction,
  mockEmptyDocuments,
} from "../../../helpers";

const mockPrismaClient = getMockedPrismaModel("client");
const mockPrisma$transaction = getMockedPrismaModel("$transaction");

describe("Clients Service", () => {
  setupTestEnvironment();

  describe("listClients", () => {
    it("should return all clients with documents", async () => {
      const mockClients = [
        {
          client_id: 1,
          client_code: "CLI001",
          business_name: "Client A",
          contact_email: "clienta@test.com",
          status: STATUS.ACTIVE,
        },
        {
          client_id: 2,
          client_code: "CLI002",
          business_name: "Client B",
          contact_email: "clientb@test.com",
          status: STATUS.ACTIVE,
        },
      ];

      mockPrismaClient.findMany.mockResolvedValue(mockClients as any);
      mockEmptyDocuments();

      const result = await listClients();

      expect(mockPrismaClient.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("documents");
    });
  });

  describe("getClientById", () => {
    it("should return client by ID", async () => {
      const mockClient = {
        client_id: 1,
        client_code: "CLI001",
        business_name: "Client A",
        status: STATUS.ACTIVE,
        workers: [],
      };

      mockPrismaClient.findUnique.mockResolvedValue(mockClient as any);
      mockEmptyDocuments();

      const result = await getClientById(1);

      expect(result).toBeDefined();
    });
  });

  describe("createClient", () => {
    it("should create client with normalized data", async () => {
      const payload = {
        client_code: "CLI001",
        business_name: "Test Client",
        contact_email: "client@test.com",
        contact_phone: "555-1234",
        badge_color: "#FF0000",
        documents: [],
      };

      const createdClient = {
        client_id: 1,
        ...payload,
        status: STATUS.ACTIVE,
        workers: [],
      };

      const mockRole = { role_id: 3, name: ROLES.EXTERNAL };
      const mockPrismaRole = getMockedPrismaModel("role");
      const mockPrismaUser = getMockedPrismaModel("user");

      mockPrismaRole.findUnique = jest.fn().mockResolvedValue(mockRole);
      mockPrismaUser.create = jest
        .fn()
        .mockResolvedValue({ user_id: 10 } as any);
      mockPrismaClient.create.mockResolvedValue(createdClient as any);
      mockPrismaTransaction();
      mockPrismaClient.findUnique.mockResolvedValue(createdClient as any);
      mockEmptyDocuments();

      const result = await createClient(payload as any);

      expect(result).toBeDefined();
    });
  });

  describe("updateClient", () => {
    it("should update client successfully", async () => {
      const payload = {
        client_code: "CLI001",
        business_name: "Updated Client",
        contact_email: "updated@test.com",
        contact_phone: "555-9999",
        badge_color: "#00FF00",
        documents: [],
      };

      const updatedClient = {
        client_id: 1,
        ...payload,
        status: STATUS.ACTIVE,
        workers: [],
      };

      const mockPrismaUser = getMockedPrismaModel("user");

      mockPrismaClient.findUnique = jest
        .fn()
        .mockResolvedValueOnce({ user_id: 10 } as any)
        .mockResolvedValue(updatedClient as any);
      mockPrismaUser.update = jest
        .fn()
        .mockResolvedValue({ user_id: 10 } as any);
      mockPrismaTransaction();
      mockEmptyDocuments();

      const result = await updateClient(1, payload as any);

      expect(result).toBeDefined();
    });
  });

  describe("deactivateClient and activateClient", () => {
    it("should deactivate and activate client", async () => {
      mockPrismaTransaction();
      mockPrismaClient.update.mockResolvedValue({
        client_id: 1,
        status: STATUS.ACTIVE,
      } as any);

      await deactivateClient(1);
      await activateClient(1);

      expect(mockPrisma$transaction).toHaveBeenCalled();
      expect(mockPrismaClient.update).toHaveBeenCalled();
    });
  });
});
