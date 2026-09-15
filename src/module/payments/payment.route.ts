import { Router } from "express";
import { paymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";
import { auth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/bkash/initiate",
  auth(),
  validateRequest(PaymentValidation.BkashInitiateZodSchema),
  paymentController.initiateBkashPayment,
);

router.post(
  "/bkash/execute",
  auth(Role.ADMIN, Role.MANAGER, Role.MEMBER),
  paymentController.executeBkashPaymentController
);

router.get("/bkash/callback", paymentController.handleBkashCallbackController);

export const paymentRoutes = router;
