import { prisma } from "../lib/prisma";
import { STATUS, DEFAULT_SECURITY_LEVEL } from "../constants";
import { SortOrder } from "../generated/prisma/internal/prismaNamespace";
import { trim } from "./global";

const ensureDocumentType = async ({
  entityType,
  documentKey,
  documentName,
  isPredefined,
  predefinedDocuments,
  additionalDocumentConfig,
}: {
  entityType: string;
  documentKey: string;
  documentName: string;
  isPredefined?: boolean;
  predefinedDocuments: Array<{
    key: string;
    name: string;
    defaultSecurityLevel: string;
    displayOrder: number;
  }>;
  additionalDocumentConfig: {
    key: string;
    name: string;
    displayOrder: number;
    defaultSecurityLevel: string;
    isAdditional: boolean;
  };
}) => {
  const definition = isPredefined
    ? predefinedDocuments.find((item) => item.key === documentKey)
    : additionalDocumentConfig;

  const key = definition?.key ?? documentKey;
  const name = definition?.name ?? documentName;
  const isAdditional = definition?.key === additionalDocumentConfig.key;
  const displayOrder = definition?.displayOrder ?? 999;
  const defaultSecurityLevel =
    definition?.defaultSecurityLevel ?? DEFAULT_SECURITY_LEVEL;

  return prisma.documentType.upsert({
    where: { entity_type_key: { entity_type: entityType, key } },
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
      entity_type: entityType,
      is_additional: isAdditional,
      default_security_level: defaultSecurityLevel,
      is_required: !isAdditional,
      display_order: displayOrder,
      status: STATUS.ACTIVE,
    },
  });
};

const buildGenericDocumentDto = (
  entityDocument: any,
  documentIdFieldName: string,
  getDocumentStatus: (hasFile: boolean, expirationDate?: Date | null) => string,
) => {
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
    [documentIdFieldName]: entity_document_id,
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

const getDocumentsByEntityIds = async (
  entityType: string,
  entityIds: number[],
  buildDocumentDto: (entityDocument: any) => any,
) => {
  const map = new Map<number, any[]>();
  if (!entityIds.length) return map;

  const entityDocuments = await prisma.entityDocument.findMany({
    where: {
      entity_type: entityType,
      entity_id: { in: entityIds },
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
    const current = map.get(item.entity_id) ?? [];
    current.push(buildDocumentDto(item));
    map.set(item.entity_id, current);
  }
  return map;
};

const attachDocumentsToEntity = <T extends Record<string, any>>(
  entity: T | null,
  options: {
    predefinedDocuments: Array<{
      key: string;
      name: string;
      defaultSecurityLevel: string;
    }>;
    includePlaceholders?: boolean;
    documentIdFieldName: string | null;
  },
  documents: any[] = [],
) => {
  if (!entity) return null;

  const documentsByKey = new Map<string, any>();
  for (const document of documents) {
    const notExists = !documentsByKey.has(document.document_key);
    if (notExists) documentsByKey.set(document.document_key, document);
  }

  const includePlaceholders = options.includePlaceholders ?? true;
  if (!includePlaceholders) {
    return {
      ...entity,
      documents,
    };
  }

  const predefinedDocuments = options.predefinedDocuments.map((definition) => {
    const { key, name, defaultSecurityLevel } = definition;
    const existing = documentsByKey.get(key);
    if (existing) return existing;

    const placeholder: any = {
      [options.documentIdFieldName || "entity_document_id"]: null,
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
    return placeholder;
  });

  const additionalDocuments = documents.filter(
    (document) =>
      !options.predefinedDocuments.some(
        (item) => item.key === document.document_key,
      ),
  );

  return {
    ...entity,
    documents: [...predefinedDocuments, ...additionalDocuments],
  };
};

const buildTemporaryPassword = (parts: string[]) => {
  return parts.map((part) => trim(part)).join("");
};

export {
  ensureDocumentType,
  buildGenericDocumentDto,
  getDocumentsByEntityIds,
  attachDocumentsToEntity,
  buildTemporaryPassword,
};
