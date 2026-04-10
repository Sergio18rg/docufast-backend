import { Request, Response } from "express";
import multer from "multer";
import {
  createWorker,
  getWorkerById,
  listWorkers,
  deactivateWorker,
  updateWorker,
  uploadDocumentFile,
  removeWorkerDocument,
} from "./service";
import { sendError, sendSuccess } from "../../utils/http";
import { MESSAGES } from "./constants";
import { HTTP_STATUS } from "../../constants";
import { WorkerPayload } from "./types";

const upload = multer({ storage: multer.memoryStorage() });
export const workerDocumentUploadMiddleware = upload.single("file");

const validateWorkerPayload = (payload: WorkerPayload) => {
  const { company_worker_code, first_name, last_name_1 } = payload;

  const isWorkerCodeMissing = !company_worker_code?.trim();
  if (isWorkerCodeMissing) return MESSAGES.REQUIRED.COMPANY_CODE;

  const isFirstNameMissing = !first_name?.trim();
  if (isFirstNameMissing) return MESSAGES.REQUIRED.NAME;

  const isLastNameMissing = !last_name_1?.trim();
  if (isLastNameMissing) return MESSAGES.REQUIRED.FIRST_SURNAME;
  return null;
};

const getWorkers = async (_req: Request, res: Response) => {
  try {
    const workers = await listWorkers();
    return sendSuccess(res, workers, MESSAGES.SUCCESS.WORKERS_FETCHED);
  } catch {
    return sendError(res, MESSAGES.ERROR.WORKERS_FETCH_FAILED);
  }
};

const getWorker = async (req: Request, res: Response) => {
  try {
    const workerId = Number(req.params.workerId);

    const isWorkerIdInvalid = Number.isNaN(workerId);
    if (isWorkerIdInvalid)
      return sendError(res, MESSAGES.REQUIRED.ID, HTTP_STATUS.BAD_REQUEST);

    const worker = await getWorkerById(workerId);
    if (!worker)
      return sendError(
        res,
        MESSAGES.ERROR.WORKER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );

    return sendSuccess(res, worker, MESSAGES.SUCCESS.WORKER_FETCHED);
  } catch {
    return sendError(res, MESSAGES.ERROR.WORKER_FETCH_FAILED);
  }
};

const createWorkerHandler = async (req: Request, res: Response) => {
  try {
    const payload = req.body as WorkerPayload;
    const validationError = validateWorkerPayload(payload);
    if (validationError)
      return sendError(res, validationError, HTTP_STATUS.BAD_REQUEST);

    const worker = await createWorker(payload);
    return sendSuccess(
      res,
      worker,
      MESSAGES.SUCCESS.WORKER_CREATED,
      HTTP_STATUS.CREATED,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : MESSAGES.ERROR.WORKER_CREATION_FAILED;

    const isUniqueConstraintError = message.includes("Unique constraint");
    const status = isUniqueConstraintError
      ? HTTP_STATUS.CONFLICT
      : HTTP_STATUS.INTERNAL_SERVER_ERROR;

    return sendError(res, message, status);
  }
};

const updateWorkerHandler = async (req: Request, res: Response) => {
  try {
    const workerId = Number(req.params.workerId);
    const isWorkerIdInvalid = Number.isNaN(workerId);
    if (isWorkerIdInvalid)
      return sendError(res, MESSAGES.REQUIRED.ID, HTTP_STATUS.BAD_REQUEST);

    const payload = req.body as WorkerPayload;
    const validationError = validateWorkerPayload(payload);
    if (validationError)
      return sendError(res, validationError, HTTP_STATUS.BAD_REQUEST);

    const existingWorker = await getWorkerById(workerId);
    if (!existingWorker)
      return sendError(
        res,
        MESSAGES.ERROR.WORKER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );

    const worker = await updateWorker(workerId, payload);
    return sendSuccess(res, worker, MESSAGES.SUCCESS.WORKER_UPDATED);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : MESSAGES.ERROR.WORKER_UPDATE_FAILED;
    const isUniqueConstraintError = message.includes("Unique constraint");
    const status = isUniqueConstraintError
      ? HTTP_STATUS.CONFLICT
      : HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return sendError(res, message, status);
  }
};

const deleteWorkerHandler = async (req: Request, res: Response) => {
  try {
    const workerId = Number(req.params.workerId);
    const isWorkerIdInvalid = Number.isNaN(workerId);
    if (isWorkerIdInvalid)
      return sendError(res, MESSAGES.REQUIRED.ID, HTTP_STATUS.BAD_REQUEST);

    const existingWorker = await getWorkerById(workerId);
    if (!existingWorker)
      return sendError(
        res,
        MESSAGES.ERROR.WORKER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );

    await deactivateWorker(workerId);
    return sendSuccess(res, null, MESSAGES.SUCCESS.WORKER_DELETED);
  } catch {
    return sendError(res, MESSAGES.ERROR.WORKER_UPDATE_FAILED);
  }
};

const uploadWorkerDocumentHandler = async (req: Request, res: Response) => {
  try {
    const workerId = Number(req.params.workerId);
    const isWorkerIdInvalid = Number.isNaN(workerId);
    if (isWorkerIdInvalid)
      return sendError(res, MESSAGES.REQUIRED.ID, HTTP_STATUS.BAD_REQUEST);

    if (!req.file)
      return sendError(res, MESSAGES.REQUIRED.FILE, HTTP_STATUS.BAD_REQUEST);

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

    const isReplaceDocumentIdInvalid = Number.isNaN(
      replaceDocumentId ?? Number.NaN,
    );

    await uploadDocumentFile({
      workerId,
      file: req.file,
      documentKey,
      documentName,
      securityLevel,
      issueDate,
      expirationDate,
      notes,
      replaceDocumentId: isReplaceDocumentIdInvalid ? null : replaceDocumentId,
      isPredefined: isPredefined === "true",
    });

    const worker = await getWorkerById(workerId);
    return sendSuccess(res, worker, MESSAGES.SUCCESS.DOCUMENT_UPLOADED);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : MESSAGES.ERROR.DOCUMENT_UPLOAD_FAILED;
    return sendError(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

const removeWorkerDocumentHandler = async (req: Request, res: Response) => {
  try {
    const workerId = Number(req.params.workerId);
    const workerDocumentId = Number(req.params.workerDocumentId);
    const isWorkerIdInvalid = Number.isNaN(workerId);
    const isWorkerDocumentIdInvalid = Number.isNaN(workerDocumentId);
    if (isWorkerIdInvalid || isWorkerDocumentIdInvalid)
      return sendError(res, MESSAGES.REQUIRED.ID, HTTP_STATUS.BAD_REQUEST);

    await removeWorkerDocument(workerId, workerDocumentId);
    const worker = await getWorkerById(workerId);

    return sendSuccess(res, worker, MESSAGES.SUCCESS.DOCUMENT_REMOVED);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : MESSAGES.ERROR.DOCUMENT_REMOVAL_FAILED;
    return sendError(res, message, HTTP_STATUS.BAD_REQUEST);
  }
};

export {
  getWorkers,
  getWorker,
  createWorkerHandler,
  updateWorkerHandler,
  deleteWorkerHandler,
  uploadWorkerDocumentHandler,
  removeWorkerDocumentHandler,
};
