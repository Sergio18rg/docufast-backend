import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import multer from "multer";
import {
  createWorker,
  getWorkerById,
  listWorkers,
  deactivateWorker,
  updateWorker,
  uploadDocumentFile,
  removeWorkerDocument,
  restoreWorker,
} from "./service";
import { sendError, sendSuccess } from "../../utils/http";
import { MESSAGES } from "./constants";
import { HTTP_STATUS } from "../../constants";
import { WorkerPayload } from "./types";
import { getErrorMessage, trimOptional } from "../../utils";

const upload = multer({ storage: multer.memoryStorage() });
export const workerDocumentUploadMiddleware = upload.single("file");

const validateWorkerPayload = (payload: WorkerPayload) => {
  const { company_worker_code, first_name, last_name_1, email } = payload;

  const isWorkerCodeMissing = !trimOptional(company_worker_code);
  if (isWorkerCodeMissing) return MESSAGES.REQUIRED.COMPANY_CODE;

  const isFirstNameMissing = !trimOptional(first_name);
  if (isFirstNameMissing) return MESSAGES.REQUIRED.NAME;

  const isLastNameMissing = !trimOptional(last_name_1);
  if (isLastNameMissing) return MESSAGES.REQUIRED.FIRST_SURNAME;
  const isEmailMissing = !trimOptional(email);
  if (isEmailMissing) return MESSAGES.REQUIRED.EMAIL;
  return null;
};

const getWorkers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workers = await listWorkers(req.user);
    return sendSuccess(res, workers, MESSAGES.SUCCESS.WORKERS_FETCHED);
  } catch {
    return sendError(res, MESSAGES.ERROR.WORKERS_FETCH_FAILED);
  }
};

const getWorker = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = Number(req.params.workerId);

    const isWorkerIdInvalid = Number.isNaN(workerId);
    if (isWorkerIdInvalid)
      return sendError(res, MESSAGES.REQUIRED.ID, HTTP_STATUS.BAD_REQUEST);

    const worker = await getWorkerById(workerId, req.user);
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
    const message = getErrorMessage(
      error,
      MESSAGES.ERROR.WORKER_CREATION_FAILED,
    );
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
    const message = getErrorMessage(error, MESSAGES.ERROR.WORKER_UPDATE_FAILED);
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

const restoreWorkerHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
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

    await restoreWorker(workerId);
    const worker = await getWorkerById(workerId, req.user);
    return sendSuccess(res, worker, MESSAGES.SUCCESS.WORKER_RESTORED);
  } catch {
    return sendError(res, MESSAGES.ERROR.WORKER_UPDATE_FAILED);
  }
};

const uploadWorkerDocumentHandler = async (
  req: AuthenticatedRequest & { file?: Express.Multer.File },
  res: Response,
) => {
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

    const worker = await getWorkerById(workerId, req.user);
    return sendSuccess(res, worker, MESSAGES.SUCCESS.DOCUMENT_UPLOADED);
  } catch (error) {
    const message = getErrorMessage(
      error,
      MESSAGES.ERROR.DOCUMENT_UPLOAD_FAILED,
    );
    return sendError(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

const removeWorkerDocumentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const workerId = Number(req.params.workerId);
    const workerDocumentId = Number(req.params.workerDocumentId);
    const isWorkerIdInvalid = Number.isNaN(workerId);
    const isWorkerDocumentIdInvalid = Number.isNaN(workerDocumentId);
    if (isWorkerIdInvalid || isWorkerDocumentIdInvalid)
      return sendError(res, MESSAGES.REQUIRED.ID, HTTP_STATUS.BAD_REQUEST);

    await removeWorkerDocument(workerId, workerDocumentId);
    const worker = await getWorkerById(workerId, req.user);

    return sendSuccess(res, worker, MESSAGES.SUCCESS.DOCUMENT_REMOVED);
  } catch (error) {
    const message = getErrorMessage(
      error,
      MESSAGES.ERROR.DOCUMENT_REMOVAL_FAILED,
    );
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
  restoreWorkerHandler,
};
