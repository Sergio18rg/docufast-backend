import path from "node:path";
import fs from "node:fs/promises";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { Prisma } from "../../generated/prisma/client";
import {
  ADDITIONAL_WORKER_DOCUMENT,
  DEFAULT_SECURITY_LEVEL,
  MESSAGES,
  PREDEFINED_WORKER_DOCUMENTS,
  WORKER_ENTITY_TYPE,
} from "./constants";
import { WorkerDocumentInput, WorkerPayload } from "./types";
import { getDocumentStatus } from "./utils";
import { trim, trimOptional, toValidDate } from "../../utils";
import { ROLES, STATUS } from "../../constants";
import { SortOrder } from "../../generated/prisma/internal/prismaNamespace";

// What is included when fetching workers from the database
// (we also send the client and current vehicle data)
const workerInclude = {
  client: true,
  current_vehicle: true,
};

const getWorkerFullName = ({
  firstName,
  lastName1,
  lastName2,
}: {
  firstName: string;
  lastName1: string;
  lastName2?: string | null;
}) =>
  [trim(firstName), trim(lastName1), trimOptional(lastName2)]
    .filter(Boolean)
    .join(" ");

const buildTemporaryPassword = ({
  firstName,
  companyWorkerCode,
}: {
  firstName: string;
  companyWorkerCode: string;
}) => `${trim(firstName)}${trim(companyWorkerCode)}`;

const getWorkerRoleId = async () => {
  const role = await prisma.role.findUnique({ where: { name: ROLES.WORKER } });
  if (!role) throw new Error(MESSAGES.ERROR.WORKER_ROLE_NOT_FOUND);
  return role.role_id;
};

const syncWorkerUser = async ({
  tx,
  workerId,
  userId,
  email,
  firstName,
  lastName1,
  lastName2,
  status,
  companyWorkerCode,
}: {
  tx: Prisma.TransactionClient;
  workerId: number;
  userId?: number | null;
  email: string;
  firstName: string;
  lastName1: string;
  lastName2?: string | null;
  status: string;
  companyWorkerCode: string;
}) => {
  const normalizedEmail = trim(email).toLowerCase();
  const fullName = getWorkerFullName({ firstName, lastName1, lastName2 });

  if (userId) {
    return tx.user.update({
      where: { user_id: userId },
      data: {
        email: normalizedEmail,
        full_name: fullName,
        status,
      },
    });
  }

  const password_hash = await bcrypt.hash(
    buildTemporaryPassword({ firstName, companyWorkerCode }),
    10,
  );
  const roleId = await getWorkerRoleId();

  const createdUser = await tx.user.create({
    data: {
      email: normalizedEmail,
      password_hash,
      full_name: fullName,
      status,
      must_change_password: true,
      role_id: roleId,
    },
  });

  await tx.worker.update({
    where: { worker_id: workerId },
    data: { user_id: createdUser.user_id },
  });

  return createdUser;
};

const ensureWorkerDocumentType = async ({
  documentKey,
  documentName,
  isPredefined,
}: {
  documentKey: string;
  documentName: string;
  isPredefined?: boolean;
}) => {
  const definition = isPredefined
    ? PREDEFINED_WORKER_DOCUMENTS.find((item) => item.key === documentKey)
    : ADDITIONAL_WORKER_DOCUMENT;

  const key = definition?.key ?? documentKey;
  const name = definition?.name ?? documentName;
  const isAdditional = definition?.key === ADDITIONAL_WORKER_DOCUMENT.key;
  const displayOrder = definition?.displayOrder ?? 999;
  const defaultSecurityLevel =
    definition?.defaultSecurityLevel ?? DEFAULT_SECURITY_LEVEL;

  // If exists, update, if not create
  return prisma.documentType.upsert({
    where: { entity_type_key: { entity_type: WORKER_ENTITY_TYPE, key } },
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
      entity_type: WORKER_ENTITY_TYPE,
      is_additional: isAdditional,
      default_security_level: defaultSecurityLevel,
      is_required: !isAdditional,
      display_order: displayOrder,
      status: STATUS.ACTIVE,
    },
  });
};

const buildDocumentDto = (entityDocument: any) => {
  const {
    entity_document_id,
    status: entityStatus,
    created_at,
    updated_at,
    document: {
      document_id,
      document_key,
      display_name,
      file_path,
      original_filename,
      mime_type,
      security_level,
      status: documentStatus,
      issue_date,
      expiration_date,
      notes,
      document_type: { is_additional },
    },
  } = entityDocument;

  const isPredefined = !is_additional;

  return {
    worker_document_id: entity_document_id,
    document_id: document_id,
    document_key: document_key,
    document_name: display_name,
    is_predefined: isPredefined,
    is_active:
      entityStatus === STATUS.ACTIVE && documentStatus !== STATUS.INACTIVE,
    file_url: file_path,
    file_name: original_filename,
    mime_type: mime_type,
    security_level: security_level,
    status:
      entityStatus !== STATUS.ACTIVE || documentStatus === STATUS.INACTIVE
        ? STATUS.INACTIVE
        : getDocumentStatus(!!file_path, expiration_date),
    issue_date: issue_date,
    expiration_date: expiration_date,
    notes: notes,
    created_at: created_at,
    updated_at: updated_at,
  };
};

const getWorkerDocumentsByWorkerId = async (workerIds: number[]) => {
  const documentsByWorkerId = new Map<number, any[]>();

  if (!workerIds.length) return documentsByWorkerId;

  const entityDocuments = await prisma.entityDocument.findMany({
    where: {
      entity_type: WORKER_ENTITY_TYPE,
      entity_id: { in: workerIds },
      status: STATUS.ACTIVE,
      document: { status: { not: STATUS.INACTIVE } },
    },
    include: {
      document: {
        include: { document_type: true },
      },
    },
    orderBy: [{ created_at: SortOrder.desc }],
  });

  for (const item of entityDocuments) {
    const current = documentsByWorkerId.get(item.entity_id) ?? [];
    current.push(buildDocumentDto(item));
    documentsByWorkerId.set(item.entity_id, current);
  }
  return documentsByWorkerId;
};

const attachDocumentsToWorker = <T extends Record<string, any>>(
  worker: T | null,
  workerDocuments: any[] = [],
) => {
  if (!worker) return null;

  const documentsByKey = new Map<string, any>();
  for (const document of workerDocuments) {
    const notExists = !documentsByKey.has(document.document_key);
    if (notExists) documentsByKey.set(document.document_key, document);
  }

  // If predefined documents are not uploaded, we still add them as not uploaded, so the frontend can show them and allow uploading
  const predefinedDocuments = PREDEFINED_WORKER_DOCUMENTS.map((definition) => {
    const { key, name, defaultSecurityLevel } = definition;
    const existing = documentsByKey.get(key);
    if (existing) return existing;

    const PLACEHOLDER_DOCUMENT = {
      worker_document_id: null,
      document_id: null,
      document_key: key,
      document_name: name,
      is_predefined: true,
      is_active: true,
      file_url: null,
      file_name: null,
      mime_type: null,
      security_level: defaultSecurityLevel,
      status: STATUS.NOT_UPLOADED,
      issue_date: new Date(),
      expiration_date: new Date(),
      notes: null,
      created_at: null,
      updated_at: null,
    };
    return PLACEHOLDER_DOCUMENT;
  });

  const additionalDocuments = workerDocuments.filter(
    (document) =>
      !PREDEFINED_WORKER_DOCUMENTS.some(
        (item) => item.key === document.document_key,
      ),
  );

  return {
    ...worker,
    documents: [...predefinedDocuments, ...additionalDocuments],
  };
};

const listWorkers = async () => {
  const workers = await prisma.worker.findMany({
    include: workerInclude,
    orderBy: [{ created_at: SortOrder.desc }, { worker_id: SortOrder.desc }],
  });

  const workerIds = workers.map((worker) => worker.worker_id);

  const documentMap = await getWorkerDocumentsByWorkerId(workerIds);

  return workers.map((worker) =>
    attachDocumentsToWorker(worker, documentMap.get(worker.worker_id) ?? []),
  );
};

const getWorkerById = async (workerId: number) => {
  const worker = await prisma.worker.findUnique({
    where: { worker_id: workerId },
    include: workerInclude,
  });
  const documentMap = await getWorkerDocumentsByWorkerId(
    worker ? [worker.worker_id] : [],
  );
  return attachDocumentsToWorker(worker, documentMap.get(workerId) ?? []);
};

const sanitizeCurrentVehicleId = async (
  vehicleId: number | null | undefined,
) => {
  if (!vehicleId) return null;
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: vehicleId },
  });
  const isActive = vehicle?.status === STATUS.ACTIVE;
  if (!vehicle || !isActive) return null;
  return vehicleId;
};

const syncVehicleAssignment = async (
  tx: Prisma.TransactionClient,
  workerId: number,
  nextVehicleId: number | null,
) => {
  const activeAssignments = await tx.workerVehicleAssignment.findMany({
    where: { worker_id: workerId, status: STATUS.ACTIVE },
    orderBy: [{ start_datetime: SortOrder.desc }],
  });

  for (const assignment of activeAssignments) {
    const shouldClose =
      !nextVehicleId || assignment.vehicle_id !== nextVehicleId;
    if (shouldClose) {
      await tx.workerVehicleAssignment.update({
        where: {
          worker_vehicle_assignment_id: assignment.worker_vehicle_assignment_id,
        },
        data: { status: STATUS.INACTIVE, end_datetime: new Date() },
      });
    }
  }

  if (!nextVehicleId) return;

  const stillActive = activeAssignments.find(
    (assignment) =>
      assignment.vehicle_id === nextVehicleId &&
      assignment.status === STATUS.ACTIVE,
  );

  if (!stillActive) {
    await tx.workerVehicleAssignment.create({
      data: {
        worker_id: workerId,
        vehicle_id: nextVehicleId,
        start_datetime: new Date(),
        status: STATUS.ACTIVE,
      },
    });
  }
};

const syncWorkerDocuments = async (
  tx: Prisma.TransactionClient,
  workerId: number,
  documents: WorkerDocumentInput[],
) => {
  const activeEntityDocuments = await tx.entityDocument.findMany({
    where: {
      entity_type: WORKER_ENTITY_TYPE,
      entity_id: workerId,
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
    const documentType = await ensureWorkerDocumentType({
      documentKey: isPredefined
        ? document.document_key
        : ADDITIONAL_WORKER_DOCUMENT.key,
      documentName: document.document_name,
      isPredefined,
    });

    // If the document exists, we update it
    if (
      document.worker_document_id &&
      currentByEntityDocumentId.has(document.worker_document_id)
    ) {
      const existing = currentByEntityDocumentId.get(
        document.worker_document_id,
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
    // if the document does not exist, but it is identified by document_key then we update the existing document with the new data,
    // this allows to keep the same document if the user just wants to update the info without uploading a new file,
    // and also allows to upload a file for a predefined document that was not uploaded before
    const isDocumentKeyExisting = currentByDocumentKey.has(
      document.document_key,
    );
    if (isDocumentKeyExisting) {
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
        entity_type: WORKER_ENTITY_TYPE,
        entity_id: workerId,
        status: STATUS.ACTIVE,
      },
    });
  }
};

const createWorker = async (payload: WorkerPayload) => {
  const {
    company_worker_code,
    first_name,
    last_name_1,
    last_name_2,
    email,
    phone,
    document_number,
    social_security_number,
    birth_date,
    address,
    emergency_contact_name,
    emergency_contact_phone,
    contract_start_date,
    contract_end_date,
    status,
    notes,
    client_id,
    current_vehicle_id,
    documents,
  } = payload;

  const normalizedStatus = trimOptional(status) ?? STATUS.ACTIVE;
  const safeCurrentVehicleId = await sanitizeCurrentVehicleId(
    normalizedStatus === STATUS.INACTIVE ? null : (current_vehicle_id ?? null),
  );

  const worker = await prisma.worker.create({
    data: {
      company_worker_code: trim(company_worker_code),
      first_name: trim(first_name),
      last_name_1: trim(last_name_1),
      last_name_2: trimOptional(last_name_2),
      email: trim(email)?.toLowerCase(),
      phone: trimOptional(phone),
      document_number: trimOptional(document_number),
      social_security_number: trimOptional(social_security_number),
      birth_date: toValidDate(birth_date),
      address: trimOptional(address),
      emergency_contact_name: trimOptional(emergency_contact_name),
      emergency_contact_phone: trimOptional(emergency_contact_phone),
      contract_start_date: toValidDate(contract_start_date),
      contract_end_date: toValidDate(contract_end_date),
      status: normalizedStatus,
      notes: trimOptional(notes),
      client_id:
        normalizedStatus === STATUS.INACTIVE ? null : (client_id ?? null),
      current_vehicle_id: safeCurrentVehicleId,
    },
  });

  const docs = documents ?? [];

  await prisma.$transaction(async (tx) => {
    await syncWorkerUser({
      tx,
      workerId: worker.worker_id,
      email: email,
      firstName: first_name,
      lastName1: last_name_1,
      lastName2: last_name_2,
      status: normalizedStatus,
      companyWorkerCode: company_worker_code,
    });
    await syncVehicleAssignment(tx, worker.worker_id, safeCurrentVehicleId);
    await syncWorkerDocuments(tx, worker.worker_id, docs);
  });
  return getWorkerById(worker.worker_id);
};

const updateWorker = async (workerId: number, payload: WorkerPayload) => {
  const {
    company_worker_code,
    first_name,
    last_name_1,
    last_name_2,
    email,
    phone,
    document_number,
    social_security_number,
    birth_date,
    address,
    emergency_contact_name,
    emergency_contact_phone,
    contract_start_date,
    contract_end_date,
    status,
    notes,
    client_id,
    current_vehicle_id,
    documents,
  } = payload;

  const existingWorker = await prisma.worker.findUnique({
    where: { worker_id: workerId },
    select: { user_id: true },
  });
  if (!existingWorker) throw new Error(MESSAGES.ERROR.WORKER_NOT_FOUND);

  const normalizedStatus = trimOptional(status) ?? STATUS.ACTIVE;
  const safeCurrentVehicleId = await sanitizeCurrentVehicleId(
    normalizedStatus === STATUS.INACTIVE ? null : (current_vehicle_id ?? null),
  );

  await prisma.$transaction(async (tx) => {
    await tx.worker.update({
      where: { worker_id: workerId },
      data: {
        company_worker_code: trim(company_worker_code),
        first_name: trim(first_name),
        last_name_1: trim(last_name_1),
        last_name_2: trimOptional(last_name_2),
        email: trimOptional(email)?.toLowerCase(),
        phone: trimOptional(phone),
        document_number: trimOptional(document_number),
        social_security_number: trimOptional(social_security_number),
        birth_date: toValidDate(birth_date),
        address: trimOptional(address),
        emergency_contact_name: trimOptional(emergency_contact_name),
        emergency_contact_phone: trimOptional(emergency_contact_phone),
        contract_start_date: toValidDate(contract_start_date),
        contract_end_date: toValidDate(contract_end_date),
        status: normalizedStatus,
        notes: trimOptional(notes),
        client_id:
          normalizedStatus === STATUS.INACTIVE ? null : (client_id ?? null),
        current_vehicle_id: safeCurrentVehicleId,
      },
    });

    await syncWorkerUser({
      tx,
      workerId,
      userId: existingWorker.user_id,
      email: email,
      firstName: first_name,
      lastName1: last_name_1,
      lastName2: last_name_2,
      status: normalizedStatus,
      companyWorkerCode: company_worker_code,
    });

    const docs = documents ?? [];
    await syncVehicleAssignment(tx, workerId, safeCurrentVehicleId);
    await syncWorkerDocuments(tx, workerId, docs);
  });
  return getWorkerById(workerId);
};

const deactivateWorker = async (workerId: number) =>
  prisma.$transaction(async (tx) => {
    const worker = await tx.worker.findUnique({
      where: { worker_id: workerId },
      select: { user_id: true },
    });

    await tx.worker.update({
      where: { worker_id: workerId },
      data: {
        status: STATUS.INACTIVE,
        current_vehicle_id: null,
        client_id: null,
      },
    });

    if (worker?.user_id) {
      await tx.user.update({
        where: { user_id: worker.user_id },
        data: { status: STATUS.INACTIVE },
      });
    }

    await tx.workerVehicleAssignment.updateMany({
      where: { worker_id: workerId, status: STATUS.ACTIVE },
      data: { status: STATUS.INACTIVE, end_datetime: new Date() },
    });
  });

const restoreWorker = async (workerId: number) =>
  prisma.$transaction(async (tx) => {
    const worker = await tx.worker.findUnique({
      where: { worker_id: workerId },
      select: { user_id: true },
    });

    await tx.worker.update({
      where: { worker_id: workerId },
      data: { status: STATUS.ACTIVE },
    });

    if (worker?.user_id) {
      await tx.user.update({
        where: { user_id: worker.user_id },
        data: { status: STATUS.ACTIVE },
      });
    }
  });

const uploadDocumentFile = async ({
  workerId,
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
  workerId: number;
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
  const worker = await prisma.worker.findUnique({
    where: { worker_id: workerId },
  });
  if (!worker) throw new Error("Worker not found");

  const targetDir = path.join(
    process.cwd(),
    "uploads",
    "workers",
    String(workerId),
  );
  await fs.mkdir(targetDir, { recursive: true });

  const finalFileName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
  const finalPath = path.join(targetDir, finalFileName);
  await fs.writeFile(finalPath, file.buffer);

  const expiresAt = toValidDate(expirationDate) ?? new Date();
  const security = trimOptional(securityLevel) ?? DEFAULT_SECURITY_LEVEL;

  const documentType = await ensureWorkerDocumentType({
    documentKey: isPredefined ? documentKey : ADDITIONAL_WORKER_DOCUMENT.key,
    documentName,
    isPredefined,
  });

  // if replaceDocumentId search the doc and update it, if not, search by document key,
  // if is found, we update it, if not the document is created new, this allows to cover
  // the case when the user upload a document for a predefined document that was not
  // uploaded before, so it does not have an entity_document_id but it has the document_key
  const existing = replaceDocumentId
    ? await prisma.entityDocument.findFirst({
        where: {
          entity_document_id: replaceDocumentId,
          entity_type: WORKER_ENTITY_TYPE,
          entity_id: workerId,
          status: STATUS.ACTIVE,
        },
        include: { document: true },
      })
    : await prisma.entityDocument.findFirst({
        where: {
          entity_type: WORKER_ENTITY_TYPE,
          entity_id: workerId,
          status: STATUS.ACTIVE,
          document: {
            document_key: documentKey,
            status: { not: STATUS.INACTIVE },
          },
        },
        include: { document: true },
      });

  const documentExistWithFilePath = existing && !existing.document.file_path;
  if (documentExistWithFilePath) {
    await prisma.document.update({
      where: { document_id: existing.document.document_id },
      data: {
        original_filename: file.originalname,
        stored_filename: finalFileName,
        file_path: `/uploads/workers/${workerId}/${finalFileName}`,
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

  // if document exists and has a file we inactivate them before creating a new one
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
      file_path: `/uploads/workers/${workerId}/${finalFileName}`,
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
      entity_type: WORKER_ENTITY_TYPE,
      entity_id: workerId,
      status: STATUS.ACTIVE,
    },
  });
};

const removeWorkerDocument = async (
  workerId: number,
  workerDocumentId: number,
) => {
  const entityDocument = await prisma.entityDocument.findFirst({
    where: {
      entity_document_id: workerDocumentId,
      entity_type: WORKER_ENTITY_TYPE,
      entity_id: workerId,
      status: STATUS.ACTIVE,
    },
    include: { document: true },
  });
  if (!entityDocument) throw new Error("Document not found");

  await prisma.entityDocument.update({
    where: { entity_document_id: workerDocumentId },
    data: { status: STATUS.INACTIVE },
  });
  return prisma.document.update({
    where: { document_id: entityDocument.document_id },
    data: { status: STATUS.INACTIVE },
  });
};

export {
  listWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deactivateWorker,
  restoreWorker,
  uploadDocumentFile,
  removeWorkerDocument,
};
