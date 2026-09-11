import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import { ICreateProject } from "./project.interface";

const createProject = async (userId: string, payload: ICreateProject) => {
  const { organizationId, name, description, startDate, endDate } = payload;

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
      "Only Organization Owner or Manager can create projects",
    );
  }


  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        organizationId,
        userId,
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    });


    const board = await tx.board.create({
      data: {
        projectId: project.id,
        name: "Main Board",
      },
    });

    await tx.column.createMany({
      data: [
        { boardId: board.id, title: "To Do", order: 1 },
        { boardId: board.id, title: "In Progress", order: 2 },
        { boardId: board.id, title: "In Review", order: 3 },
        { boardId: board.id, title: "Done", order: 4 },
      ],
    });

    return project;
  });

  return result;
};




export const projectService = {
  createProject,
};
