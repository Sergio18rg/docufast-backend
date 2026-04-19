import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { generateToken } from "../../lib/jwt";
import { MESSAGES } from "./constants";
import { STATUS } from "../../constants";

type LoginInput = {
  email: string;
  password: string;
};

type ChangePasswordInput = {
  userId: number;
  newPassword: string;
};

const mapUserResponse = (user: any) => ({
  user_id: user.user_id,
  email: user.email,
  full_name: user.full_name,
  status: user.status,
  must_change_password: !!user.must_change_password,
  role: {
    role_id: user.role.role_id,
    name: user.role.name,
  },
});

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

export { loginUser, changePassword };
