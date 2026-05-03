import path from "node:path";
import fs from "node:fs/promises";
import { Prisma } from "../../generated/prisma/client";
import { SortOrder } from "../../generated/prisma/internal/prismaNamespace";
import { prisma } from "../../lib/prisma";
import {
  STATUS,
  DEFAULT_SECURITY_LEVEL,
  ADDITIONAL_DOCUMENT_CONFIG,
} from "../../constants";
import {
  trim,
  trimOptional,
  toValidDate,
  getDocumentStatus,
  ensureDocumentType,
  buildGenericDocumentDto,
  getDocumentsByEntityIds,
  attachDocumentsToEntity,
} from "../../utils";
import { PREDEFINED_VEHICLE_DOCUMENTS, VEHICLE_ENTITY_TYPE } from "./constants";
import { VehicleDocumentInput, VehiclePayload } from "./types";

const vehicleInclude = {
  worker_assignments: {
    where: { status: STATUS.ACTIVE },
    include: { worker: true },
    orderBy: [{ start_datetime: SortOrder.desc }],
  },
};

const toVehicleDto = (vehicle: any, docs: any[] = []) =>
  attachDocumentsToEntity(
    {
      ...vehicle,
      current_workers: (vehicle.worker_assignments ?? []).map(
        (assignment: any) => ({
          worker_id: assignment.worker.worker_id,
          first_name: assignment.worker.first_name,
          last_name_1: assignment.worker.last_name_1,
          full_name: `${assignment.worker.first_name} ${assignment.worker.last_name_1}`,
        }),
      ),
      current_workers_count: (vehicle.worker_assignments ?? []).length,
    },
    {
      predefinedDocuments: PREDEFINED_VEHICLE_DOCUMENTS,
      includePlaceholders: true,
      documentIdFieldName: "vehicle_document_id",
    },
    docs,
  );

const listVehicles = async () => {
  const vehicles = await prisma.vehicle.findMany({
    include: vehicleInclude,
    orderBy: [{ created_at: SortOrder.desc }, { vehicle_id: SortOrder.desc }],
  });
  const ids = vehicles.map((vehicle) => vehicle.vehicle_id);

  const buildDocumentDto = (entityDocument: any) =>
    buildGenericDocumentDto(
      entityDocument,
      "vehicle_document_id",
      getDocumentStatus,
    );

  const docsMap = await getDocumentsByEntityIds(
    VEHICLE_ENTITY_TYPE,
    ids,
    buildDocumentDto,
  );
  return vehicles.map((vehicle) =>
    toVehicleDto(vehicle, docsMap.get(vehicle.vehicle_id) ?? []),
  );
};

const getVehicleById = async (vehicleId: number) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: vehicleId },
    include: vehicleInclude,
  });

  const buildDocumentDto = (entityDocument: any) =>
    buildGenericDocumentDto(
      entityDocument,
      "vehicle_document_id",
      getDocumentStatus,
    );

  const docsMap = await getDocumentsByEntityIds(
    VEHICLE_ENTITY_TYPE,
    vehicle ? [vehicle.vehicle_id] : [],
    buildDocumentDto,
  );
  return toVehicleDto(vehicle, docsMap.get(vehicleId) ?? []);
};

const syncVehicleDocuments = async (
  tx: Prisma.TransactionClient,
  vehicleId: number,
  documents: VehicleDocumentInput[],
) => {
  const activeEntityDocuments = await tx.entityDocument.findMany({
    where: {
      entity_type: VEHICLE_ENTITY_TYPE,
      entity_id: vehicleId,
      status: STATUS.ACTIVE,
    },
    include: { document: { include: { document_type: true } } },
  });
  const currentByEntityDocumentId = new Map(
    activeEntityDocuments.map((item) => [item.entity_document_id, item]),
  );
  const currentByDocumentKey = new Map(
    activeEntityDocuments.map((item) => [item.document.document_key, item]),
  );

  for (const document of documents) {
    const issueDate = toValidDate(document.issue_date) ?? new Date();
    const expirationDate = toValidDate(document.expiration_date) ?? new Date();
    const securityLevel =
      trimOptional(document.security_level) ?? DEFAULT_SECURITY_LEVEL;
    const isPredefined = !!document.is_predefined;
    const documentType = await ensureDocumentType({
      entityType: VEHICLE_ENTITY_TYPE,
      documentKey: isPredefined
        ? document.document_key
        : ADDITIONAL_DOCUMENT_CONFIG.key,
      documentName: document.document_name,
      isPredefined,
      predefinedDocuments: PREDEFINED_VEHICLE_DOCUMENTS,
      additionalDocumentConfig: ADDITIONAL_DOCUMENT_CONFIG,
    });

    if (
      document.vehicle_document_id &&
      currentByEntityDocumentId.has(document.vehicle_document_id)
    ) {
      const existing = currentByEntityDocumentId.get(
        document.vehicle_document_id,
      )!;
      await tx.document.update({
        where: { document_id: existing.document.document_id },
        data: {
          display_name: trim(document.document_name),
          security_level: securityLevel,
          issue_date: issueDate,
          expiration_date: expirationDate,
          notes: trimOptional(document.notes),
          status: existing.document.file_path
            ? getDocumentStatus(true, expirationDate)
            : STATUS.ACTIVE,
        },
      });
      continue;
    }

    if (currentByDocumentKey.has(document.document_key)) {
      const existing = currentByDocumentKey.get(document.document_key)!;
      await tx.document.update({
        where: { document_id: existing.document.document_id },
        data: {
          display_name: trim(document.document_name),
          security_level: securityLevel,
          issue_date: issueDate,
          expiration_date: expirationDate,
          notes: trimOptional(document.notes),
          status: existing.document.file_path
            ? getDocumentStatus(true, expirationDate)
            : STATUS.ACTIVE,
        },
      });
      continue;
    }

    const createdDocument = await tx.document.create({
      data: {
        document_type_id: documentType.document_type_id,
        document_key: trim(document.document_key),
        display_name: trim(document.document_name),
        issue_date: issueDate,
        expiration_date: expirationDate,
        notes: trimOptional(document.notes),
        security_level: securityLevel,
        status: STATUS.ACTIVE,
      },
    });
    await tx.entityDocument.create({
      data: {
        document_id: createdDocument.document_id,
        entity_type: VEHICLE_ENTITY_TYPE,
        entity_id: vehicleId,
        status: STATUS.ACTIVE,
      },
    });
  }
};

const createVehicle = async (payload: VehiclePayload) => {
  const vehicle = await prisma.vehicle.create({
    data: {
      license_plate: trim(payload.license_plate),
      company_owner: trim(payload.company_owner),
      vehicle_type: trim(payload.vehicle_type),
      contract_start_date: toValidDate(payload.contract_start_date),
      contract_end_date: toValidDate(payload.contract_end_date),
      status: trimOptional(payload.status) ?? STATUS.ACTIVE,
      notes: trimOptional(payload.notes),
    },
  });
  await prisma.$transaction(async (tx) => {
    await syncVehicleDocuments(tx, vehicle.vehicle_id, payload.documents ?? []);
  });
  return getVehicleById(vehicle.vehicle_id);
};

const updateVehicle = async (vehicleId: number, payload: VehiclePayload) => {
  await prisma.$transaction(async (tx) => {
    await tx.vehicle.update({
      where: { vehicle_id: vehicleId },
      data: {
        license_plate: trim(payload.license_plate),
        company_owner: trim(payload.company_owner),
        vehicle_type: trim(payload.vehicle_type),
        contract_start_date: toValidDate(payload.contract_start_date),
        contract_end_date: toValidDate(payload.contract_end_date),
        status: trimOptional(payload.status) ?? STATUS.ACTIVE,
        notes: trimOptional(payload.notes),
      },
    });
    await syncVehicleDocuments(tx, vehicleId, payload.documents ?? []);
  });
  return getVehicleById(vehicleId);
};

const deactivateVehicle = async (vehicleId: number) =>
  prisma.$transaction(async (tx) => {
    await tx.vehicle.update({
      where: { vehicle_id: vehicleId },
      data: { status: STATUS.INACTIVE },
    });
    await tx.worker.updateMany({
      where: { current_vehicle_id: vehicleId },
      data: { current_vehicle_id: null },
    });
    await tx.workerVehicleAssignment.updateMany({
      where: { vehicle_id: vehicleId, status: STATUS.ACTIVE },
      data: { status: STATUS.INACTIVE, end_datetime: new Date() },
    });
  });

const activateVehicle = async (vehicleId: number) =>
  prisma.vehicle.update({
    where: { vehicle_id: vehicleId },
    data: { status: STATUS.ACTIVE },
  });

const uploadVehicleDocumentFile = async ({
  vehicleId,
  file,
  documentKey,
  documentName,
  securityLevel,
  issueDate,
  expirationDate,
  notes,
  replaceDocumentId,
  isPredefined,
}: {
  vehicleId: number;
  file: Express.Multer.File;
  documentKey: string;
  documentName: string;
  securityLevel?: string | null;
  issueDate?: string | null;
  expirationDate?: string | null;
  notes?: string | null;
  replaceDocumentId?: number | null;
  isPredefined?: boolean;
}) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: vehicleId },
  });
  if (!vehicle) throw new Error("Vehicle not found");

  const targetDir = path.join(
    process.cwd(),
    "uploads",
    "vehicles",
    String(vehicleId),
  );
  await fs.mkdir(targetDir, { recursive: true });

  const finalFileName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
  const finalPath = path.join(targetDir, finalFileName);
  await fs.writeFile(finalPath, file.buffer);

  const expiresAt = toValidDate(expirationDate) ?? new Date();
  const security = trimOptional(securityLevel) ?? DEFAULT_SECURITY_LEVEL;

  const documentType = await ensureDocumentType({
    entityType: VEHICLE_ENTITY_TYPE,
    documentKey: isPredefined ? documentKey : ADDITIONAL_DOCUMENT_CONFIG.key,
    documentName,
    isPredefined,
    predefinedDocuments: PREDEFINED_VEHICLE_DOCUMENTS,
    additionalDocumentConfig: ADDITIONAL_DOCUMENT_CONFIG,
  });

  const existing = replaceDocumentId
    ? await prisma.entityDocument.findFirst({
        where: {
          entity_document_id: replaceDocumentId,
          entity_type: VEHICLE_ENTITY_TYPE,
          entity_id: vehicleId,
          status: STATUS.ACTIVE,
        },
        include: { document: true },
      })
    : await prisma.entityDocument.findFirst({
        where: {
          entity_type: VEHICLE_ENTITY_TYPE,
          entity_id: vehicleId,
          status: STATUS.ACTIVE,
          document: {
            document_key: documentKey,
            status: { not: STATUS.INACTIVE },
          },
        },
        include: { document: true },
      });

  if (existing && !existing.document.file_path) {
    await prisma.document.update({
      where: { document_id: existing.document.document_id },
      data: {
        original_filename: file.originalname,
        stored_filename: finalFileName,
        file_path: `/uploads/vehicles/${vehicleId}/${finalFileName}`,
        mime_type: file.mimetype,
        file_size: file.size,
        display_name: trim(documentName),
        security_level: security,
        issue_date: toValidDate(issueDate) ?? new Date(),
        expiration_date: expiresAt,
        notes: trimOptional(notes),
        status: getDocumentStatus(true, expiresAt),
      },
    });
    return existing;
  }

  if (existing) {
    await prisma.entityDocument.update({
      where: { entity_document_id: existing.entity_document_id },
      data: { status: STATUS.INACTIVE },
    });
    await prisma.document.update({
      where: { document_id: existing.document.document_id },
      data: { status: STATUS.INACTIVE },
    });
  }

  const createdDocument = await prisma.document.create({
    data: {
      document_type_id: documentType.document_type_id,
      document_key: trim(documentKey),
      display_name: trim(documentName),
      original_filename: file.originalname,
      stored_filename: finalFileName,
      file_path: `/uploads/vehicles/${vehicleId}/${finalFileName}`,
      mime_type: file.mimetype,
      file_size: file.size,
      issue_date: toValidDate(issueDate) ?? new Date(),
      expiration_date: expiresAt,
      notes: trimOptional(notes),
      security_level: security,
      status: getDocumentStatus(true, expiresAt),
    },
  });

  return prisma.entityDocument.create({
    data: {
      document_id: createdDocument.document_id,
      entity_type: VEHICLE_ENTITY_TYPE,
      entity_id: vehicleId,
      status: STATUS.ACTIVE,
    },
  });
};

const removeVehicleDocument = async (
  vehicleId: number,
  vehicleDocumentId: number,
) => {
  const entityDocument = await prisma.entityDocument.findFirst({
    where: {
      entity_document_id: vehicleDocumentId,
      entity_type: VEHICLE_ENTITY_TYPE,
      entity_id: vehicleId,
      status: STATUS.ACTIVE,
    },
    include: { document: true },
  });

  if (!entityDocument) throw new Error("Document not found");

  await prisma.entityDocument.update({
    where: { entity_document_id: vehicleDocumentId },
    data: { status: STATUS.INACTIVE },
  });
  return prisma.document.update({
    where: { document_id: entityDocument.document_id },
    data: { status: STATUS.INACTIVE },
  });
};

export {
  listVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deactivateVehicle,
  activateVehicle,
  uploadVehicleDocumentFile,
  removeVehicleDocument,
};
