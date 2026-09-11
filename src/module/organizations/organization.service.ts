import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import type { ICreateOrganization, IInviteMember } from "./organization.interface";

const createOrganization = async (
  userId: string,
  payload: ICreateOrganization,
) => {
  const { name } = payload;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, "Your account is blocked");
  }

  // Generate unique slug
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");

  const existingOrg = await prisma.organization.findUnique({
    where: { slug },
  });

  if (existingOrg) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Organization with this name already exists",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name,
        slug,
        ownerId: userId,
      },
    });

    await tx.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: userId,
        roleInOrg: Role.MANAGER,
      },
    });

    return org;
  });

  return result;
};

// for member

const getMyOrganizations = async (userId: string) => {
  const orgs = await prisma.organization.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      },
    },
  });

  return orgs;
};

const getOrganizationById = async (orgId: string, userId: string) => {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      owner: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
            },
          },
        },
      },
      teams: true,
      projects: {
        where: { isDeleted: false },
      },
    },
  });

  if (!org) {
    throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
  }

  const isMember = org.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Access denied. You are not a member of this organization",
    );
  }

  return org;
};

const inviteMember = async (
  orgId: string,
  requesterUserId: string,
  payload: IInviteMember,
) => {
  const { email, role } = payload;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { members: true },
  });

  if (!org) {
    throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
  }

  // Check if requester is Owner or Manager
  const requesterMember = org.members.find((m) => m.userId === requesterUserId);
  if (
    !requesterMember ||
    (requesterMember.role!== Role.MANAGER &&
      org.ownerId !== requesterUserId)
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only Organization Owner or Manager can invite members",
    );
  }

  // Find user by email to invite
  const userToInvite = await prisma.user.findUnique({
    where: { email },
  });

  if (!userToInvite) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "User with this email is not registered",
    );
  }

  // Check if already a member
  const alreadyMember = org.members.some((m) => m.userId === userToInvite.id);

  if (alreadyMember) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User is already a member of this organization",
    );
  }

  // Add Member
  const newMember = await prisma.organizationMember.create({
    data: {
      organizationId: orgId,
      userId: userToInvite.id,
      roleInOrg: role || Role.MEMBER,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  });

  return newMember;
};

export const organizationService = {
  createOrganization,
  getMyOrganizations,
  getOrganizationById,
  inviteMember,
};
