import z from "zod";
import { Role } from "../../../generated/prisma/enums";

// 1. User Registration Validation Schema
const RegisterZodSchema = z.object({
  name: z
    .string("Name is required")
    .min(3, "Name must be at least 3 characters long")
    .max(50, "Name cannot exceed 50 characters"),

  email: z.email("Email is required"),

  password: z
    .string("Password is required")
    .min(6, "Password must be at least 6 characters long")
    .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least 1 special character",
    ),

  avatar: z.string().url("Avatar must be a valid URL").optional(),
});

// 2. Email OTP Verification Validation Schema
const VerifyEmailZodSchema = z.object({
  email: z.email("Invalid email address format"),
  otp: z
    .string("OTP is required")
    .length(6, "OTP must be exactly 6 digits long"),
});

// 2. User Login Validation Schema
const LoginZodSchema = z.object({
  email: z.email("Invalid email address format"),

  password: z.string("Password is required").min(1, "Password cannot be empty"),
});

// 3. Refresh Token Validation Schema
const RefreshTokenZodSchema = z.object({
  refreshToken: z.string().optional(),
});

// 4. Update Profile Validation Schema
const UpdateProfileZodSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  avatar: z.string().url().optional(),
});

// 5. Change Password Validation Schema
const ChangePasswordZodSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters long")
    .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least 1 special character",
    ),
});

const ForgotPasswordZodSchema = z.object({
  email: z
    .email("Invalid email address format"),
});

const ResetPasswordZodSchema = z.object({
  email: z.email("Invalid email address format"),
  otp: z
    .string("OTP is required")
    .length(6, "OTP must be exactly 6 digits long"),
  newPassword: z
    .string("New password is required")
    .min(6, "New password must be at least 6 characters long"),
});

export const UserValidation = {
  RegisterZodSchema,
  VerifyEmailZodSchema,
  LoginZodSchema,
  RefreshTokenZodSchema,
  ForgotPasswordZodSchema,
  ResetPasswordZodSchema,
};
