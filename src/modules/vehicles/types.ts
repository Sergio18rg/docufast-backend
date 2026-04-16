export type VehicleDocumentInput = {
  vehicle_document_id?: number | null;
  document_key: string;
  document_name: string;
  is_predefined?: boolean;
  security_level?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  notes?: string | null;
};

export type VehiclePayload = {
  license_plate: string;
  company_owner: string;
  vehicle_type: string;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  status?: string | null;
  notes?: string | null;
  documents?: VehicleDocumentInput[];
};
