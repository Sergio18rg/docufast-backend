import { MESSAGES } from "./constants";

const FIFTEEN_DAYS_IN_MS = 15 * 24 * 60 * 60 * 1000;

const getDocumentStatus = (hasFile: boolean, expirationDate?: Date | null) => {
  if (!hasFile) return MESSAGES.DOCUMENT_STATUS.NOT_UPLOADED;
  if (!expirationDate) return MESSAGES.DOCUMENT_STATUS.VALID;

  const now = new Date();
  const expiresAt = new Date(expirationDate);

  const isExpired = expiresAt.getTime() < now.getTime();
  if (isExpired) return MESSAGES.DOCUMENT_STATUS.EXPIRED;

  const expiresInLessThanFifteenDays =
    expiresAt.getTime() - now.getTime() <= FIFTEEN_DAYS_IN_MS;

  if (expiresInLessThanFifteenDays)
    return MESSAGES.DOCUMENT_STATUS.EXPIRING_SOON;

  return MESSAGES.DOCUMENT_STATUS.VALID;
};

export { getDocumentStatus };
