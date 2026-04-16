import path from "node:path";
import fs from "node:fs/promises";
import { Prisma } from "../../generated/prisma/client";
import { SortOrder } from "../../generated/prisma/internal/prismaNamespace";
import { prisma } from "../../lib/prisma";
import { STATUS } from "../../constants";
import { trim, trimOptional, toValidDate } from "../../utils";
import { getDocumentStatus } from "../workers/utils";
import {
  ADDITIONAL_VEHICLE_DOCUMENT,
  DEFAULT_SECURITY_LEVEL,
  PREDEFINED_VEHICLE_DOCUMENTS,
  VEHICLE_ENTITY_TYPE,
} from "./constants";
import { VehicleDocumentInput, VehiclePayload } from "./types";

const vehicleInclude = {
  worker_assignments: {
    where: { status: STATUS.ACTIVE },
    include: { worker: true },
    orderBy: [{ start_datetime: SortOrder.desc }],
  },
};

const ensureVehicleDocumentType = async ({
  documentKey,
  documentName,
  isPredefined,
}: {
  documentKey: string;
  documentName: string;
  isPredefined?: boolean;
}) => {
  const definition = isPredefined
    ? PREDEFINED_VEHICLE_DOCUMENTS.find((item) => item.key === documentKey)
    : ADDITIONAL_VEHICLE_DOCUMENT;

  const key = definition?.key ?? documentKey;
  const name = definition?.name ?? documentName;
  const isAdditional = definition?.key === ADDITIONAL_VEHICLE_DOCUMENT.key;
  const displayOrder = definition?.displayOrder ?? 999;
  const defaultSecurityLevel =
    definition?.defaultSecurityLevel ?? DEFAULT_SECURITY_LEVEL;

  return prisma.documentType.upsert({
    where: { entity_type_key: { entity_type: VEHICLE_ENTITY_TYPE, key } },
    update: {
      name,
      is_additional: isAdditional,
      default_security_level: defaultSecurityLevel,
      is_required: !isAdditional,
      display_order: displayOrder,
      status: STATUS.ACTIVE,
    },
    create: {
      key,
      name,
      entity_type: VEHICLE_ENTITY_TYPE,
      is_additional: isAdditional,
      default_security_level: defaultSecurityLevel,
      is_required: !isAdditional,
      display_order: displayOrder,
      status: STATUS.ACTIVE,
    },
  });
};

const buildDocumentDto = (entityDocument: any) => {
  const { entity_document_id, status: entityStatus, document } = entityDocument;
  const isPredefined = !document.document_type.is_additional;
  return {
    vehicle_document_id: entity_document_id,
    document_id: document.document_id,
    document_key: document.document_key,
    document_name: document.display_name,
    is_predefined: isPredefined,
    is_active:
      entityStatus === STATUS.ACTIVE && document.status !== STATUS.INACTIVE,
    file_url: document.file_path,
    file_name: document.original_filename,
    mime_type: document.mime_type,
    security_level: document.security_level,
    status:
      entityStatus !== STATUS.ACTIVE || document.status === STATUS.INACTIVE
        ? STATUS.INACTIVE
        : getDocumentStatus(!!document.file_path, document.expiration_date),
    issue_date: document.issue_date,
    expiration_date: document.expiration_date,
    notes: document.notes,
  };
};

const getVehicleDocumentsByVehicleId = async (vehicleIds: number[]) => {
  const map = new Map<number, any[]>();
  if (!vehicleIds.length) return map;
  const entityDocuments = await prisma.entityDocument.findMany({
    where: {
      entity_type: VEHICLE_ENTITY_TYPE,
      entity_id: { in: vehicleIds },
      status: STATUS.ACTIVE,
      document: { status: { not: STATUS.INACTIVE } },
    },
    include: { document: { include: { document_type: true } } },
    orderBy: [{ created_at: SortOrder.desc }],
  });
  for (const item of entityDocuments) {
    const curr = map.get(item.entity_id) ?? [];
    curr.push(buildDocumentDto(item));
    map.set(item.entity_id, curr);
  }
  return map;
};

const attachDocumentsToVehicle = <T extends Record<string, any>>(
  vehicle: T | null,
  vehicleDocuments: any[] = [],
) => {
  if (!vehicle) return null;
  const docsByKey = new Map<string, any>();

  for (const document of vehicleDocuments) {
    if (!docsByKey.has(document.document_key))
      docsByKey.set(document.document_key, document);
  }

  const predefinedDocuments = PREDEFINED_VEHICLE_DOCUMENTS.map(
    (definition) =>
      docsByKey.get(definition.key) ?? {
        vehicle_document_id: null,
        document_id: null,
        document_key: definition.key,
        document_name: definition.name,
        is_predefined: true,
        is_active: true,
        file_url: null,
        file_name: null,
        mime_type: null,
        security_level: definition.defaultSecurityLevel,
        status: STATUS.NOT_UPLOADED,
        issue_date: new Date(),
        expiration_date: new Date(),
        notes: null,
      },
  );
  const additionalDocuments = vehicleDocuments.filter(
    (document) =>
      !PREDEFINED_VEHICLE_DOCUMENTS.some(
        (item) => item.key === document.document_key,
      ),
  );
  return {
    ...vehicle,
    documents: [...predefinedDocuments, ...additionalDocuments],
  };
};

const toVehicleDto = (vehicle: any, docs: any[] = []) =>
  attachDocumentsToVehicle(
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
    },
    docs,
  );

const listVehicles = async () => {
  const vehicles = await prisma.vehicle.findMany({
    include: vehicleInclude,
    orderBy: [{ created_at: SortOrder.desc }, { vehicle_id: SortOrder.desc }],
  });
  const ids = vehicles.map((vehicle) => vehicle.vehicle_id);
  const docsMap = await getVehicleDocumentsByVehicleId(ids);
  return vehicles.map((vehicle) =>
    toVehicleDto(vehicle, docsMap.get(vehicle.vehicle_id) ?? []),
  );
};

const getVehicleById = async (vehicleId: number) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: vehicleId },
    include: vehicleInclude,
  });
  const docsMap = await getVehicleDocumentsByVehicleId(
    vehicle ? [vehicle.vehicle_id] : [],
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
    const documentType = await ensureVehicleDocumentType({
      documentKey: isPredefined
        ? document.document_key
        : ADDITIONAL_VEHICLE_DOCUMENT.key,
      documentName: document.document_name,
      isPredefined,
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

  const documentType = await ensureVehicleDocumentType({
    documentKey: isPredefined ? documentKey : ADDITIONAL_VEHICLE_DOCUMENT.key,
    documentName,
    isPredefined,
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
