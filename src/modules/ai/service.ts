import {
  ExtractDocumentInput,
  ExtractableEntityType,
  ExtractionResponse,
  PreparedDocumentPart,
} from "./types";
import { loadStoredDocument } from "./utils";
import { getExtractionProvider } from "./providers";

const extractDataFromDocuments = async ({
  entityType,
  documents,
  uploadedFiles,
}: {
  entityType: ExtractableEntityType;
  documents: ExtractDocumentInput[];
  uploadedFiles: Express.Multer.File[];
}): Promise<ExtractionResponse> => {
  const uploadedFilesByKey = new Map(
    uploadedFiles.map((file) => [file.fieldname, file]),
  );
  const documentParts: PreparedDocumentPart[] = [];
  const prioritizedDocuments: ExtractDocumentInput[] = [];

  for (const document of documents) {
    const uploadedFile = uploadedFilesByKey.get(document.document_key);
    if (uploadedFile) {
      prioritizedDocuments.push(document);
      documentParts.push({
        document_key: document.document_key,
        document_name: document.document_name,
        mime_type: uploadedFile.mimetype || "application/octet-stream",
        data: uploadedFile.buffer.toString("base64"),
      });
      continue;
    }

    const storedDocument = await loadStoredDocument(document);
    if (!storedDocument) continue;

    prioritizedDocuments.push(document);
    documentParts.push({
      document_key: document.document_key,
      document_name: document.document_name,
      mime_type: storedDocument.mime_type,
      data: storedDocument.buffer.toString("base64"),
    });
  }

  if (!documentParts.length) {
    return { fields: {}, documents: [] };
  }

  const extractionProvider = getExtractionProvider();

  return extractionProvider.extract({
    entityType,
    documents: prioritizedDocuments,
    documentParts,
  });
};

export { extractDataFromDocuments };
