import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { UserStatus } from "../../../generated/prisma/enums";
import { IToggleUserBan } from "./admin.interface";

const getDashboardStats = async () => {
  const [
    totalUsers,
    totalOrganizations,
    totalProjects,
    totalTasks,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count({
      where: { status: { not: UserStatus.DELETED } },
    }),

    prisma.organization.count(),

    prisma.project.count({
      where: { isDeleted: false },
    }),

    prisma.task.count({
      where: { isDeleted: false },
    }),

    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    totalUsers,
    totalOrganizations,
    totalProjects,
    totalTasks,
    recentUsers,
  };
};

const updateUserStatus = async (
  adminUserId: string,
  targetUserId: string,
  payload: IToggleUserBan,
) => {
  const { status } = payload;

  if (adminUserId === targetUserId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Admin cannot ban their own account",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user || user.status === UserStatus.DELETED) {
    throw new AppError(httpStatus.NOT_FOUND, "Target user not found");
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      status,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBanned: true,
      status: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

export const adminService = {
  getDashboardStats,
  updateUserStatus
};
