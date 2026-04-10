import { Response } from "express";
import { HTTP_STATUS, MESSAGES } from "../constants";

const sendSuccess = <T>(
  res: Response,
  data: T,
  message = MESSAGES.HTTP.REQUEST_SUCCESS,
  status = HTTP_STATUS.OK,
) =>
  res.status(status).json({
    success: true,
    message,
    data,
  });

const sendError = (
  res: Response,
  message = MESSAGES.HTTP.REQUEST_ERROR,
  status = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details?: unknown,
) =>
  res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });

export { sendSuccess, sendError };
