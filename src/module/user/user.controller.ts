import { Request, Response } from "express";
import httpStatus from "http-status";
import { userService } from "./user.service";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

const updateProfileController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const file = req.file;

    const result = await userService.updateProfile(userId as string, req.body, file);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User profile updated successfully",
      data: result,
    });
  }
);

export const userController = {
  updateProfileController,
};