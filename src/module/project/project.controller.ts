import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { projectService } from "./project.service";

const createProject = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await projectService.createProject(userId as string, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Project created with Kanban Board & Columns successfully",
    data: result,
  });
});

export const projectController = {
  createProject,
};
