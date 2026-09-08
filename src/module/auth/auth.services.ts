import { config } from "../../config";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";
import jwt, { SignOptions, type JwtPayload } from "jsonwebtoken";
import type { ICreate, ILogin } from "./auth.interface";
import { jwtUtils } from "../../utils/jwt";

const createUser = async (payload: ICreate) => {
  const { name, email, password, role } = payload;

  const userExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (userExist) {
    throw new Error("User Already Exist");
  }

  const hashPass = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds),
  );

  const createUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashPass,
      role,
    },
  });

  const user = await prisma.user.findUnique({
    where: {
      id: createUser.id,
      email: createUser.email,
    },

    omit: {
      password: true,
    },
  });

  return user;
};

const logInUser = async (payload: ILogin) => {
  const { email, password } = payload;

  if (!email || !password) {
    throw new Error("Email and password are required!");
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("Did not find user for this email");
  }

  const matchPass = await bcrypt.compare(password, user.password!);

  if (!matchPass) {
    throw new Error("Did not match the password");
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(jwtPayload, config.jwt_access_secret, {
    expiresIn: config.jwt_access_expires,
  } as SignOptions);

  const refreshToken = jwt.sign(jwtPayload, config.jwt_refresh_secret, {
    expiresIn: config.jwt_refresh_expires,
  } as SignOptions);

  return { accessToken, refreshToken };
};

const refreshTokenIntoDb = async (refreshToken: string) => {
  const verified = jwtUtils.verifyToken(
    refreshToken,
    config.jwt_refresh_secret,
  );

  if (!verified.success) {
    throw new Error(verified.error);
  }

  const { id } = verified.data as JwtPayload;

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id,
    },
  });
  if (user.status === "BLOCKED") {
    throw new Error("User Is Blocked");
  }

  const jwtPayload = {
    id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    {
      expiresIn: config.jwt_access_expires,
    } as SignOptions,
  );

  return { accessToken };
};

const getMe = async (id: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id,
    },
    omit: {
      password: true,
    },
  });

  return user;
};

export const authService = { createUser, refreshTokenIntoDb, logInUser, getMe };
