import jwt from "jsonwebtoken";

type JwtPayload = {
  user_id: number;
  email: string;
  role: string;
  must_change_password?: boolean;
};

const EXPIRATION_TIME = "1d";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return secret;
};

const generateToken = (payload: JwtPayload) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: EXPIRATION_TIME,
  });
};

const verifyToken = (token: string) => {
  return jwt.verify(token, getJwtSecret());
};

export { generateToken, verifyToken };
