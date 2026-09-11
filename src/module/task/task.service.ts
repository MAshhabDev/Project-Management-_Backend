import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { UserStatus } from "../../../generated/prisma/enums";
import { ICreateTask } from "./task.interface";

const createTask = async (creatorUserId: string, payload: ICreateTask) => {
  const {
    projectId,
    columnId,
    title,
    description,
    priority,
    dueDate,
    assigneeId,
  } = payload;

  const creator = await prisma.user.findUnique({
    where: { id: creatorUserId },
  });

  if (!creator || creator.status === UserStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Creator account is blocked or invalid",
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: {
        include: { members: true },
      },
    },
  });

  if (!project || project.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  const isCreatorOrgMember = project.organization.members.some(
    (m) => m.userId === creatorUserId,
  );

  if (!isCreatorOrgMember) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Access denied. You are not a member of this organization",
    );
  }

  // 3. Check Assignee Membership
  if (assigneeId) {
    const isAssigneeOrgMember = project.organization.members.some(
      (m) => m.userId === assigneeId,
    );

    if (!isAssigneeOrgMember) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Assignee must be a member of the organization",
      );
    }
  }

  const column = await prisma.column.findUnique({
    where: { id: columnId },
  });

  if (!column) {
    throw new AppError(httpStatus.NOT_FOUND, "Kanban Column not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        projectId,
        columnId,
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        userId: assigneeId,
      },
    });


    await tx.activityLog.create({
      data: {
        organizationId: project.organizationId,
        taskId: task.id,
        userId: creatorUserId,
        action: "TASK_CREATED",
        details: `Task '${title}' created in ${column.title}`,
      },
    });

    return task;
  });

  return result;
};

export const taskService = {
  createTask,
};
