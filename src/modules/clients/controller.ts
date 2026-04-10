import { Request, Response } from "express";
import { sendError, sendSuccess } from "../../utils/http";
import { listClients } from "./service";
import { MESSAGES } from "./constants";

const getClients = async (_req: Request, res: Response) => {
  try {
    const clients = await listClients();
    return sendSuccess(res, clients, MESSAGES.FETCH_CLIENTS_SUCCESS);
  } catch {
    return sendError(res, MESSAGES.FETCH_CLIENTS_ERROR);
  }
};

export { getClients };
