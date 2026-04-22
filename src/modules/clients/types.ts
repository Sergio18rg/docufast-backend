type ClientDocumentInput = {
  client_document_id?: number | null;
  document_key: string;
  document_name: string;
  is_predefined?: boolean;
  security_level?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  notes?: string | null;
};

type ClientPayload = {
  client_code: string;
  business_name: string;
  contact_email: string;
  contact_phone?: string | null;
  badge_color: string;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  status?: string | null;
  notes?: string | null;
  documents?: ClientDocumentInput[];
};

export type { ClientDocumentInput, ClientPayload };
