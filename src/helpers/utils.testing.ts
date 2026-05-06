import request from "supertest";
import { Request, Response } from "express";
import app from "../app";
import { generateToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

const api = {
  get: (path: string, token: string) =>
    request(app).get(path).set("Authorization", token),
  post: (path: string, token: string) =>
    request(app).post(path).set("Authorization", token),
  put: (path: string, token: string) =>
    request(app).put(path).set("Authorization", token),
  delete: (path: string, token: string) =>
    request(app).delete(path).set("Authorization", token),
};

const adminToken = () =>
  `Bearer ${generateToken({ user_id: 1, email: "admin@test.com", role: "Administrator" })}`;

const externalToken = () =>
  `Bearer ${generateToken({ user_id: 3, email: "external@test.com", role: "External" })}`;

const mustChangeToken = () =>
  `Bearer ${generateToken({
    user_id: 1,
    email: "admin@test.com",
    role: "Administrator",
    must_change_password: true,
  })}`;

const getMockedPrismaModel = <T extends keyof typeof prisma>(
  modelName: T,
): jest.Mocked<(typeof prisma)[T]> => {
  return prisma[modelName] as jest.Mocked<(typeof prisma)[T]>;
};

const setupTestEnvironment = () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
};

const mockPrismaTransaction = () => {
  const mockTransaction = prisma.$transaction as jest.MockedFunction<
    typeof prisma.$transaction
  >;
  mockTransaction.mockImplementation((callback: any) => callback(prisma));
  return mockTransaction;
};

const mockEmptyDocuments = () => {
  const mockEntityDocument = getMockedPrismaModel("entityDocument");
  mockEntityDocument.findMany.mockResolvedValue([]);
};

const createMockRequest = (
  initialData: Partial<Request | AuthenticatedRequest> = {},
): Partial<Request | AuthenticatedRequest> => {
  return {
    body: {},
    params: {},
    ...initialData,
  };
};

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const getMockedServiceFunction = <T extends (...args: any[]) => any>(
  serviceFunction: T,
): jest.MockedFunction<T> => {
  return serviceFunction as jest.MockedFunction<T>;
};

interface ControllerTestContext {
  mockReq: Partial<Request | AuthenticatedRequest>;
  mockRes: Partial<Response>;
}

const setupControllerTest = (): ControllerTestContext => {
  const context: ControllerTestContext = {
    mockReq: createMockRequest(),
    mockRes: createMockResponse(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    context.mockReq = createMockRequest();
    context.mockRes = createMockResponse();
  });

  return context;
};

export {
  api,
  adminToken,
  externalToken,
  mustChangeToken,
  getMockedPrismaModel,
  setupTestEnvironment,
  mockEmptyDocuments,
  mockPrismaTransaction,
  createMockRequest,
  createMockResponse,
  getMockedServiceFunction,
  setupControllerTest,
};
