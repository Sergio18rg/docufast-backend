import { prisma } from "../../lib/prisma";
import { SortOrder } from "../../generated/prisma/internal/prismaNamespace";

const listClients = async () =>
  prisma.client.findMany({
    orderBy: { business_name: SortOrder.asc },
  });

export { listClients };
