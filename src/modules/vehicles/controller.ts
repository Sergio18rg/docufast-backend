import { Request, Response } from "express";
import multer from "multer";
import { HTTP_STATUS } from "../../constants";
import { sendError, sendSuccess } from "../../utils/http";
import { MESSAGES } from "./constants";
import {
  activateVehicle,
  createVehicle,
  deactivateVehicle,
  getVehicleById,
  listVehicles,
  removeVehicleDocument,
  updateVehicle,
  uploadVehicleDocumentFile,
} from "./service";
import { VehiclePayload } from "./types";
import { getErrorMessage } from "../../utils";

const upload = multer({ storage: multer.memoryStorage() });
export const vehicleDocumentUploadMiddleware = upload.single("file");

const validateVehiclePayload = (payload: VehiclePayload) => {
  if (!payload.license_plate?.trim()) return MESSAGES.VALIDATE_PLATE;
  if (!payload.company_owner?.trim()) return MESSAGES.VALIDATE_OWNER;
  if (!payload.vehicle_type?.trim()) return MESSAGES.VALIDATE_VEHICLE_TYPE;
  return null;
};

const getVehicles = async (_req: Request, res: Response) => {
  try {
    const vehicles = await listVehicles();
    return sendSuccess(res, vehicles, MESSAGES.FETCH_VEHICLES_SUCCESS);
  } catch (error) {
    const message = getErrorMessage(error, MESSAGES.FETCH_VEHICLES_ERROR);
    return sendError(res, message);
  }
};

const getVehicle = async (req: Request, res: Response) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    if (Number.isNaN(vehicleId))
      return sendError(res, "Invalid ID", HTTP_STATUS.BAD_REQUEST);
    const vehicle = await getVehicleById(vehicleId);

    if (!vehicle)
      return sendError(res, MESSAGES.VEHICLE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    return sendSuccess(res, vehicle, MESSAGES.FETCH_VEHICLE_SUCCESS);
  } catch (error) {
    const message = getErrorMessage(error, MESSAGES.FETCH_VEHICLES_ERROR);
    return sendError(res, message);
  }
};

const createVehicleHandler = async (req: Request, res: Response) => {
  try {
    const payload = req.body as VehiclePayload;
    const validationError = validateVehiclePayload(payload);

    if (validationError)
      return sendError(res, validationError, HTTP_STATUS.BAD_REQUEST);
    const vehicle = await createVehicle(payload);
    return sendSuccess(
      res,
      vehicle,
      MESSAGES.VEHICLE_CREATED,
      HTTP_STATUS.CREATED,
    );
  } catch (error) {
    const message = getErrorMessage(error, MESSAGES.VEHICLE_SAVE_ERROR);
    const status = message.includes("Unique constraint")
      ? HTTP_STATUS.CONFLICT
      : HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return sendError(res, message, status);
  }
};

const updateVehicleHandler = async (req: Request, res: Response) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    if (Number.isNaN(vehicleId))
      return sendError(res, "Invalid ID", HTTP_STATUS.BAD_REQUEST);

    const payload = req.body as VehiclePayload;
    const validationError = validateVehiclePayload(payload);
    if (validationError)
      return sendError(res, validationError, HTTP_STATUS.BAD_REQUEST);

    const existing = await getVehicleById(vehicleId);
    if (!existing)
      return sendError(res, MESSAGES.VEHICLE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    const vehicle = await updateVehicle(vehicleId, payload);
    return sendSuccess(res, vehicle, MESSAGES.VEHICLE_UPDATED);
  } catch (error) {
    const message = getErrorMessage(error, MESSAGES.VEHICLE_SAVE_ERROR);
    const status = message.includes("Unique constraint")
      ? HTTP_STATUS.CONFLICT
      : HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return sendError(res, message, status);
  }
};

const deleteVehicleHandler = async (req: Request, res: Response) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    if (Number.isNaN(vehicleId))
      return sendError(res, "Invalid ID", HTTP_STATUS.BAD_REQUEST);

    const existing = await getVehicleById(vehicleId);
    if (!existing)
      return sendError(res, MESSAGES.VEHICLE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    await deactivateVehicle(vehicleId);
    return sendSuccess(res, null, MESSAGES.VEHICLE_DELETED);
  } catch (error) {
    const message = getErrorMessage(error, MESSAGES.VEHICLE_SAVE_ERROR);
    return sendError(res, message);
  }
};

const restoreVehicleHandler = async (req: Request, res: Response) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    if (Number.isNaN(vehicleId))
      return sendError(res, "Invalid ID", HTTP_STATUS.BAD_REQUEST);

    const existing = await getVehicleById(vehicleId);
    if (!existing)
      return sendError(res, MESSAGES.VEHICLE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);

    await activateVehicle(vehicleId);
    return sendSuccess(res, null, MESSAGES.VEHICLE_RESTORED);
  } catch (error) {
    const message = getErrorMessage(error, MESSAGES.VEHICLE_SAVE_ERROR);
    return sendError(res, message);
  }
};

const uploadVehicleDocumentHandler = async (req: Request, res: Response) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    if (Number.isNaN(vehicleId))
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
    const safeReplaceDocumentId = Number.isNaN(replaceDocumentId ?? Number.NaN)
      ? null
      : replaceDocumentId;

    await uploadVehicleDocumentFile({
      vehicleId,
      file: req.file,
      documentKey,
      documentName,
      securityLevel,
      issueDate,
      expirationDate,
      notes,
      replaceDocumentId: safeReplaceDocumentId,
      isPredefined: isPredefined === "true",
    });

    const vehicle = await getVehicleById(vehicleId);
    return sendSuccess(res, vehicle, MESSAGES.DOCUMENT_UPLOADED);
  } catch (error) {
    const message = getErrorMessage(error, MESSAGES.VEHICLE_SAVE_ERROR);
    return sendError(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

const removeVehicleDocumentHandler = async (req: Request, res: Response) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const vehicleDocumentId = Number(req.params.vehicleDocumentId);
    if (Number.isNaN(vehicleId) || Number.isNaN(vehicleDocumentId))
      return sendError(res, "Invalid ID", HTTP_STATUS.BAD_REQUEST);

    await removeVehicleDocument(vehicleId, vehicleDocumentId);
    const vehicle = await getVehicleById(vehicleId);
    return sendSuccess(res, vehicle, MESSAGES.DOCUMENT_REMOVED);
  } catch (error) {
    const message = getErrorMessage(error, MESSAGES.VEHICLE_SAVE_ERROR);
    return sendError(res, message, HTTP_STATUS.BAD_REQUEST);
  }
};

export {
  getVehicles,
  getVehicle,
  createVehicleHandler,
  updateVehicleHandler,
  deleteVehicleHandler,
  restoreVehicleHandler,
  uploadVehicleDocumentHandler,
  removeVehicleDocumentHandler,
};
