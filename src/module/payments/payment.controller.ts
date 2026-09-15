import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { paymentService } from "./payment.service";

const initiateBkashPayment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await paymentService.initiateBkashPayment(
    userId as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message:
      "bKash payment session initiated successfully. Use bkashURL to complete payment.",
    data: result,
  });
});


const executeBkashPayment = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { paymentID } = req.body;
    const result = await paymentService.executeBkashPayment(userId as string, paymentID);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: result.success,
      message: result.message,
      data: result.data,
    });
  }
);



const handleBkashCallback = catchAsync(
  async (req: Request, res: Response) => {
    const { paymentID, status } = req.query;
    const result = await paymentService.handleBkashCallback(
      paymentID as string,
      status as string
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: result.success,
      message: result.message,
      data: result.data,
    });
  }
);

const refundBkashPayment = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const result = await paymentService.refundBkashPayment(userId as string, req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.message,
      data: result.data,
    });
  }
);


const getOrganizationPaymentHistory = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { organizationId } = req.params;
    const result = await paymentService.getOrganizationPaymentHistory(
      userId as string,
      organizationId as string,
      req.query
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment history fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  }
);
export const paymentController = {
  initiateBkashPayment,
  executeBkashPayment,
  handleBkashCallback,
  getOrganizationPaymentHistory,
  refundBkashPayment
};
