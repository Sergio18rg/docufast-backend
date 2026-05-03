type ExtractableEntityType = "Worker" | "Vehicle" | "Client";

type ExtractDocumentInput = {
  document_key: string;
  document_name: string;
  file_url?: string | null;
  mime_type?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  is_predefined?: boolean;
};

type ExtractionRequestBody = {
  entityType: ExtractableEntityType;
  documents: ExtractDocumentInput[];
};

type ExtractionResponse = {
  fields: Record<string, string>;
  documents: Array<{
    document_key: string;
    issue_date?: string | null;
    expiration_date?: string | null;
  }>;
};

type PreparedDocumentPart = {
  document_key: string;
  document_name: string;
  mime_type: string;
  data: string;
};

export type {
  ExtractableEntityType,
  ExtractDocumentInput,
  ExtractionRequestBody,
  ExtractionResponse,
  PreparedDocumentPart,
};
