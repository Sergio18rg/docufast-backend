const WORKER_ENTITY_TYPE = "Worker";

const WORKER_STATUSES = ["Active", "Absence", "Inactive"];

const SECURITY_LEVELS = ["Internal", "Private", "External"];

const DEFAULT_SECURITY_LEVEL = "Private";

const PREDEFINED_WORKER_DOCUMENTS = [
  {
    key: "identity_document",
    name: "Identity document",
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
    displayOrder: 10,
  },
  {
    key: "worker_photo",
    name: "Photo",
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
    displayOrder: 20,
  },
  {
    key: "employment_contract",
    name: "Contract",
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
    displayOrder: 30,
  },
  {
    key: "driver_license",
    name: "Driving licence",
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
    displayOrder: 40,
  },
  {
    key: "social_security_registration",
    name: "Social Security registration",
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
    displayOrder: 50,
  },
  {
    key: "driver_report",
    name: "Driver report",
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
    displayOrder: 60,
  },
];

const ADDITIONAL_WORKER_DOCUMENT = {
  key: "additional",
  name: "Additional",
  defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
  displayOrder: 999,
  isAdditional: true,
};

const VEHICLE_TYPE = {
  Dry: { label: "Dry", color: "#ced3db" },
  Reefer: { label: "Reefer", color: "#9be0e8" },
  Truck: { label: "Truck", color: "#e8be9b" },
  Other: { label: "Other", color: "#b59be8" },
};

const MESSAGES = {
  DOCUMENT_STATUS: {
    NOT_UPLOADED: "Not uploaded",
    VALID: "Valid",
    EXPIRED: "Expired",
    EXPIRING_SOON: "Expiring soon",
  },
  REQUIRED: {
    COMPANY_CODE: "Company worker code is required",
    NAME: "First name is required",
    FIRST_SURNAME: "First surname is required",
    FILE: "A file is required",
    ID: "Invalid ID",
  },
  SUCCESS: {
    WORKER_CREATED: "Worker created successfully",
    WORKER_UPDATED: "Worker updated successfully",
    WORKER_DELETED: "Worker marked as inactive successfully",
    WORKERS_FETCHED: "Workers fetched successfully",
    WORKER_FETCHED: "Worker fetched successfully",
    DOCUMENT_UPLOADED: "Document uploaded successfully",
    DOCUMENT_REMOVED: "Document removed successfully",
  },
  ERROR: {
    WORKER_CREATION_FAILED: "Unable to create worker",
    WORKER_UPDATE_FAILED: "Unable to update worker",
    WORKER_DELETION_FAILED: "Unable to delete worker",
    WORKERS_FETCH_FAILED: "Unable to fetch workers",
    WORKER_FETCH_FAILED: "Unable to fetch worker",
    DOCUMENT_UPLOAD_FAILED: "Unable to upload document",
    DOCUMENT_REMOVAL_FAILED: "Unable to remove document",
    WORKER_NOT_FOUND: "Worker not found",
  },
};

export {
  WORKER_STATUSES,
  SECURITY_LEVELS,
  PREDEFINED_WORKER_DOCUMENTS,
  ADDITIONAL_WORKER_DOCUMENT,
  VEHICLE_TYPE,
  MESSAGES,
  DEFAULT_SECURITY_LEVEL,
  WORKER_ENTITY_TYPE,
};
