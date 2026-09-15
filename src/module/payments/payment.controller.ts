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


const executeBkashPaymentController = catchAsync(
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



const handleBkashCallbackController = catchAsync(
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

export const paymentController = {
  initiateBkashPayment,
  executeBkashPaymentController,
  handleBkashCallbackController
};
