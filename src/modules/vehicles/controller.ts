import { Request, Response } from "express";
import { listVehicles } from "./service";
import { sendError, sendSuccess } from "../../utils/http";
import { MESSAGES } from "./constants";

const getVehicles = async (_req: Request, res: Response) => {
  try {
    const vehicles = await listVehicles();
    return sendSuccess(res, vehicles, MESSAGES.FETCH_VEHICLES_SUCCESS);
  } catch {
    return sendError(res, MESSAGES.FETCH_VEHICLES_ERROR);
  }
};

export { getVehicles };
