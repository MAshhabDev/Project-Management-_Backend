import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";
import jwt, { SignOptions, type JwtPayload } from "jsonwebtoken";
import type { ICreate, IGoogleLoginPayload, ILogin } from "./auth.interface";
import { jwtUtils } from "../../utils/jwt";
import type { TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/googlrAuth";
import {
  AuthProvider,
  Role,
  UserStatus,
} from "../../../generated/prisma/enums";
import { AppError } from "../../utils/AppError";
import path from "path";
import httpStatus from "http-status";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import ejs from "ejs";

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
    expiresIn: config.jwt_access_expires_in,
  } as SignOptions);

  const refreshToken = jwt.sign(jwtPayload, config.jwt_refresh_secret, {
    expiresIn: config.jwt_refresh_expires_in,
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
      expiresIn: config.jwt_access_expires_in,
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

const googleLogin = async (payload: IGoogleLoginPayload) => {
  let googleIdTokenPayload: TokenPayload | null | undefined = null;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: config.google_client_id,
    });

    googleIdTokenPayload = ticket.getPayload();
  } catch (error) {}

  if (!googleIdTokenPayload) {
    throw new Error("Invalid or Google User NAme not found");
  }

  if (!googleIdTokenPayload.name) {
    throw new Error("Invalid or expired Id Token");
  }

  if (!googleIdTokenPayload.email) {
    throw new Error("Google Email Not Found");
  }

  const ifUserExistWithGoogle = await prisma.user.findUnique({
    where: {
      email: googleIdTokenPayload.email,
      googleId: googleIdTokenPayload.sub,
    },
  });

  let user = ifUserExistWithGoogle;

  if (!ifUserExistWithGoogle) {
    const userExistWithCredential = await prisma.user.findUnique({
      where: {
        email: googleIdTokenPayload.email,
        authProvider: AuthProvider.CREDENTIAL,
      },
    });

    if (userExistWithCredential) {
      if (!userExistWithCredential.emailVerified) {
        throw new AppError(httpStatus.FORBIDDEN, "Email Not Verified");
      }

      if (userExistWithCredential.status === UserStatus.DELETED) {
        throw new AppError(httpStatus.FORBIDDEN, "User Is Deleted");
      }

      user = await prisma.user.update({
        where: {
          id: userExistWithCredential.id,
        },
        data: {
          googleId: googleIdTokenPayload.sub,
        },
      });
    }
  } else {
    user = await prisma.user.create({
      data: {
        name: googleIdTokenPayload.name,
        email: googleIdTokenPayload.email,
        role: Role.MEMBER,
        googleId: googleIdTokenPayload.sub,
        authProvider: AuthProvider.GOOGLE,
        emailVerified: true,
      },
    });

    const templatePath = path.join(
      process.cwd(),
      "src/app/templates/patient-welcome-email.ejs",
    );

    const templateData = {
      name: user.name,
    };

    const html = await ejs.renderFile(templatePath, templateData);

    await transporter.sendMail({
      from: config.email_sender,
      to: user.email,
      subject: "Welcome To PH Healthcare System",
      // text : `Your OTP is ${otp}`
      // html: `<h1>Your OTP is ${otp}</h1>`
      html,
    });
  }

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, "User Is Blocked");
  }

  if (user.status === UserStatus.DELETED) {
    throw new AppError(httpStatus.FORBIDDEN, "User Is Deleted");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

export const authService = { createUser, refreshTokenIntoDb, logInUser, getMe };
