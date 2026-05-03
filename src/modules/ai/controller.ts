import { Response } from "express";
import multer from "multer";
import { sendError, sendSuccess } from "../../utils/http";
import { HTTP_STATUS } from "../../constants";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { MESSAGES, ENTITY_TYPES } from "./constants";
import { extractDataFromDocuments } from "./service";
import { ExtractDocumentInput, ExtractableEntityType } from "./types";

const upload = multer({ storage: multer.memoryStorage() });
export const aiDocumentsUploadMiddleware = upload.any();

const extractDocumentDataHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const entityType = req.body.entityType as ExtractableEntityType;
    const documentsRaw = req.body.documents;
    const documents: ExtractDocumentInput[] =
      typeof documentsRaw === "string" ? JSON.parse(documentsRaw) : [];

    const isEntityTypeInvalid =
      !Object.values(ENTITY_TYPES).includes(entityType);
    if (isEntityTypeInvalid)
      return sendError(
        res,
        MESSAGES.ERROR.INVALID_ENTITY_TYPE,
        HTTP_STATUS.BAD_REQUEST,
      );

    const isDocumentsInvalid = !Array.isArray(documents) || !documents.length;
    if (isDocumentsInvalid)
      return sendError(
        res,
        MESSAGES.ERROR.DOCUMENTS_REQUIRED,
        HTTP_STATUS.BAD_REQUEST,
      );

    const data = await extractDataFromDocuments({
      entityType,
      documents,
      uploadedFiles: files ?? [],
    });

    return sendSuccess(res, data, MESSAGES.SUCCESS.EXTRACTION_COMPLETED);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : MESSAGES.ERROR.EXTRACTION_FAILED;
    return sendError(res, message, HTTP_STATUS.BAD_REQUEST);
  }
};

export { extractDocumentDataHandler };
