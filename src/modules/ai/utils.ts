import path from "node:path";
import fs from "node:fs/promises";
import {
  ExtractDocumentInput,
  ExtractableEntityType,
  ExtractionResponse,
} from "./types";
import {
  ALLOWED_FIELDS_BY_ENTITY,
  ENTITY_TYPES,
  INSTRUCTIONS,
} from "./constants";
import { trimOptional } from "../../utils";

const safeJsonParse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const normalizeExtractedValue = (value?: string | null) =>
  trimOptional(value) ?? undefined;

const normalizeExtractedDate = (value?: string | null) => {
  const normalized = trimOptional(value);
  if (!normalized) return undefined;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString().slice(0, 10);
};

const normalizeExtractionResponse = (
  entityType: ExtractableEntityType,
  payload: any,
): ExtractionResponse => {
  const rawFields =
    payload?.fields && typeof payload.fields === "object" ? payload.fields : {};

  const rawDocuments = Array.isArray(payload?.documents)
    ? payload.documents
    : [];

  const dateFieldNames = new Set([
    "birth_date",
    "contract_start_date",
    "contract_end_date",
  ]);

  const fields = Object.fromEntries(
    ALLOWED_FIELDS_BY_ENTITY[entityType]
      .map((field) => {
        const rawValue = rawFields[field];

        const normalizedValue = dateFieldNames.has(field)
          ? normalizeExtractedDate(rawValue)
          : normalizeExtractedValue(rawValue);

        return normalizedValue ? [field, normalizedValue] : null;
      })
      .filter(Boolean) as Array<[string, string]>,
  );

  const documents = rawDocuments
    .map((document: any) => ({
      document_key: normalizeExtractedValue(document?.document_key),
      issue_date: normalizeExtractedDate(document?.issue_date),
      expiration_date: normalizeExtractedDate(document?.expiration_date),
    }))
    .filter((document: any) => document.document_key);

  return { fields, documents };
};

const buildSchemaInstructions = (entityType: ExtractableEntityType) => {
  if (entityType === ENTITY_TYPES.WORKER) return INSTRUCTIONS.SCHEMA.WORKER;

  if (entityType === ENTITY_TYPES.VEHICLE) return INSTRUCTIONS.SCHEMA.VEHICLE;

  return INSTRUCTIONS.SCHEMA.CLIENT;
};

const buildEntityInstructions = (entityType: ExtractableEntityType) => {
  if (entityType === ENTITY_TYPES.WORKER) return INSTRUCTIONS.ENTITY.WORKER;

  if (entityType === ENTITY_TYPES.VEHICLE) return INSTRUCTIONS.ENTITY.VEHICLE;

  return INSTRUCTIONS.ENTITY.CLIENT;
};

const buildPrompt = (
  entityType: ExtractableEntityType,
  documents: ExtractDocumentInput[],
) => {
  const documentList = documents
    .map(
      (document) =>
        `- key: ${document.document_key}; name: ${document.document_name}; predefined: ${document.is_predefined ? "yes" : "no"}`,
    )
    .join("\n");

  return [
    INSTRUCTIONS.GENERAL.ROLE,
    INSTRUCTIONS.GENERAL.ONLY_NECESSARY_DATA,
    INSTRUCTIONS.GENERAL.NOT_GUESS,
    INSTRUCTIONS.GENERAL.DATES,
    buildEntityInstructions(entityType),
    buildSchemaInstructions(entityType),
    `Documents provided:\n${documentList}`,
  ].join("\n\n");
};

const resolveStoredFilePath = (fileUrl?: string | null) => {
  if (!fileUrl) return null;
  const relativePath = fileUrl.replace(/^\//, "");

  return path.join(process.cwd(), relativePath);
};

const loadStoredDocument = async (document: ExtractDocumentInput) => {
  const filePath = resolveStoredFilePath(document.file_url);
  if (!filePath) return null;

  try {
    const buffer = await fs.readFile(filePath);
    return {
      document_key: document.document_key,
      document_name: document.document_name,
      mime_type: document.mime_type || "application/octet-stream",
      buffer,
    };
  } catch {
    return null;
  }
};

export {
  safeJsonParse,
  normalizeExtractionResponse,
  buildPrompt,
  loadStoredDocument,
};
