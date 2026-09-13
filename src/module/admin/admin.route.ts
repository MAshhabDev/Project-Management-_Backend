import { Router } from "express";
import { adminController } from "./admin.controller";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminValidation } from "./admin.validation";

const router = Router();

router.get(
  "/dashboard-stats",
  auth(Role.ADMIN),
  adminController.getDashboardStats,
);

router.patch(
  "/users/:id/ban",
  auth(Role.ADMIN),
  validateRequest(AdminValidation.ToggleUserStatusZodSchema),
  adminController.toggleUserBan,
);

export const adminRoutes = router;
