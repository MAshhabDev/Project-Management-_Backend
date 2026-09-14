import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { IBkashInitiatePayload } from "./payment.interface";
import config from "../../config";
import { PaymentStatus } from "../../../generated/prisma/enums";

const initiateBkashPayment = async (
  userId: string,
  payload: IBkashInitiatePayload,
) => {
  const { organizationId, amount } = payload;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { members: true },
  });

  if (!org) {
    throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
  }

  const isMember = org.members.some((m) => m.userId === userId);

  if (!isMember) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Access denied. You are not a member of this organization",
    );
  }

  const idToken = await getBkashIdToken();

  if (!idToken) {
  throw new AppError(httpStatus.UNAUTHORIZED, "Failed to retrieve bKash Token");
}

  try {
    const bkashResponse = await fetch(
      `${config.bkash_base_url}/tokenized/bKash/checkout/payment/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: idToken,
          "X-APP-Key": config.bkash_app_key,
        },
        body: JSON.stringify({
          mode: "0011",
          payerReference: org.slug,
          callbackURL: `${config.back_url}/api/v1/payments/bkash/callback`,
          amount: String(amount),
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: `INV-${Date.now()}`,
        }),
      },
    );

    if (!bkashResponse.ok) {
      throw new AppError(httpStatus.BAD_GATEWAY, "bKash Payment Creation HTTP Error");
    }

    const bkashCreatePaymentResult = await bkashResponse.json();

    const { statusCode, statusMessage, paymentID, bkashURL } = bkashCreatePaymentResult;

    if (statusCode !== "0000") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `bKash Create Payment Failed: ${statusMessage}`,
      );
    }



    await prisma.payment.create({
      data: {
        organizationId,
        amount: Number(amount),
        currency: "BDT",
        paymentMethod: "bKash",
        status: PaymentStatus.PENDING,
        transactionId: paymentID, 
      },
    });

    return {
      paymentID,
      bkashURL,
      amount,
      organizationId,
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `bKash Payment Creation Error: ${error.message}`,
    );
  }
};



 
const handleBkashCallback = async (paymentID: string, status: string) => {
  if (!paymentID || !status) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid callback parameters. paymentID and status are required."
    );
  }
  const paymentLog = await prisma.payment.findUnique({
    where: { transactionId: paymentID },
  });
  if (!paymentLog) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Payment transaction record not found"
    );
  }
  if (status === "cancel" || status === "failure") {
    const updatedLog = await prisma.payment.update({
      where: { id: paymentLog.id },
      data: { status: PaymentStatus.FAILED },
    });
    return {
      success: false,
      message: `Payment was ${status === "cancel" ? "cancelled" : "failed"} by the user`,
      data: updatedLog,
    };
  }
  if (status === "success") {
    const idToken = await getBkashIdToken();
    const bkashResponse = await fetch(
      `${config.bkash_base_url}/tokenized/checkout/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: idToken,
          "X-APP-Key": config.bkash_app_key as string,
        },
        body: JSON.stringify({ paymentID }),
      }
    );
    const bkashData = await bkashResponse.json();
    if (bkashData && bkashData.statusCode === "0000") {
      const updatedLog = await prisma.payment.update({
        where: { id: paymentLog.id },
        data: { status: PaymentStatus.SUCCESS },
      });
      return {
        success: true,
        message: "Payment executed and verified successfully",
        data: updatedLog,
      };
    } else {
      await prisma.payment.update({
        where: { id: paymentLog.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new AppError(
        httpStatus.BAD_REQUEST,
        bkashData.statusMessage || "Payment execution failed"
      );
    }
  }
  throw new AppError(httpStatus.BAD_REQUEST, "Invalid payment status received");
};

export const paymentService = {
  initiateBkashPayment,
};