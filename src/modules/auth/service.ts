import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { generateToken } from "../../lib/jwt";
import { MESSAGES } from "./constants";
import { STATUS, ROLES } from "../../constants";
import { mapUserResponse, buildProfileDocumentDto } from "./utils";

type LoginInput = {
  email: string;
  password: string;
};

type ChangePasswordInput = {
  userId: number;
  newPassword: string;
};

const getWorkerProfileByUserId = async (userId: number, role: string) => {
  const worker = await prisma.worker.findFirst({
    where: { user_id: userId },
    include: {
      client: true,
      current_vehicle: true,
      user: { include: { role: true } },
    },
  });

  if (!worker || !worker.user) return null;

  const entityDocuments = await prisma.entityDocument.findMany({
    where: {
      entity_type: "Worker",
      entity_id: worker.worker_id,
      status: STATUS.ACTIVE,
      document: {
        status: { not: STATUS.INACTIVE },
        security_level: { in: ["Private", "External"] },
      },
    },
    include: {
      document: { include: { document_type: true } },
    },
    orderBy: [{ created_at: "desc" }],
  });

  const documents = entityDocuments.map(buildProfileDocumentDto);
  const photoDocument = documents.find(
    (document) => document.document_key === "worker_photo" && document.file_url,
  );

  return {
    user_id: worker.user.user_id,
    email: worker.user.email,
    role,
    must_change_password: !!worker.user.must_change_password,
    full_name: worker.user.full_name,
    status: worker.user.status,
    first_name: worker.first_name,
    last_name_1: worker.last_name_1,
    last_name_2: worker.last_name_2,
    document_number: worker.document_number,
    social_security_number: worker.social_security_number,
    birth_date: worker.birth_date,
    address: worker.address,
    phone: worker.phone,
    emergency_contact_name: worker.emergency_contact_name,
    emergency_contact_phone: worker.emergency_contact_phone,
    contract_start_date: worker.contract_start_date,
    current_vehicle: worker.current_vehicle
      ? {
          vehicle_id: worker.current_vehicle.vehicle_id,
          license_plate: worker.current_vehicle.license_plate,
          vehicle_type: worker.current_vehicle.vehicle_type,
          company_owner: worker.current_vehicle.company_owner,
          status: worker.current_vehicle.status,
          contract_start_date: worker.current_vehicle.contract_start_date,
          contract_end_date: worker.current_vehicle.contract_end_date,
          notes: worker.current_vehicle.notes,
        }
      : null,
    client: worker.client
      ? {
          client_id: worker.client.client_id,
          client_code: worker.client.client_code,
          business_name: worker.client.business_name,
          contact_email: worker.client.contact_email,
          contact_phone: worker.client.contact_phone,
          badge_color: worker.client.badge_color,
          contract_start_date: worker.client.contract_start_date,
          contract_end_date: worker.client.contract_end_date,
          status: worker.client.status,
          notes: worker.client.notes,
        }
      : null,
    documents,
    photo_url: photoDocument?.file_url ?? null,
  };
};

const getExternalProfileByUserId = async (userId: number, role: string) => {
  const client = await prisma.client.findFirst({
    where: { user_id: userId },
    include: { user: { include: { role: true } } },
  });

  if (!client || !client.user) return null;

  return {
    user_id: client.user.user_id,
    email: client.user.email,
    role,
    must_change_password: !!client.user.must_change_password,
    full_name: client.user.full_name,
    status: client.user.status,
    badge_color: client.badge_color,
  };
};

const getProfileByUserId = async (userId: number, role: string) => {
  if (role === ROLES.EXTERNAL) {
    return getExternalProfileByUserId(userId, role);
  }

  return getWorkerProfileByUserId(userId, role);
};

const loginUser = async ({ email, password }: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user) throw new Error(MESSAGES.ERROR.INVALID_CREDENTIALS);
  if (user.status === STATUS.INACTIVE)
    throw new Error(MESSAGES.ERROR.INACTIVE_USER);

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) throw new Error(MESSAGES.ERROR.INVALID_CREDENTIALS);

  const token = generateToken({
    user_id: user.user_id,
    email: user.email,
    role: user.role.name,
    must_change_password: user.must_change_password,
  });

  return {
    token,
    user: mapUserResponse(user),
  };
};

const changePassword = async ({ userId, newPassword }: ChangePasswordInput) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    include: { role: true },
  });

  if (!user) throw new Error(MESSAGES.ERROR.USER_NOT_FOUND);
  if (user.status === STATUS.INACTIVE)
    throw new Error(MESSAGES.ERROR.INACTIVE_USER);

  const password_hash = await bcrypt.hash(newPassword, 10);
  const updatedUser = await prisma.user.update({
    where: { user_id: userId },
    data: { password_hash, must_change_password: false },
    include: { role: true },
  });

  const token = generateToken({
    user_id: updatedUser.user_id,
    email: updatedUser.email,
    role: updatedUser.role.name,
    must_change_password: false,
  });

  return {
    token,
    user: mapUserResponse(updatedUser),
  };
};

export { loginUser, changePassword, getProfileByUserId };
