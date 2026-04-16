const VEHICLE_ENTITY_TYPE = "Vehicle";
const DEFAULT_SECURITY_LEVEL = "Private";

const PREDEFINED_VEHICLE_DOCUMENTS = [
  {
    key: "vehicle_contract",
    name: "Contract",
    displayOrder: 1,
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
  },
  {
    key: "itv",
    name: "ITV",
    displayOrder: 2,
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
  },
  {
    key: "technical_sheet",
    name: "Technical sheet",
    displayOrder: 3,
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
  },
  {
    key: "circulation_permit",
    name: "Circulation permit",
    displayOrder: 4,
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
  },
  {
    key: "regage",
    name: "REGAGE",
    displayOrder: 5,
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
  },
  {
    key: "certificate",
    name: "Certificate",
    displayOrder: 6,
    defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
  },
];

const ADDITIONAL_VEHICLE_DOCUMENT = {
  key: "additional",
  name: "Additional",
  displayOrder: 999,
  defaultSecurityLevel: DEFAULT_SECURITY_LEVEL,
  isAdditional: true,
};

const MESSAGES = {
  FETCH_VEHICLES_SUCCESS: "Vehicles fetched successfully",
  FETCH_VEHICLES_ERROR: "Unable to fetch vehicles",
  FETCH_VEHICLE_SUCCESS: "Vehicle fetched successfully",
  VEHICLE_CREATED: "Vehicle created successfully",
  VEHICLE_UPDATED: "Vehicle updated successfully",
  VEHICLE_DELETED: "Vehicle marked as inactive",
  VEHICLE_NOT_FOUND: "Vehicle not found",
  VEHICLE_SAVE_ERROR: "Unable to save vehicle",
  VEHICLE_RESTORED: "Vehicle restored successfully",
  DOCUMENT_UPLOADED: "Vehicle document uploaded successfully",
  DOCUMENT_REMOVED: "Vehicle document removed successfully",
  VALIDATE_PLATE: "Vehicle plate is required",
  VALIDATE_OWNER: "Company owner is required",
  VALIDATE_VEHICLE_TYPE: "Vehicle type is required",
};

export {
  VEHICLE_ENTITY_TYPE,
  DEFAULT_SECURITY_LEVEL,
  PREDEFINED_VEHICLE_DOCUMENTS,
  ADDITIONAL_VEHICLE_DOCUMENT,
  MESSAGES,
};
