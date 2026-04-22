import path from "node:path";
import fs from "node:fs/promises";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { Prisma } from "../../generated/prisma/client";
import { SortOrder } from "../../generated/prisma/internal/prismaNamespace";
import { ROLES, STATUS } from "../../constants";
import { trim, trimOptional, toValidDate } from "../../utils";
import { getDocumentStatus } from "../workers/utils";
import {
  ADDITIONAL_CLIENT_DOCUMENT,
  CLIENT_ENTITY_TYPE,
  DEFAULT_SECURITY_LEVEL,
  MESSAGES,
  PREDEFINED_CLIENT_DOCUMENTS,
} from "./constants";
import { ClientDocumentInput, ClientPayload } from "./types";

const clientInclude = {
  workers: {
    where: { status: { not: STATUS.INACTIVE } },
    orderBy: [{ first_name: SortOrder.asc }, { last_name_1: SortOrder.asc }],
  },
};

const getExternalRoleId = async () => {
  const role = await prisma.role.findUnique({
    where: { name: ROLES.EXTERNAL },
  });
  if (!role) throw new Error(MESSAGES.ERROR.EXTERNAL_ROLE_NOT_FOUND);
  return role.role_id;
};

const buildTemporaryPassword = ({
  name,
  clientCode,
}: {
  name: string;
  clientCode: string;
}) => `${trim(name)}${trim(clientCode)}`;

const syncClientUser = async ({
  tx,
  clientId,
  userId,
  email,
  businessName,
  status,
  clientCode,
}: {
  tx: Prisma.TransactionClient;
  clientId: number;
  userId?: number | null;
  email: string;
  businessName: string;
  status: string;
  clientCode: string;
}) => {
  const normalizedEmail = trim(email).toLowerCase();
  if (userId) {
    return tx.user.update({
      where: { user_id: userId },
      data: { email: normalizedEmail, full_name: trim(businessName), status },
    });
  }
  const password_hash = await bcrypt.hash(
    buildTemporaryPassword({ name: businessName, clientCode }),
    10,
  );
  const roleId = await getExternalRoleId();
  const createdUser = await tx.user.create({
    data: {
      email: normalizedEmail,
      password_hash,
      full_name: trim(businessName),
      status,
      must_change_password: true,
      role_id: roleId,
    },
  });

  await tx.client.update({
    where: { client_id: clientId },
    data: { user_id: createdUser.user_id },
  });
  return createdUser;
};

const ensureClientDocumentType = async ({
  documentKey,
  documentName,
  isPredefined,
}: {
  documentKey: string;
  documentName: string;
  isPredefined?: boolean;
}) => {
  const definition = isPredefined
    ? PREDEFINED_CLIENT_DOCUMENTS.find((item) => item.key === documentKey)
    : ADDITIONAL_CLIENT_DOCUMENT;
  const key = definition?.key ?? documentKey;
  const name = definition?.name ?? documentName;
  const isAdditional = definition?.key === ADDITIONAL_CLIENT_DOCUMENT.key;
  const displayOrder = definition?.displayOrder ?? 999;
  const defaultSecurityLevel =
    definition?.defaultSecurityLevel ?? DEFAULT_SECURITY_LEVEL;

  return prisma.documentType.upsert({
    where: { entity_type_key: { entity_type: CLIENT_ENTITY_TYPE, key } },
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
      entity_type: CLIENT_ENTITY_TYPE,
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
    client_document_id: entity_document_id,
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

const getClientDocumentsByIds = async (clientIds: number[]) => {
  const map = new Map<number, any[]>();
  if (!clientIds.length) return map;
  const entityDocuments = await prisma.entityDocument.findMany({
    where: {
      entity_type: CLIENT_ENTITY_TYPE,
      entity_id: { in: clientIds },
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

const attachDocumentsToClient = <T extends Record<string, any>>(
  client: T | null,
  clientDocuments: any[] = [],
) => {
  if (!client) return null;
  const docsByKey = new Map<string, any>();
  for (const document of clientDocuments)
    if (!docsByKey.has(document.document_key))
      docsByKey.set(document.document_key, document);

  const predefinedDocuments = PREDEFINED_CLIENT_DOCUMENTS.map(
    (definition) =>
      docsByKey.get(definition.key) ?? {
        client_document_id: null,
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
  const additionalDocuments = clientDocuments.filter(
    (document) =>
      !PREDEFINED_CLIENT_DOCUMENTS.some(
        (item) => item.key === document.document_key,
      ),
  );
  return {
    ...client,
    documents: [...predefinedDocuments, ...additionalDocuments],
  };
};

const toClientDto = (client: any, docs: any[] = []) =>
  attachDocumentsToClient(
    {
      ...client,
      current_workers: (client.workers ?? []).map((worker: any) => ({
        worker_id: worker.worker_id,
        first_name: worker.first_name,
        last_name_1: worker.last_name_1,
        full_name: `${worker.first_name} ${worker.last_name_1}`,
      })),
      current_workers_count: (client.workers ?? []).length,
    },
    docs,
  );

const listClients = async () => {
  const clients = await prisma.client.findMany({
    include: clientInclude,
    orderBy: [{ created_at: SortOrder.desc }, { client_id: SortOrder.desc }],
  });
  const ids = clients.map((client) => client.client_id);
  const docsMap = await getClientDocumentsByIds(ids);

  return clients.map((client) =>
    toClientDto(client, docsMap.get(client.client_id) ?? []),
  );
};

const getClientById = async (clientId: number) => {
  const client = await prisma.client.findUnique({
    where: { client_id: clientId },
    include: clientInclude,
  });

  const docsMap = await getClientDocumentsByIds(
    client ? [client.client_id] : [],
  );
  return toClientDto(client, docsMap.get(clientId) ?? []);
};

const syncClientDocuments = async (
  tx: Prisma.TransactionClient,
  clientId: number,
  documents: ClientDocumentInput[],
) => {
  const activeEntityDocuments = await tx.entityDocument.findMany({
    where: {
      entity_type: CLIENT_ENTITY_TYPE,
      entity_id: clientId,
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
    const documentType = await ensureClientDocumentType({
      documentKey: isPredefined
        ? document.document_key
        : ADDITIONAL_CLIENT_DOCUMENT.key,
      documentName: document.document_name,
      isPredefined,
    });

    if (
      document.client_document_id &&
      currentByEntityDocumentId.has(document.client_document_id)
    ) {
      const existing = currentByEntityDocumentId.get(
        document.client_document_id,
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
        entity_type: CLIENT_ENTITY_TYPE,
        entity_id: clientId,
        status: STATUS.ACTIVE,
      },
    });
  }
};

const createClient = async (payload: ClientPayload) => {
  const client = await prisma.client.create({
    data: {
      client_code: trim(payload.client_code),
      business_name: trim(payload.business_name),
      contact_email: trim(payload.contact_email).toLowerCase(),
      contact_phone: trimOptional(payload.contact_phone),
      badge_color: trim(payload.badge_color),
      contract_start_date: toValidDate(payload.contract_start_date),
      contract_end_date: toValidDate(payload.contract_end_date),
      status: trimOptional(payload.status) ?? STATUS.ACTIVE,
      notes: trimOptional(payload.notes),
    },
  });

  await prisma.$transaction(async (tx) => {
    await syncClientUser({
      tx,
      clientId: client.client_id,
      email: payload.contact_email,
      businessName: payload.business_name,
      status: trimOptional(payload.status) ?? STATUS.ACTIVE,
      clientCode: payload.client_code,
    });
    await syncClientDocuments(tx, client.client_id, payload.documents ?? []);
  });
  return getClientById(client.client_id);
};

const updateClient = async (clientId: number, payload: ClientPayload) => {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.client.findUnique({
      where: { client_id: clientId },
    });

    await tx.client.update({
      where: { client_id: clientId },
      data: {
        client_code: trim(payload.client_code),
        business_name: trim(payload.business_name),
        contact_email: trim(payload.contact_email).toLowerCase(),
        contact_phone: trimOptional(payload.contact_phone),
        badge_color: trim(payload.badge_color),
        contract_start_date: toValidDate(payload.contract_start_date),
        contract_end_date: toValidDate(payload.contract_end_date),
        status: trimOptional(payload.status) ?? STATUS.ACTIVE,
        notes: trimOptional(payload.notes),
      },
    });
    await syncClientUser({
      tx,
      clientId,
      userId: existing?.user_id,
      email: payload.contact_email,
      businessName: payload.business_name,
      status: trimOptional(payload.status) ?? STATUS.ACTIVE,
      clientCode: payload.client_code,
    });
    if ((trimOptional(payload.status) ?? STATUS.ACTIVE) === STATUS.INACTIVE) {
      await tx.worker.updateMany({
        where: { client_id: clientId },
        data: { client_id: null },
      });
    }
    await syncClientDocuments(tx, clientId, payload.documents ?? []);
  });
  return getClientById(clientId);
};

const deactivateClient = async (clientId: number) =>
  prisma.$transaction(async (tx) => {
    const client = await tx.client.update({
      where: { client_id: clientId },
      data: { status: STATUS.INACTIVE },
    });
    await tx.worker.updateMany({
      where: { client_id: clientId },
      data: { client_id: null },
    });
    if (client.user_id)
      await tx.user.update({
        where: { user_id: client.user_id },
        data: { status: STATUS.INACTIVE },
      });
  });

const activateClient = async (clientId: number) =>
  prisma.$transaction(async (tx) => {
    const client = await tx.client.update({
      where: { client_id: clientId },
      data: { status: STATUS.ACTIVE },
    });
    if (client.user_id)
      await tx.user.update({
        where: { user_id: client.user_id },
        data: { status: STATUS.ACTIVE },
      });
  });

const uploadClientDocumentFile = async ({
  clientId,
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
  clientId: number;
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
  const client = await prisma.client.findUnique({
    where: { client_id: clientId },
  });

  if (!client) throw new Error("Client not found");
  const targetDir = path.join(
    process.cwd(),
    "uploads",
    "clients",
    String(clientId),
  );
  await fs.mkdir(targetDir, { recursive: true });

  const finalFileName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
  const finalPath = path.join(targetDir, finalFileName);

  await fs.writeFile(finalPath, file.buffer);

  const expiresAt = toValidDate(expirationDate) ?? new Date();
  const security = trimOptional(securityLevel) ?? DEFAULT_SECURITY_LEVEL;
  const documentType = await ensureClientDocumentType({
    documentKey: isPredefined ? documentKey : ADDITIONAL_CLIENT_DOCUMENT.key,
    documentName,
    isPredefined,
  });

  const existing = replaceDocumentId
    ? await prisma.entityDocument.findFirst({
        where: {
          entity_document_id: replaceDocumentId,
          entity_type: CLIENT_ENTITY_TYPE,
          entity_id: clientId,
          status: STATUS.ACTIVE,
        },
        include: { document: true },
      })
    : await prisma.entityDocument.findFirst({
        where: {
          entity_type: CLIENT_ENTITY_TYPE,
          entity_id: clientId,
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
        file_path: `/uploads/clients/${clientId}/${finalFileName}`,
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
      file_path: `/uploads/clients/${clientId}/${finalFileName}`,
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
      entity_type: CLIENT_ENTITY_TYPE,
      entity_id: clientId,
      status: STATUS.ACTIVE,
    },
  });
};

const removeClientDocument = async (
  clientId: number,
  clientDocumentId: number,
) => {
  const entityDocument = await prisma.entityDocument.findFirst({
    where: {
      entity_document_id: clientDocumentId,
      entity_type: CLIENT_ENTITY_TYPE,
      entity_id: clientId,
      status: STATUS.ACTIVE,
    },
    include: { document: true },
  });

  if (!entityDocument) throw new Error("Document not found");

  await prisma.entityDocument.update({
    where: { entity_document_id: clientDocumentId },
    data: { status: STATUS.INACTIVE },
  });
  return prisma.document.update({
    where: { document_id: entityDocument.document_id },
    data: { status: STATUS.INACTIVE },
  });
};

export {
  listClients,
  getClientById,
  createClient,
  updateClient,
  deactivateClient,
  activateClient,
  uploadClientDocumentFile,
  removeClientDocument,
};
