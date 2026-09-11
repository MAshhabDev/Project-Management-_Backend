import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { teamService } from "./team.service";

const createTeam = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await teamService.createTeam(userId as string, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Team created successfully",
    data: result,
  });
});

const addTeamMember = catchAsync(async (req: Request, res: Response) => {
  const requesterUserId = req.user?.userId;
  const { id } = req.params;
  const result = await teamService.addTeamMember(
    id as string,
    requesterUserId as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Member added to team successfully",
    data: result,
  });
});

const getTeamById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { id } = req.params;
  const result = await teamService.getTeamById(id as string, userId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Team details retrieved successfully",
    data: result,
  });
});

export const teamController = {
  createTeam,
  addTeamMember,
  getTeamById,
};
