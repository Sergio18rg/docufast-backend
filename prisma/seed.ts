import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcrypt";
import {
  PREDEFINED_WORKER_DOCUMENTS,
  ADDITIONAL_WORKER_DOCUMENT,
  DEFAULT_SECURITY_LEVEL,
  WORKER_ENTITY_TYPE,
} from "../src/modules/workers/constants";
import { getDocumentStatus } from "../src/modules/workers/utils";

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

  const workerUser = await prisma.user.upsert({
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

  const clients = [
    {
      business_name: "FedEx",
      badge_color: "#7c3aed",
      contact_email: "ops@fedex-demo.com",
      contact_phone: "+34 600 111 222",
    },
    {
      business_name: "Seur",
      badge_color: "#2563eb",
      contact_email: "ops@seur-demo.com",
      contact_phone: "+34 600 111 333",
    },
    {
      business_name: "Redur",
      badge_color: "#dc2626",
      contact_email: "ops@redur-demo.com",
      contact_phone: "+34 600 111 444",
    },
  ];

  for (const client of clients) {
    await prisma.client.upsert({
      where: { business_name: client.business_name },
      update: client,
      create: client,
    });
  }

  const vehicles = [
    {
      license_plate: "1234ABC",
      vehicle_type: "Dry",
      company_owner: "Rumofast",
      contract_start_date: new Date("2025-01-01"),
      contract_end_date: new Date("2026-01-01"),
    },
    {
      license_plate: "5678DEF",
      vehicle_type: "Reefer",
      company_owner: "SixT",
      contract_start_date: new Date("2025-02-01"),
      contract_end_date: new Date("2026-02-01"),
    },
    {
      license_plate: "9012GHI",
      vehicle_type: "Truck",
      company_owner: "DFM",
      contract_start_date: new Date("2025-03-01"),
      contract_end_date: new Date("2026-03-01"),
    },
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { license_plate: vehicle.license_plate },
      update: vehicle,
      create: vehicle,
    });
  }

  const workerDocumentTypes = [
    ...PREDEFINED_WORKER_DOCUMENTS,
    ADDITIONAL_WORKER_DOCUMENT,
  ];
  for (const definition of workerDocumentTypes) {
    await prisma.documentType.upsert({
      where: {
        entity_type_key: {
          entity_type: WORKER_ENTITY_TYPE,
          key: definition.key,
        },
      },
      update: {
        name: definition.name,
        is_additional:
          "isAdditional" in definition ? definition.isAdditional : false,
        default_security_level: definition.defaultSecurityLevel,
        is_required: !("isAdditional" in definition
          ? definition.isAdditional
          : false),
        display_order: definition.displayOrder,
        status: "Active",
      },
      create: {
        key: definition.key,
        name: definition.name,
        entity_type: WORKER_ENTITY_TYPE,
        is_additional:
          "isAdditional" in definition ? definition.isAdditional : false,
        default_security_level: definition.defaultSecurityLevel,
        is_required: !("isAdditional" in definition
          ? definition.isAdditional
          : false),
        display_order: definition.displayOrder,
        status: "Active",
      },
    });
  }

  const fedexClient = await prisma.client.findUniqueOrThrow({
    where: { business_name: "FedEx" },
  });
  const dryVehicle = await prisma.vehicle.findUniqueOrThrow({
    where: { license_plate: "1234ABC" },
  });

  const worker = await prisma.worker.upsert({
    where: { company_worker_code: "WK-0001" },
    update: {
      first_name: "Laura",
      last_name_1: "Gomez",
      last_name_2: "Ruiz",
      email: "laura.gomez@docufast.com",
      phone: "+34 600 222 333",
      document_number: "12345678A",
      social_security_number: "28/1234567890",
      birth_date: new Date("1995-05-04"),
      address: "Calle Mayor 10, Barcelona",
      emergency_contact_name: "Ana Gomez",
      emergency_contact_phone: "+34 600 333 444",
      status: "Active",
      client_id: fedexClient.client_id,
      current_vehicle_id: dryVehicle.vehicle_id,
      user_id: workerUser.user_id,
      contract_start_date: new Date("2025-01-10"),
      contract_end_date: new Date("2026-12-31"),
      notes: "Seed worker for CAT3.",
    },
    create: {
      company_worker_code: "WK-0001",
      first_name: "Laura",
      last_name_1: "Gomez",
      last_name_2: "Ruiz",
      email: "laura.gomez@docufast.com",
      phone: "+34 600 222 333",
      document_number: "12345678A",
      social_security_number: "28/1234567890",
      birth_date: new Date("1995-05-04"),
      address: "Calle Mayor 10, Barcelona",
      emergency_contact_name: "Ana Gomez",
      emergency_contact_phone: "+34 600 333 444",
      status: "Active",
      client_id: fedexClient.client_id,
      current_vehicle_id: dryVehicle.vehicle_id,
      user_id: workerUser.user_id,
      contract_start_date: new Date("2025-01-10"),
      contract_end_date: new Date("2026-12-31"),
      notes: "Seed worker for CAT3.",
    },
  });

  await prisma.workerVehicleAssignment.updateMany({
    where: { worker_id: worker.worker_id },
    data: { status: "Inactive", end_datetime: new Date() },
  });

  await prisma.workerVehicleAssignment.create({
    data: {
      worker_id: worker.worker_id,
      vehicle_id: dryVehicle.vehicle_id,
      start_datetime: new Date("2025-01-10"),
      status: "Active",
    },
  });

  await prisma.entityDocument.updateMany({
    where: { entity_type: WORKER_ENTITY_TYPE, entity_id: worker.worker_id },
    data: { status: "Inactive" },
  });
  await prisma.document.updateMany({
    where: {
      entity_documents: {
        some: { entity_type: WORKER_ENTITY_TYPE, entity_id: worker.worker_id },
      },
    },
    data: { status: "Inactive" },
  });

  const seededDocs = [
    {
      key: "identity_document",
      expiration_date: new Date("2029-10-01"),
      file_name: "identity-document-laura.pdf",
    },
    {
      key: "driver_license",
      expiration_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      file_name: "driver-license-laura.pdf",
    },
    {
      key: "employment_contract",
      expiration_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      file_name: "contract-laura.pdf",
    },
  ];

  const today = new Date();
  for (const definition of PREDEFINED_WORKER_DOCUMENTS) {
    const seeded = seededDocs.find((item) => item.key === definition.key);
    const documentType = await prisma.documentType.findUniqueOrThrow({
      where: {
        entity_type_key: {
          entity_type: WORKER_ENTITY_TYPE,
          key: definition.key,
        },
      },
    });

    const createdDocument = await prisma.document.create({
      data: {
        document_type_id: documentType.document_type_id,
        document_key: definition.key,
        display_name: definition.name,
        original_filename: seeded?.file_name ?? null,
        stored_filename: seeded?.file_name ?? null,
        file_path: seeded
          ? `/uploads/workers/${worker.worker_id}/${seeded.file_name}`
          : null,
        mime_type: seeded ? "application/pdf" : null,
        issue_date: today,
        expiration_date: seeded?.expiration_date ?? today,
        notes: null,
        security_level: DEFAULT_SECURITY_LEVEL,
        status: seeded
          ? getDocumentStatus(true, seeded.expiration_date)
          : "Active",
      },
    });

    await prisma.entityDocument.create({
      data: {
        document_id: createdDocument.document_id,
        entity_type: WORKER_ENTITY_TYPE,
        entity_id: worker.worker_id,
        status: "Active",
      },
    });
  }
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
