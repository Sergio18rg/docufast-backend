import { STATUS } from "../../constants";
import { trim, trimOptional } from "../../utils";
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

const getWorkerFullName = ({
  firstName,
  lastName1,
  lastName2,
}: {
  firstName: string;
  lastName1: string;
  lastName2?: string | null;
}) =>
  [trim(firstName), trim(lastName1), trimOptional(lastName2)]
    .filter(Boolean)
    .join(" ");

const buildTemporaryPassword = ({
  firstName,
  companyWorkerCode,
}: {
  firstName: string;
  companyWorkerCode: string;
}) => `${trim(firstName)}${trim(companyWorkerCode)}`;

const filterExternalWorkerDocuments = (documents: any[] = []) =>
  documents.filter((document) => document.security_level === "External");

const toExternalClientsWorkerDtos = (worker: any) => {
  if (!worker) return null;

  return {
    worker_id: worker.worker_id,
    company_worker_code: "",
    first_name: worker.first_name,
    last_name_1: worker.last_name_1,
    last_name_2: worker.last_name_2,
    email: null,
    phone: null,
    document_number: worker.document_number,
    social_security_number: null,
    birth_date: worker.birth_date,
    address: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    contract_start_date: null,
    contract_end_date: null,
    status: worker.status,
    notes: null,
    client_id: null,
    current_vehicle_id: worker.current_vehicle_id ?? null,
    client: null,
    current_vehicle: worker.current_vehicle
      ? {
          vehicle_id: worker.current_vehicle.vehicle_id,
          license_plate: worker.current_vehicle.license_plate,
          vehicle_type: worker.current_vehicle.vehicle_type,
          company_owner: worker.current_vehicle.company_owner,
          status: worker.current_vehicle.status,
          contract_start_date: null,
          contract_end_date: null,
          notes: null,
        }
      : null,
    documents: worker.documents ?? [],
  };
};

const buildDocumentDto = (entityDocument: any) => {
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
    worker_document_id: entity_document_id,
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

export {
  getDocumentStatus,
  getWorkerFullName,
  buildTemporaryPassword,
  filterExternalWorkerDocuments,
  toExternalClientsWorkerDtos,
  buildDocumentDto,
};
