const createModelMock = () => ({
  findMany: jest.fn(),
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  upsert: jest.fn(),
  count: jest.fn(),
});

export const prisma = {
  user: createModelMock(),
  worker: createModelMock(),
  client: createModelMock(),
  vehicle: createModelMock(),
  role: createModelMock(),
  entityDocument: createModelMock(),
  document: createModelMock(),
  documentType: createModelMock(),
  workerVehicleAssignment: createModelMock(),
  $transaction: jest.fn(),
};
