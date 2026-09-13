import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { adminService } from "./admin.service";

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getDashboardStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin dashboard statistics retrieved successfully",
    data: result,
  });
});

const toggleUserBan = catchAsync(async (req: Request, res: Response) => {
  const adminUserId = req.user?.userId;
  const { id } = req.params;
  const result = await adminService.updateUserStatus(
    adminUserId as string,
    id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User ${req.body.isBanned ? "banned" : "unbanned"} successfully`,
    data: result,
  });
});

export const adminController = {
  getDashboardStats,
  toggleUserBan,
};
