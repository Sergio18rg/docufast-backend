const ENTITY_TYPES = {
  WORKER: "Worker",
  VEHICLE: "Vehicle",
  CLIENT: "Client",
};

const ALLOWED_FIELDS_BY_ENTITY = {
  [ENTITY_TYPES.WORKER]: [
    "first_name",
    "last_name_1",
    "last_name_2",
    "document_number",
    "birth_date",
    "address",
    "social_security_number",
    "contract_start_date",
    "contract_end_date",
  ],
  [ENTITY_TYPES.VEHICLE]: [
    "license_plate",
    "contract_start_date",
    "contract_end_date",
  ],
  [ENTITY_TYPES.CLIENT]: [
    "business_name",
    "contract_start_date",
    "contract_end_date",
  ],
};

const AI_PROVIDERS = {
  GEMINI: "gemini",
};

const DEFAULT_AI_PROVIDER = AI_PROVIDERS.GEMINI;

const MESSAGES = {
  SUCCESS: {
    EXTRACTION_COMPLETED: "Document data extracted successfully",
  },
  ERROR: {
    INVALID_ENTITY_TYPE: "Invalid entity type",
    DOCUMENTS_REQUIRED: "At least one document is required",
    AI_API_KEY_MISSING: "AI provider API key is not configured",
    AI_PROVIDER_UNSUPPORTED: "Configured AI provider is not supported",
    EXTRACTION_FAILED: "Unable to extract data from documents",
  },
};

const INSTRUCTIONS = {
  GENERAL: {
    ROLE: "You are an expert document data extraction assistant.",
    ONLY_NECESSARY_DATA:
      "Extract only data that is clearly visible and reliable.",
    NOT_GUESS: "Do not infer or guess values that are uncertain.",
    DATES: "Dates must be normalized as YYYY-MM-DD when possible.",
  },
  SCHEMA: {
    WORKER: `Return JSON with this exact structure:\n{\n  "fields": {\n    "first_name": string?,\n    "last_name_1": string?,\n    "last_name_2": string?,\n    "document_number": string?,\n    "birth_date": "YYYY-MM-DD"?,\n    "address": string?,\n    "social_security_number": string?,\n    "contract_start_date": "YYYY-MM-DD"?,\n    "contract_end_date": "YYYY-MM-DD"?\n  },\n  "documents": [{\n    "document_key": string,\n    "issue_date": "YYYY-MM-DD"?,\n    "expiration_date": "YYYY-MM-DD"?\n  }]\n}`,
    VEHICLE: `Return JSON with this exact structure:\n{\n  "fields": {\n    "license_plate": string?,\n    "contract_start_date": "YYYY-MM-DD"?,\n    "contract_end_date": "YYYY-MM-DD"?\n  },\n  "documents": [{\n    "document_key": string,\n    "issue_date": "YYYY-MM-DD"?,\n    "expiration_date": "YYYY-MM-DD"?\n  }]\n}`,
    CLIENT: `Return JSON with this exact structure:\n{\n  "fields": {\n    "business_name": string?,\n    "contract_start_date": "YYYY-MM-DD"?,\n    "contract_end_date": "YYYY-MM-DD"?\n  },\n  "documents": [{\n    "document_key": string,\n    "issue_date": "YYYY-MM-DD"?,\n    "expiration_date": "YYYY-MM-DD"?\n  }]\n}`,
  },
  ENTITY: {
    WORKER: `Worker extraction rules:\n- Always try to extract issue_date and expiration_date from every predefined or additional document when clearly visible.\n- From identity_document extract first_name, last_name_1, last_name_2, document_number, birth_date, address.\n- From social_security_registration extract social_security_number.\n- From employment_contract extract contract_start_date, contract_end_date and also use it as fallback for social_security_number, first_name, last_name_1, last_name_2, document_number, birth_date.\n- Ignore worker_photo for personal data except dates if any appear.\n- Only return values when you are confident. Do not guess.`,
    VEHICLE: `Vehicle extraction rules:\n- Always try to extract issue_date and expiration_date from every predefined or additional document when clearly visible.\n- From vehicle_contract extract contract_start_date, contract_end_date and license_plate.\n- From itv and technical_sheet extract license_plate when clearly visible.\n- Only return values when you are confident. Do not guess.`,
    CLIENT: `Client extraction rules:\n- Always try to extract issue_date and expiration_date from every predefined or additional document when clearly visible.\n- From client_contract extract contract_start_date, contract_end_date and business_name.\n- Only return values when you are confident. Do not guess.`,
  },
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export {
  ENTITY_TYPES,
  AI_PROVIDERS,
  DEFAULT_AI_PROVIDER,
  MESSAGES,
  GEMINI_MODEL,
  INSTRUCTIONS,
  ALLOWED_FIELDS_BY_ENTITY,
};
