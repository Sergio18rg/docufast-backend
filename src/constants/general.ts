const STATUS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ABSENCE: "Absence",
  NOT_UPLOADED: "Not uploaded",
};

const DEFAULT_SECURITY_LEVEL = "Private";

const ADDITIONAL_DOCUMENT_CONFIG = {
  key: "additional",
  name: "Additional",
  displayOrder: 999,
  defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
  isAdditional: true,
};

const FIFTEEN_DAYS_IN_MS = 15 * 24 * 60 * 60 * 1000;

const DOCUMENT_STATUS = {
  NOT_UPLOADED: "Not uploaded",
  VALID: "Valid",
  EXPIRED: "Expired",
  EXPIRING_SOON: "Expiring soon",
};

export {
  STATUS,
  DEFAULT_SECURITY_LEVEL,
  ADDITIONAL_DOCUMENT_CONFIG,
  FIFTEEN_DAYS_IN_MS,
  DOCUMENT_STATUS,
};
