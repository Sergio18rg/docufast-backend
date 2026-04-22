import { Request, Response } from "express";
import multer from "multer";
import { HTTP_STATUS } from "../../constants";
import { sendError, sendSuccess } from "../../utils/http";
import { getErrorMessage } from "../../utils";
import { MESSAGES } from "./constants";
import {
  activateClient,
  createClient,
  deactivateClient,
  getClientById,
  listClients,
  removeClientDocument,
  updateClient,
  uploadClientDocumentFile,
} from "./service";
import { ClientPayload } from "./types";

const upload = multer({ storage: multer.memoryStorage() });
export const clientDocumentUploadMiddleware = upload.single("file");

const validateClientPayload = (payload: ClientPayload) => {
  if (!payload.client_code?.trim()) return MESSAGES.VALIDATE_ID;
  if (!payload.business_name?.trim()) return MESSAGES.VALIDATE_NAME;
  if (!payload.contact_email?.trim()) return MESSAGES.VALIDATE_EMAIL;
  if (!payload.badge_color?.trim()) return MESSAGES.VALIDATE_COLOR;
  return null;
};

const getClients = async (_req: Request, res: Response) => {
  try {
    const clients = await listClients();
    return sendSuccess(res, clients, MESSAGES.FETCH_CLIENTS_SUCCESS);
  } catch (error) {
    return sendError(res, getErrorMessage(error, MESSAGES.FETCH_CLIENTS_ERROR));
  }
};

const getClient = async (req: Request, res: Response) => {
  try {
    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId))
      return sendError(res, "Invalid ID", HTTP_STATUS.BAD_REQUEST);
    const client = await getClientById(clientId);
    if (!client)
      return sendError(res, MESSAGES.CLIENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    return sendSuccess(res, client, MESSAGES.FETCH_CLIENT_SUCCESS);
  } catch (error) {
    return sendError(res, getErrorMessage(error, MESSAGES.FETCH_CLIENTS_ERROR));
  }
};

const createClientHandler = async (req: Request, res: Response) => {
  try {
    const payload = req.body as ClientPayload;
    const validationError = validateClientPayload(payload);
    if (validationError)
      return sendError(res, validationError, HTTP_STATUS.BAD_REQUEST);
    const client = await createClient(payload);
    return sendSuccess(
      res,
      client,
      MESSAGES.CLIENT_CREATED,
      HTTP_STATUS.CREATED,
    );
  } catch (error) {
    const message = getErrorMessage(error, MESSAGES.CLIENT_SAVE_ERROR);
    const status = message.includes("Unique constraint")
      ? HTTP_STATUS.CONFLICT
      : HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return sendError(res, message, status);
  }
};

const updateClientHandler = async (req: Request, res: Response) => {
  try {
    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId))
      return sendError(res, "Invalid ID", HTTP_STATUS.BAD_REQUEST);
    const payload = req.body as ClientPayload;
    const validationError = validateClientPayload(payload);
    if (validationError)
      return sendError(res, validationError, HTTP_STATUS.BAD_REQUEST);
    const existing = await getClientById(clientId);
    if (!existing)
      return sendError(res, MESSAGES.CLIENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    const client = await updateClient(clientId, payload);
    return sendSuccess(res, client, MESSAGES.CLIENT_UPDATED);
  } catch (error) {
    const message = getErrorMessage(error, MESSAGES.CLIENT_SAVE_ERROR);
    const status = message.includes("Unique constraint")
      ? HTTP_STATUS.CONFLICT
      : HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return sendError(res, message, status);
  }
};

const deleteClientHandler = async (req: Request, res: Response) => {
  try {
    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId))
      return sendError(res, "Invalid ID", HTTP_STATUS.BAD_REQUEST);
    const existing = await getClientById(clientId);
    if (!existing)
      return sendError(res, MESSAGES.CLIENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await deactivateClient(clientId);
    return sendSuccess(res, null, MESSAGES.CLIENT_DELETED);
  } catch (error) {
    return sendError(res, getErrorMessage(error, MESSAGES.CLIENT_SAVE_ERROR));
  }
};

const restoreClientHandler = async (req: Request, res: Response) => {
  try {
    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId))
      return sendError(res, "Invalid ID", HTTP_STATUS.BAD_REQUEST);
    const existing = await getClientById(clientId);
    if (!existing)
      return sendError(res, MESSAGES.CLIENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    await activateClient(clientId);
    const client = await getClientById(clientId);
    return sendSuccess(res, client, MESSAGES.CLIENT_RESTORED);
  } catch (error) {
    return sendError(res, getErrorMessage(error, MESSAGES.CLIENT_SAVE_ERROR));
  }
};

const uploadClientDocumentHandler = async (req: Request, res: Response) => {
  try {
    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId))
      return sendError(res, "Invalid ID", HTTP_STATUS.BAD_REQUEST);
    if (!req.file)
      return sendError(res, "A file is required", HTTP_STATUS.BAD_REQUEST);
    const replaceDocumentId = req.body.replaceDocumentId
      ? Number(req.body.replaceDocumentId)
      : null;
    const {
      documentKey,
      documentName,
      securityLevel,
      issueDate,
      expirationDate,
      notes,
      isPredefined,
    } = req.body;
    await uploadClientDocumentFile({
      clientId,
      file: req.file,
      documentKey,
      documentName,
      securityLevel,
      issueDate,
      expirationDate,
      notes,
      replaceDocumentId: Number.isNaN(replaceDocumentId ?? Number.NaN)
        ? null
        : replaceDocumentId,
      isPredefined: isPredefined === "true",
    });
    const client = await getClientById(clientId);
    return sendSuccess(res, client, MESSAGES.DOCUMENT_UPLOADED);
  } catch (error) {
    return sendError(
      res,
      getErrorMessage(error, MESSAGES.CLIENT_SAVE_ERROR),
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
};

const removeClientDocumentHandler = async (req: Request, res: Response) => {
  try {
    const clientId = Number(req.params.clientId);
    const clientDocumentId = Number(req.params.clientDocumentId);
    if (Number.isNaN(clientId) || Number.isNaN(clientDocumentId))
      return sendError(res, "Invalid ID", HTTP_STATUS.BAD_REQUEST);
    await removeClientDocument(clientId, clientDocumentId);
    const client = await getClientById(clientId);
    return sendSuccess(res, client, MESSAGES.DOCUMENT_REMOVED);
  } catch (error) {
    return sendError(
      res,
      getErrorMessage(error, MESSAGES.CLIENT_SAVE_ERROR),
      HTTP_STATUS.BAD_REQUEST,
    );
  }
};

export {
  getClients,
  getClient,
  createClientHandler,
  updateClientHandler,
  deleteClientHandler,
  restoreClientHandler,
  uploadClientDocumentHandler,
  removeClientDocumentHandler,
};
