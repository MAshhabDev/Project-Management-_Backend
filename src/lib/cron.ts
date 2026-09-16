// src/app/cron/paymentCron.ts
import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { PaymentStatus } from "../../generated/prisma/enums";

export const initPaymentCron = () => {


    cron.schedule("0 0 * * *", async () => {

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);


    await prisma.payment.updateMany({
      where: {
        status: PaymentStatus.PENDING,
        createdAt: { lt: twentyFourHoursAgo },
      },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    console.log(" Expired payments cleaned up successfully.");
  });
};