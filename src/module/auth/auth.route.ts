import { Router } from "express";
import { authController } from "./auth.controller";
import { UserValidation } from "./auth.validation";
import { validateRequest } from "../../middleware/validateRequest";
import { auth } from "../../middleware/auth";

const router = Router();

router.post(
  "/register",
  validateRequest(UserValidation.RegisterZodSchema),
  authController.createUser
);

router.post(
  "/verify-email",
  validateRequest(UserValidation.VerifyEmailZodSchema),
  authController.verifyEmail
);

// 3. Login User (Email & Password)
router.post(
  "/login",
  validateRequest(UserValidation.LoginZodSchema),
  authController.logInUser
);

// 4. Refresh Token
router.post(
  "/refresh-token",
  authController.refreshToken
);

router.get(
  "/me",
  auth(),
  authController.getMe
);

router.post(
  "/google-login",
  authController.googleLogin
);

router.post(
  "/forgot-password",
  validateRequest(UserValidation.ForgotPasswordZodSchema),
  authController.forgotPassword
);

// 8. Reset Password (Verify OTP & Change Password)
router.post(
  "/reset-password",
  validateRequest(UserValidation.ResetPasswordZodSchema),
  authController.resetPassword
);

export const authRoutes = router;