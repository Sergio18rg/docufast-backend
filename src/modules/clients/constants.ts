const CLIENT_ENTITY_TYPE = "Client";
const DEFAULT_SECURITY_LEVEL = "Private";

const PREDEFINED_CLIENT_DOCUMENTS = [
  {
    key: "client_contract",
    name: "Contract",
    displayOrder: 1,
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
  },
];

const ADDITIONAL_CLIENT_DOCUMENT = {
  key: "additional",
  name: "Additional",
  isAdditional: true,
  displayOrder: 999,
  defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
};

const MESSAGES = {
  FETCH_CLIENTS_SUCCESS: "Clients fetched successfully",
  FETCH_CLIENTS_ERROR: "Unable to fetch clients",
  FETCH_CLIENT_SUCCESS: "Client fetched successfully",
  CLIENT_CREATED: "Client created successfully",
  CLIENT_UPDATED: "Client updated successfully",
  CLIENT_DELETED: "Client marked as inactive successfully",
  CLIENT_RESTORED: "Client restored successfully",
  CLIENT_SAVE_ERROR: "Unable to save client",
  CLIENT_NOT_FOUND: "Client not found",
  DOCUMENT_UPLOADED: "Client document uploaded successfully",
  DOCUMENT_REMOVED: "Client document removed successfully",
  VALIDATE_ID: "Client ID is required",
  VALIDATE_NAME: "Client name is required",
  VALIDATE_EMAIL: "Client email is required",
  VALIDATE_COLOR: "Corporate color is required",
  ERROR: {
    EXTERNAL_ROLE_NOT_FOUND: "External role not found",
  },
};

export {
  CLIENT_ENTITY_TYPE,
  DEFAULT_SECURITY_LEVEL,
  PREDEFINED_CLIENT_DOCUMENTS,
  ADDITIONAL_CLIENT_DOCUMENT,
  MESSAGES,
};
