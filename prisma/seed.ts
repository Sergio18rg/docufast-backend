import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcrypt";

const main = async () => {
  const adminRole = await prisma.role.upsert({
    where: { name: "Administrator" },
    update: {},
    create: { name: "Administrator" },
  });

  const workerRole = await prisma.role.upsert({
    where: { name: "Worker" },
    update: {},
    create: { name: "Worker" },
  });

  const externalRole = await prisma.role.upsert({
    where: { name: "External" },
    update: {},
    create: { name: "External" },
  });

  const adminPasswordHash = await bcrypt.hash("Admin1234!", 10);
  const workerPasswordHash = await bcrypt.hash("Worker1234!", 10);
  const externalPasswordHash = await bcrypt.hash("External1234!", 10);

  await prisma.user.upsert({
    where: { email: "admin@docufast.com" },
    update: {},
    create: {
      email: "admin@docufast.com",
      password_hash: adminPasswordHash,
      full_name: "System Administrator",
      role_id: adminRole.role_id,
    },
  });

  await prisma.user.upsert({
    where: { email: "worker@docufast.com" },
    update: {},
    create: {
      email: "worker@docufast.com",
      password_hash: workerPasswordHash,
      full_name: "Test Worker",
      role_id: workerRole.role_id,
    },
  });

  await prisma.user.upsert({
    where: { email: "external@docufast.com" },
    update: {},
    create: {
      email: "external@docufast.com",
      password_hash: externalPasswordHash,
      full_name: "External Client User",
      role_id: externalRole.role_id,
    },
  });

  console.log("Seed completed");
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
