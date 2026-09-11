import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import { ICreateTeam, IAddTeamMember } from "./team.interface";

const createTeam = async (userId: string, payload: ICreateTeam) => {
  const { organizationId, name, description } = payload;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user || user.status === UserStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "User account is blocked or invalid",
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { members: true },
  });
  if (!org) {
    throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
  }

  const requesterMember = org.members.find((m) => m.userId === userId);
  if (
    !requesterMember ||
    (requesterMember.role !== Role.MANAGER && org.ownerId !== userId)
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only Organization Owner or Manager can create teams",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        organizationId,
        name,
        description,
      },
    });
    await tx.teamMember.create({
      data: {
        teamId: team.id,
        userId: userId,
      },
    });
    return team;
  });
  return result;
};

const addTeamMember = async (
  teamId: string,
  requesterUserId: string,
  payload: IAddTeamMember,
) => {
  const { userId: memberUserIdToAdd } = payload;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      organization: {
        include: { members: true },
      },
      members: true,
    },
  });

  if (!team) {
    throw new AppError(httpStatus.NOT_FOUND, "Team not found");
  }
  const isOrgMember = team.organization.members.some(
    (m) => m.userId === memberUserIdToAdd,
  );

  if (!isOrgMember) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "User must be invited to the Organization first before joining a Team",
    );
  }

  const alreadyInTeam = team.members.some(
    (m) => m.userId === memberUserIdToAdd,
  );

  if (alreadyInTeam) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User is already a member of this team",
    );
  }

  const newTeamMember = await prisma.teamMember.create({
    data: {
      teamId,
      userId: memberUserIdToAdd,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  });
  return newTeamMember;
};

const getTeamById = async (teamId: string, userId: string) => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      organization: {
        include: { members: true },
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
    },
  });
  if (!team) {
    throw new AppError(httpStatus.NOT_FOUND, "Team not found");
  }
  const isOrgMember = team.organization.members.some(
    (m) => m.userId === userId,
  );
  if (!isOrgMember) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Access denied. You are not a member of this organization",
    );
  }
  return team;
};

export const teamService = {
  createTeam,
  addTeamMember,
  getTeamById,
};
