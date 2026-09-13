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

export const paymentController = {
  initiateBkashPayment,
};
