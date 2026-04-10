import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { generateToken } from "../../lib/jwt";

type LoginInput = {
  email: string;
  password: string;
};

const loginUser = async ({ email, password }: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: true,
    },
  });

  if (!user) throw new Error("Invalid credentials");

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) throw new Error("Invalid credentials");

  const token = generateToken({
    user_id: user.user_id,
    email: user.email,
    role: user.role.name,
  });

  return {
    token,
    user: {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      status: user.status,
      role: {
        role_id: user.role.role_id,
        name: user.role.name,
      },
    },
  };
};

export { loginUser };
