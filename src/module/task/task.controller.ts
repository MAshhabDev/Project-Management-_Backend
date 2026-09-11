import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { taskService } from './task.service';

// API 1 Controller: Create Task
const createTask = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await taskService.createTask(userId as string, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Task created & activity logged successfully',
    data: result,
  });
});

export const taskController = {
  createTask,
};