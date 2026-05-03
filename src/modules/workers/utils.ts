import {
  trim,
  trimOptional,
  getDocumentStatus,
  buildTemporaryPassword as buildTempPassword,
  buildGenericDocumentDto,
} from "../../utils";

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
}) => buildTempPassword([firstName, companyWorkerCode]);

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

const buildDocumentDto = (entityDocument: any) =>
  buildGenericDocumentDto(
    entityDocument,
    "worker_document_id",
    getDocumentStatus,
  );

export {
  getWorkerFullName,
  buildTemporaryPassword,
  filterExternalWorkerDocuments,
  toExternalClientsWorkerDtos,
  buildDocumentDto,
};
