import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcrypt";
import {
  PREDEFINED_WORKER_DOCUMENTS,
  WORKER_ENTITY_TYPE,
} from "../src/modules/workers/constants";
import { getDocumentStatus } from "../src/utils";
import {
  PREDEFINED_CLIENT_DOCUMENTS,
  CLIENT_ENTITY_TYPE,
} from "../src/modules/clients/constants";
import {
  ADDITIONAL_DOCUMENT_CONFIG,
  DEFAULT_SECURITY_LEVEL,
} from "../src/constants";

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
  const externalPasswordHash = await bcrypt.hash("External1234!", 10);

  await prisma.user.upsert({
    where: { email: "admin@docufast.com" },
    update: {},
    create: {
      email: "admin@docufast.com",
      password_hash: adminPasswordHash,
      full_name: "System Administrator",
      role_id: adminRole.role_id,
      must_change_password: false,
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
      must_change_password: false,
    },
  });

  const clients = [
    {
      client_code: "CL-0001",
      business_name: "FedEx",
      badge_color: "#7c3aed",
      contact_email: "ops@fedex-demo.com",
      contact_phone: "+34 600 111 222",
      contract_start_date: new Date("2025-01-01"),
      contract_end_date: new Date("2026-01-01"),
      status: "Active",
    },
    {
      client_code: "CL-0002",
      business_name: "Seur",
      badge_color: "#2563eb",
      contact_email: "ops@seur-demo.com",
      contact_phone: "+34 600 111 333",
      contract_start_date: new Date("2025-01-01"),
      contract_end_date: new Date("2026-01-01"),
      status: "Active",
    },
    {
      client_code: "CL-0003",
      business_name: "Redur",
      badge_color: "#dc2626",
      contact_email: "ops@redur-demo.com",
      contact_phone: "+34 600 111 444",
      contract_start_date: new Date("2025-01-01"),
      contract_end_date: new Date("2026-01-01"),
      status: "Active",
    },
  ];

  for (const client of clients) {
    await prisma.client.upsert({
      where: { client_code: client.client_code },
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
    {
      license_plate: "3456JKL",
      vehicle_type: "Dry",
      company_owner: "Rumofast",
      contract_start_date: new Date("2025-01-15"),
      contract_end_date: new Date("2026-01-15"),
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
    ADDITIONAL_DOCUMENT_CONFIG,
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

  const clientDocumentTypes = [
    ...PREDEFINED_CLIENT_DOCUMENTS,
    ADDITIONAL_DOCUMENT_CONFIG,
  ];
  for (const definition of clientDocumentTypes) {
    await prisma.documentType.upsert({
      where: {
        entity_type_key: {
          entity_type: CLIENT_ENTITY_TYPE,
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
        entity_type: CLIENT_ENTITY_TYPE,
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

  // Helper function to create worker with user and vehicle assignment
  const createWorkerWithUser = async (workerData: {
    code: string;
    firstName: string;
    lastName1: string;
    lastName2: string;
    email: string;
    phone: string;
    documentNumber: string;
    socialSecurityNumber: string;
    birthDate: Date;
    address: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    clientId: number;
    vehicleId: number;
    contractStartDate: Date;
    contractEndDate: Date;
    notes?: string;
  }) => {
    const passwordHash = await bcrypt.hash(`${workerData.firstName}1234`, 10);
    const user = await prisma.user.upsert({
      where: { email: workerData.email },
      update: {},
      create: {
        email: workerData.email,
        password_hash: passwordHash,
        full_name: `${workerData.firstName} ${workerData.lastName1} ${workerData.lastName2}`,
        role_id: workerRole.role_id,
        must_change_password: false,
      },
    });

    const worker = await prisma.worker.upsert({
      where: { company_worker_code: workerData.code },
      update: {
        first_name: workerData.firstName,
        last_name_1: workerData.lastName1,
        last_name_2: workerData.lastName2,
        email: workerData.email,
        phone: workerData.phone,
        document_number: workerData.documentNumber,
        social_security_number: workerData.socialSecurityNumber,
        birth_date: workerData.birthDate,
        address: workerData.address,
        emergency_contact_name: workerData.emergencyContactName,
        emergency_contact_phone: workerData.emergencyContactPhone,
        status: "Active",
        client_id: workerData.clientId,
        current_vehicle_id: workerData.vehicleId,
        user_id: user.user_id,
        contract_start_date: workerData.contractStartDate,
        contract_end_date: workerData.contractEndDate,
        notes: workerData.notes,
      },
      create: {
        company_worker_code: workerData.code,
        first_name: workerData.firstName,
        last_name_1: workerData.lastName1,
        last_name_2: workerData.lastName2,
        email: workerData.email,
        phone: workerData.phone,
        document_number: workerData.documentNumber,
        social_security_number: workerData.socialSecurityNumber,
        birth_date: workerData.birthDate,
        address: workerData.address,
        emergency_contact_name: workerData.emergencyContactName,
        emergency_contact_phone: workerData.emergencyContactPhone,
        status: "Active",
        client_id: workerData.clientId,
        current_vehicle_id: workerData.vehicleId,
        user_id: user.user_id,
        contract_start_date: workerData.contractStartDate,
        contract_end_date: workerData.contractEndDate,
        notes: workerData.notes,
      },
    });

    await prisma.workerVehicleAssignment.updateMany({
      where: { worker_id: worker.worker_id },
      data: { status: "Inactive", end_datetime: new Date() },
    });

    await prisma.workerVehicleAssignment.create({
      data: {
        worker_id: worker.worker_id,
        vehicle_id: workerData.vehicleId,
        start_datetime: workerData.contractStartDate,
        status: "Active",
      },
    });

    return worker;
  };

  const fedexClient = await prisma.client.findUniqueOrThrow({
    where: { client_code: "CL-0001" },
  });
  const seurClient = await prisma.client.findUniqueOrThrow({
    where: { client_code: "CL-0002" },
  });
  const redurClient = await prisma.client.findUniqueOrThrow({
    where: { client_code: "CL-0003" },
  });
  const dryVehicle = await prisma.vehicle.findUniqueOrThrow({
    where: { license_plate: "1234ABC" },
  });
  const reeferVehicle = await prisma.vehicle.findUniqueOrThrow({
    where: { license_plate: "5678DEF" },
  });
  const truckVehicle = await prisma.vehicle.findUniqueOrThrow({
    where: { license_plate: "9012GHI" },
  });
  const dryVehicle2 = await prisma.vehicle.findUniqueOrThrow({
    where: { license_plate: "3456JKL" },
  });

  // Create workers
  const workersData = [
    {
      code: "WK-0001",
      firstName: "Laura",
      lastName1: "Gomez",
      lastName2: "Ruiz",
      email: "laura.gomez@docufast.com",
      phone: "+34 600 222 333",
      documentNumber: "12345678A",
      socialSecurityNumber: "28/1234567890",
      birthDate: new Date("1995-05-04"),
      address: "Calle Mayor 10, Barcelona",
      emergencyContactName: "Ana Gomez",
      emergencyContactPhone: "+34 600 333 444",
      clientId: fedexClient.client_id,
      vehicleId: dryVehicle.vehicle_id,
      contractStartDate: new Date("2025-01-10"),
      contractEndDate: new Date("2026-12-31"),
      notes: "Seed worker for CAT3.",
      withDocuments: true,
    },
    {
      code: "WK-0002",
      firstName: "Carlos",
      lastName1: "Martinez",
      lastName2: "Lopez",
      email: "carlos.martinez@docufast.com",
      phone: "+34 600 444 555",
      documentNumber: "23456789B",
      socialSecurityNumber: "28/2345678901",
      birthDate: new Date("1988-03-15"),
      address: "Avenida Diagonal 50, Barcelona",
      emergencyContactName: "Maria Martinez",
      emergencyContactPhone: "+34 600 555 666",
      clientId: fedexClient.client_id,
      vehicleId: dryVehicle2.vehicle_id,
      contractStartDate: new Date("2025-01-15"),
      contractEndDate: new Date("2026-12-31"),
      withDocuments: false,
    },
    {
      code: "WK-0003",
      firstName: "Ana",
      lastName1: "Rodriguez",
      lastName2: "Garcia",
      email: "ana.rodriguez@docufast.com",
      phone: "+34 600 777 888",
      documentNumber: "34567890C",
      socialSecurityNumber: "28/3456789012",
      birthDate: new Date("1992-07-22"),
      address: "Calle Gran Via 100, Madrid",
      emergencyContactName: "Pedro Rodriguez",
      emergencyContactPhone: "+34 600 888 999",
      clientId: seurClient.client_id,
      vehicleId: reeferVehicle.vehicle_id,
      contractStartDate: new Date("2025-02-01"),
      contractEndDate: new Date("2026-12-31"),
      withDocuments: false,
    },
    {
      code: "WK-0004",
      firstName: "Miguel",
      lastName1: "Fernandez",
      lastName2: "Sanchez",
      email: "miguel.fernandez@docufast.com",
      phone: "+34 611 222 333",
      documentNumber: "45678901D",
      socialSecurityNumber: "28/4567890123",
      birthDate: new Date("1990-11-30"),
      address: "Paseo de la Castellana 200, Madrid",
      emergencyContactName: "Laura Fernandez",
      emergencyContactPhone: "+34 611 333 444",
      clientId: redurClient.client_id,
      vehicleId: truckVehicle.vehicle_id,
      contractStartDate: new Date("2025-03-01"),
      contractEndDate: new Date("2026-12-31"),
      withDocuments: false,
    },
  ];

  for (const workerInfo of workersData) {
    const { withDocuments, ...workerData } = workerInfo;
    const worker = await createWorkerWithUser(workerData);

    // Only add documents for Laura
    if (withDocuments) {
      await prisma.entityDocument.updateMany({
        where: { entity_type: WORKER_ENTITY_TYPE, entity_id: worker.worker_id },
        data: { status: "Inactive" },
      });
      await prisma.document.updateMany({
        where: {
          entity_documents: {
            some: {
              entity_type: WORKER_ENTITY_TYPE,
              entity_id: worker.worker_id,
            },
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
    }
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
