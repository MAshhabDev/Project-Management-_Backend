import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { Role } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { AppError } from "./AppError";
import config from "../config";

// ১. Seed Admin
export const seedAdmin = async () => {
  try {
    const isAdminExist = await prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
      },
    });

    if (isAdminExist) {
      console.log("Admin Already Exists!");
      return;
    }

    const name = config.admin_name || "Super Admin";
    const email = config.admin_email || "admin@gmail.com";
    const password = config.admin_password || "password123";

    if (!name || !email || !password) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Admin Name, Email, Password Missing In Env File!!!"
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds || 10)
    );

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.ADMIN,
        emailVerified: true,
      },
    });

    console.log("Admin Created Successfully : ", admin.email);
  } catch (error) {
    console.log("Error Seeding Admin : ", error);

    if (config.admin_email) {
      await prisma.user.deleteMany({
        where: {
          email: config.admin_email,
        },
      });
    }
  }
};

// ২. Seed Tester Manager
export const seedManager = async () => {
  try {
    const email = config.manager_email || "manager@gmail.com";

    const isTesterManagerExist = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (isTesterManagerExist) {
      console.log("Tester Manager Already Exists!");
      return;
    }

    const name = config.manager_name || "Tester Manager";
    const password = config.manager_password || "password123";

    if (!name || !email || !password) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Tester Manager Name, Email, Password Missing In Env File!!!"
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds || 10)
    );

    const testerManager = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.MANAGER,
        emailVerified: true,
      },
    });

    console.log("Tester Manager Created : ", testerManager.email);
  } catch (error) {
    console.log("Error Seeding Tester Manager : ", error);
  }
};

// ৩. Seed Tester Member
export const seedMember = async () => {
  try {
    const email = config.member_email || "member@gmail.com";

    const isTesterMemberExist = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (isTesterMemberExist) {
      console.log("Tester Member Already Exists!");
      return;
    }

    const name = config.member_name || "Tester Member";
    const password = config.member_password || "password123";

    if (!name || !email || !password) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Tester Member Name, Email, Password Missing In Env File!!!"
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds || 10)
    );

    const testerMember = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.MEMBER,
        emailVerified: true,
      },
    });

    console.log("Tester Member Created : ", testerMember.email);
  } catch (error) {
    console.log("Error Seeding Tester Member : ", error);
  }
};

export const seedAll = async () => {
  await seedAdmin();
  await seedManager();
  await seedMember();
};