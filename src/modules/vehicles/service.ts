import { prisma } from "../../lib/prisma";
import { SortOrder } from "../../generated/prisma/internal/prismaNamespace";

const listVehicles = async () =>
  prisma.vehicle.findMany({ orderBy: [{ license_plate: SortOrder.asc }] });

export { listVehicles };
