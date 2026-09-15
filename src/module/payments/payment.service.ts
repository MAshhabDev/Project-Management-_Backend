import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { IBkashInitiatePayload } from "./payment.interface";
import config from "../../config";
import { PaymentStatus } from "../../../generated/prisma/enums";
import PDFDocument from "pdfkit";
import { transporter } from "../../lib/nodemailer";

const sendInvoiceEmail = async (
  recipientEmail: string,
  paymentDetails: {
    transactionId: string;
    amount: number;
    currency: string;
    organizationName: string;
    paidAt: Date;
  },
) => {
  try {
    const pdfDocument = new PDFDocument({ margin: 50 });

    const pdfChunks: Buffer[] = [];

    pdfDocument.on("data", (chunk: Buffer) => pdfChunks.push(chunk));

    const pdfReadyPromise = new Promise<Buffer>((resolve) => {
      pdfDocument.on("end", () => resolve(Buffer.concat(pdfChunks)));
    });

    pdfDocument
      .fontSize(20)
      .text("Project Management SaaS", { align: "center" });
    pdfDocument
      .fontSize(14)
      .text("Official Payment Receipt", { align: "center" });
    pdfDocument.moveDown(2);
    pdfDocument
      .fontSize(12)
      .text(`Organization: ${paymentDetails.organizationName}`);
    pdfDocument.text(`Customer Email: ${recipientEmail}`);
    pdfDocument.moveDown();
    pdfDocument.text(`Transaction ID: ${paymentDetails.transactionId}`);
    pdfDocument.text(
      `Amount Paid: ${paymentDetails.amount} ${paymentDetails.currency}`,
    );
    pdfDocument.text(`Payment Method: bKash`);
    pdfDocument.text(`Date & Time: ${paymentDetails.paidAt.toLocaleString()}`);
    pdfDocument.moveDown(2);
    pdfDocument
      .fontSize(10)
      .text("Thank you for staying with us!", { align: "center" });
    pdfDocument.end();
    const pdfBuffer = await pdfReadyPromise;

    await transporter.sendMail({
      from: config.email_sender,
      to: recipientEmail,
      subject: `Payment Invoice - ${paymentDetails.organizationName}`,
      text: `Hello,\n\nThank you for your payment of ${paymentDetails.amount} ${paymentDetails.currency} for ${paymentDetails.organizationName}.\nPlease find your official PDF invoice attached.\n\nBest regards,\nProject Management SaaS Team`,
      attachments: [
        {
          filename: `Invoice_${paymentDetails.transactionId}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
  } catch (error) {
    console.error("Failed to send invoice email:", error);
  }
};

const initiateBkashPayment = async (
  userId: string,
  payload: IBkashInitiatePayload,
) => {
  const { organizationId, amount } = payload;

  const org = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    include: {
      members: true,
    },
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
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Failed to retrieve bKash Token",
    );
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
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "bKash Payment Creation HTTP Error",
      );
    }

    const bkashCreatePaymentResult = await bkashResponse.json();

    const { statusCode, statusMessage, paymentID, bkashURL } =
      bkashCreatePaymentResult;

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

const executeBkashPayment = async (userId: string, paymentID: string) => {
  if (!paymentID) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment ID is required");
  }

  const paymentLog = await prisma.payment.findUnique({
    where: {
      transactionId: paymentID,
    },
  });

  if (!paymentLog) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Payment transaction record not found",
    );
  }
  if (paymentLog.status === PaymentStatus.SUCCESS) {
    return {
      success: true,
      message: "Payment was already executed successfully",
      data: paymentLog,
    };
  }
  const idToken = await getBkashIdToken();

  if (!idToken) {
    throw new AppError(httpStatus.BAD_GATEWAY, "No Bkash Access Token Found!");
  }

  const bkashResponse = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: idToken,
        "X-APP-Key": config.bkash_app_key,
      },
      body: JSON.stringify({
        paymentID,
      }),
    },
  );

  const bkashData = await bkashResponse.json();

  if (bkashData && bkashData.statusCode === "0000") {
    const updatedLog = await prisma.payment.update({
      where: {
        id: paymentLog.id,
      },
      data: {
        status: PaymentStatus.SUCCESS,
      },
      include: { organization: true },
    });

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (user?.email && updatedLog.organization) {
      sendInvoiceEmail(user.email, {
        transactionId: updatedLog.transactionId,
        amount: updatedLog.amount,
        currency: updatedLog.currency,
        organizationName: updatedLog.organization.name,
        paidAt: new Date(),
      });
    }

    return {
      success: true,
      message: "Payment executed successfully",
      data: updatedLog,
    };
  } else {
    await prisma.payment.update({
      where: {
        id: paymentLog.id,
      },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    throw new AppError(
      httpStatus.BAD_REQUEST,
      bkashData.statusMessage || "bKash Payment execution failed",
    );
  }
};

const handleBkashCallback = async (paymentID: string, status: string) => {
  if (!paymentID || !status) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid callback parameters. paymentID and status are required.",
    );
  }

  const paymentLog = await prisma.payment.findUnique({
    where: { transactionId: paymentID },
  });

  if (!paymentLog) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Payment transaction record not found",
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

    if (!idToken) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "No Bkash Access Token Found!",
      );
    }
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
      },
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
        bkashData.statusMessage || "Payment execution failed",
      );
    }
  }
  throw new AppError(httpStatus.BAD_REQUEST, "Invalid payment status received");
};

const getOrganizationPaymentHistory = async (
  userId: string,
  organizationId: string,
  query: Record<string, any>,
) => {
  const org = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    include: {
      members: true,
    },
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

  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const status = query.status as PaymentStatus | undefined;
  const whereCondition: any = { organizationId };

  if (status) {
    whereCondition.status = status;
  }

  const payments = await prisma.payment.findMany({
    where: whereCondition,
    take: limit,
    skip,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  const total = await prisma.payment.count({ where: whereCondition });

  return {
    data: payments,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const paymentService = {
  initiateBkashPayment,
  executeBkashPayment,
  handleBkashCallback,
  getOrganizationPaymentHistory,
};
