import type { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { authService } from "./auth.services";

// 1. Create User (Registration OTP Request)
const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await authService.createUser(req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "User registration OTP sent to email successfully",
      data: null,
    });
  },
);

// 2. Verify Email OTP & Complete Registration
const verifyEmail = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await authService.verifyEmail(req.body);

    // Save tokens in cookies
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24,
    });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 168,
    });

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Email verified & User registered successfully",
      data: result,
    });
  },
);

// 3. Login User (Email / Password)
const logInUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { accessToken, refreshToken } = await authService.logInUser(req.body);

    // Save tokens in cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 168,
    });

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Log In successfully Done",
      data: {
        accessToken,
        refreshToken,
      },
    });
  },
);

// 4. Refresh Access Token
const refreshToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    const { accessToken } = await authService.refreshTokenIntoDb(token);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24,
    });

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Access token refreshed successfully",
      data: {
        accessToken,
      },
    });
  },
);

// 5. Get Logged In User Profile (getMe)
const getMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.user?.userId;

    const result = await authService.getMe(id as string);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User profile retrieved successfully",
      data: result,
    });
  },
);

// 6. Google Social Login
const googleLogin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await authService.googleLogin(req.body);

    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24,
    });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 168,
    });

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Google Social Login successful",
      data: result,
    });
  },
);

// 7. Forgot Password (Send Reset OTP)
const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await authService.forgotPassword(req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Password reset OTP sent to email successfully",
      data: null,
    });
  },
);

const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await authService.resetPassword(req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Password changed successfully",
      data: null,
    });
  },
);

export const authController = {
  createUser,
  verifyEmail,
  logInUser,
  refreshToken,
  getMe,
  googleLogin,
  forgotPassword,
  resetPassword,
};
