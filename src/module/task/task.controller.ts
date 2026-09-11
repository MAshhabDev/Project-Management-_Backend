import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { taskService } from './task.service';

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


const updateTaskStatus = catchAsync(async (req: Request, res: Response) => {
  const userId =  req.user?.userId;
  const { id } = req.params;
  const result = await taskService.updateTaskStatus(id as string, userId as string, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task status updated & activity logged successfully',
    data: result,
  });
});


const softDeleteTask = catchAsync(async (req: Request, res: Response) => {
  const userId =  req.user?.userId;
  const { id } = req.params;
  const result = await taskService.softDeleteTask(id as string, userId as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task soft-deleted & activity logged successfully',
    data: result,
  });
});



export const taskController = {
  createTask,
  updateTaskStatus,
   softDeleteTask, 
};