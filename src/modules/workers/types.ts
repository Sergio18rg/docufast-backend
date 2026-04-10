type WorkerDocumentInput = {
  worker_document_id?: number;
  document_key: string;
  document_name: string;
  is_predefined?: boolean;
  security_level?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  notes?: string | null;
};

type WorkerPayload = {
  company_worker_code: string;
  first_name: string;
  last_name_1: string;
  last_name_2?: string | null;
  email?: string | null;
  phone?: string | null;
  document_number?: string | null;
  social_security_number?: string | null;
  birth_date?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  status?: string | null;
  notes?: string | null;
  client_id?: number | null;
  current_vehicle_id?: number | null;
  documents?: WorkerDocumentInput[];
};

export type { WorkerPayload, WorkerDocumentInput };
