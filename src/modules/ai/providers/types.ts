import {
  ExtractDocumentInput,
  ExtractableEntityType,
  ExtractionResponse,
  PreparedDocumentPart,
} from "../types";

type ExtractionProviderInput = {
  entityType: ExtractableEntityType;
  documents: ExtractDocumentInput[];
  documentParts: PreparedDocumentPart[];
};

type ExtractionProvider = {
  extract(input: ExtractionProviderInput): Promise<ExtractionResponse>;
};

export type { ExtractionProviderInput, ExtractionProvider };
