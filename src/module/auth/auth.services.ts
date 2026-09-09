import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";
import jwt, { SignOptions, type JwtPayload } from "jsonwebtoken";
import type { ICreate, IForgotPasswordPayload, IGoogleLoginPayload, ILogin, IVerifyEmailPayload } from "./auth.interface";
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
import crypto from "crypto";
import { redisClient } from "../../lib/redis";

const createUser = async (payload: ICreate) => {
  const { name, email, password, role } = payload;

  const userExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (userExist) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  const hashPass = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds),
  );

  const expirationSeconds = 5 * 60;

  const otpKey = `registration-otp:${email}`;
  const otpValue = crypto.randomInt(100000, 1000000).toString();

  await redisClient.set(otpKey, otpValue, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const userRegistrationKey = `registration-data:${email}`;

  const redisPayload = {
    name,
    email,
    password: hashPass,
  };

  await redisClient.set(userRegistrationKey, JSON.stringify(redisPayload), {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/register-user-otp.ejs",
  );

  const templateData = {
    name,
    email,
    otp: otpValue,
    expirationMinutes: expirationSeconds / 60,
  };

  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Email Verification",
    // text : `Your OTP is ${otp}`
    // html: `<h1>Your OTP is ${otp}</h1>`
    html,
  });
};

const verifyEmail = async (payload: IVerifyEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist?.status === "BLOCKED") {
    throw new AppError(httpStatus.FORBIDDEN, "User is Blocked");
  }

  if (isUserExist?.emailVerified) {
    throw new AppError(httpStatus.CONFLICT, "Email ALready Verified");
  }

  if (isUserExist?.status === "DELETED") {
    throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
  }

  const otpKey = `registration-otp:${email}`;
  const redisOtp = await redisClient.get(otpKey);

  if (!redisOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }

  if (redisOtp !== otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
  }

  await redisClient.del(otpKey);

  const registrationKey = `registration-data:${email}`;

  const redisData = await redisClient.get(registrationKey);

  if (!redisData) {
    throw new AppError(httpStatus.NOT_FOUND, "User Does not Exist");
  }

  const userPayload: ICreate = JSON.parse(redisData);

  const createdUser = await prisma.user.create({
    data: {
      name: userPayload.name,
      email: userPayload.email,
      password: userPayload.password,
      role: Role.MEMBER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    omit: { password: true },
  });

  await redisClient.del(registrationKey);

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/welcome-email.ejs",
  );

  const templateData = {
    name: createdUser.name,
  };

  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Welcome To Project Management System",
    // text : `Your OTP is ${otp}`
    // html: `<h1>Your OTP is ${otp}</h1>`
    html,
  });

  const { ...user } = createdUser;
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
    user,
    accessToken,
    refreshToken,
  };
};

const logInUser = async (payload: ILogin) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("Did not find user for this email");
  }

  if (user.status === UserStatus.DELETED) {
    throw new AppError(httpStatus.FORBIDDEN, "User is deleted");
  }

  if (user.password === null && user.googleId !== null) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "User Already Has Account Registered With Google. Try To Login With Google.",
    );
  }

  const matchPass = await bcrypt.compare(password, user.password!);

  if (!matchPass) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

  const jwtPayload = {
    userId: user.id,
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
      "src/app/templates/welcome-email.ejs",
    );

    const templateData = {
      name: user.name,
    };

    const html = await ejs.renderFile(templatePath, templateData);

    await transporter.sendMail({
      from: config.email_sender,
      to: user.email,
      subject: "Welcome To Project Management System",
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


const forgotPassword=async(payload: IForgotPasswordPayload)=>{

  const {email}=payload

  const isUserExist = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User Does Not Exist!");
	}

	if (isUserExist.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Blocked");
	}

	if (!isUserExist.emailVerified) {
		throw new AppError(httpStatus.FORBIDDEN, "User Not Verified");
	}

	if (isUserExist.status === "DELETED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
	}

	if (isUserExist.googleId && isUserExist.authProvider === "GOOGLE") {
		throw new AppError(httpStatus.BAD_REQUEST, "User Has Account With Google");
	}


  const otp = crypto.randomInt(100000, 1000000).toString();

	const key = `forgot-password-otp:${isUserExist.email}`;
  	const expirationSeconds = 5 * 60;

await redisClient.set(key, otp, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

  const templatePath = path.join(
		process.cwd(),
		"src/app/templates/forgot-password.ejs",
	);

	const templateData = {
		name: isUserExist.name,
		otp,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: isUserExist.email,
		subject: "Forgot Password",
		// text : `Your OTP is ${otp}`
		// html: `<h1>Your OTP is ${otp}</h1>`
		html,
	});
}

export const authService = { createUser, refreshTokenIntoDb, logInUser, getMe };
