import { Router } from "express";
import { projectController } from "./project.controller";
import { ProjectValidation } from "./project.validation";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { auth } from "../../middleware/auth";

const router = Router();

router.post(
  "/",
  auth(Role.ADMIN, Role.MANAGER),
  validateRequest(ProjectValidation.CreateProjectZodSchema),
  projectController.createProject,
);

export const projectRoutes = router;
