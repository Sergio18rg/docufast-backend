import { DOCUMENT_STATUS, FIFTEEN_DAYS_IN_MS } from "../constants";

const trim = (value: string) => value.trim();

const trimOptional = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ?? null;
};

const toValidDate = (value?: string | Date | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  return fallback;
};

const getDocumentStatus = (hasFile: boolean, expirationDate?: Date | null) => {
  if (!hasFile) return DOCUMENT_STATUS.NOT_UPLOADED;
  if (!expirationDate) return DOCUMENT_STATUS.VALID;

  const now = new Date();
  const expiresAt = new Date(expirationDate);

  const isExpired = expiresAt.getTime() < now.getTime();
  if (isExpired) return DOCUMENT_STATUS.EXPIRED;

  const expiresInLessThanFifteenDays =
    expiresAt.getTime() - now.getTime() <= FIFTEEN_DAYS_IN_MS;

  if (expiresInLessThanFifteenDays) return DOCUMENT_STATUS.EXPIRING_SOON;

  return DOCUMENT_STATUS.VALID;
};

export { trim, trimOptional, toValidDate, getErrorMessage, getDocumentStatus };
