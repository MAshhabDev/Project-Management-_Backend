import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { organizationService } from './organization.service';

const createOrganization = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await organizationService.createOrganization(userId as string, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Organization created successfully',
    data: result,
  });
});

const getMyOrganizations = catchAsync(async (req: Request, res: Response) => {
  const userId =req.user?.userId;
  const result = await organizationService.getMyOrganizations(userId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Organizations retrieved successfully',
    data: result,
  });
});

const getOrganizationById = catchAsync(async (req: Request, res: Response) => {
  const userId =  req.user?.userId;
  const { id } = req.params;
  const result = await organizationService.getOrganizationById(id as string, userId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Organization details retrieved successfully',
    data: result,
  });
});

const inviteMember = catchAsync(async (req: Request, res: Response) => {
  const requesterUserId =  req.user?.userId;
  const { id } = req.params;
  const result = await organizationService.inviteMember(id as string, requesterUserId as string, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Member invited to organization successfully',
    data: result,
  });
});

export const organizationController = {
  createOrganization,
  getMyOrganizations,
  getOrganizationById,
  inviteMember,
};