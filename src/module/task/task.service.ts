import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import { ICreateTask, type IAddComment, type IUpdateTaskStatus } from "./task.interface";

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

const updateTaskStatus = async (
  taskId: string,
  userId: string,
  payload: IUpdateTaskStatus,
) => {
  const { columnId, status } = payload;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          organization: {
            include: { members: true },
          },
        },
      },
      column: true,
    },
  });
  if (!task || task.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Task not found");
  }

  const isMember = task.project.organization.members.some(
    (m) => m.userId === userId,
  );
  if (!isMember) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Access denied. You are not a member of this organization",
    );
  }

  const targetColumn = await prisma.column.findUnique({
    where: { id: columnId },
  });
  if (!targetColumn) {
    throw new AppError(httpStatus.NOT_FOUND, "Target Kanban Column not found");
  }
  const oldStatus = task.status;

  const result = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        columnId,
        status,
      },
    });

    await tx.activityLog.create({
      data: {
        organizationId: task.project.organizationId,
        taskId: task.id,
        userId: userId,
        action: "TASK_STATUS_UPDATED",
        details: `Moved task '${task.title}' status from ${oldStatus} to ${status} (Column: ${targetColumn.title})`,
      },
    });
    return updatedTask;
  });
  return result;
};

const softDeleteTask = async (taskId: string, userId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          organization: {
            include: { members: true },
          },
        },
      },
    },
  });
  if (!task || task.isDeleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Task not found or already deleted",
    );
  }

  const requesterMember = task.project.organization.members.find(
    (m) => m.userId === userId,
  );

  const isOwnerOrManager =
    requesterMember &&
    (requesterMember.role === Role.MANAGER ||
      task.project.organization.ownerId === userId);

  const isCreator = task.userId === userId;

  if (!isOwnerOrManager && !isCreator) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only Organization Owner, Manager, or Task Creator can delete this task",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const deletedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await tx.activityLog.create({
      data: {
        organizationId: task.project.organizationId,
        taskId: task.id,
        userId: userId,
        action: "TASK_DELETED",
        details: `Soft deleted task '${task.title}'`,
      },
    });
    return deletedTask;
  });
  return result;
};

const addComment = async (
  taskId: string,
  userId: string,
  payload: IAddComment,
) => {
  const { content } = payload;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          organization: {
            include: { members: true },
          },
        },
      },
    },
  });

  if (!task || task.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Task not found");
  }

  const isMember = task.project.organization.members.some(
    (m) => m.userId === userId,
  );

  if (!isMember) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Access denied. You are not a member of this organization",
    );
  }


  const comment = await prisma.comment.create({
    data: {
      taskId,
      userId,
      content,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  });
  return comment;
};


const getTaskActivityLogs = async (taskId: string, userId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          organization: {
            include: { members: true },
          },
        },
      },
    },
  });
  if (!task || task.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Task not found");
  }


  const isMember = task.project.organization.members.some(
    (m) => m.userId === userId,
  );

  if (!isMember) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Access denied. You are not a member of this organization",
    );
  }

  const logs = await prisma.activityLog.findMany({
    where: { organizationId: task.project.organizationId},
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  });
  return logs;
};

export const taskService = {
  createTask,
  updateTaskStatus,
  softDeleteTask,
  getTaskActivityLogs,
  addComment
};
