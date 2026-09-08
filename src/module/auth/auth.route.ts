import { Router } from "express";
import { authController } from "./auth.controller";
import { UserValidation } from "./auth.validation";
import { validateRequest } from "../../middleware/validateRequest";

const router = Router();

router.post(
  "/register",
  validateRequest(UserValidation.RegisterZodSchema),
  authController.createUser
);

router.post(
  "/login",
  validateRequest(UserValidation.LoginZodSchema),
  authController.logInUser
);

export const authRoutes = router;