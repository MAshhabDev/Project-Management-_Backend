import z from "zod";
import { ProjectStatus } from "../../../generated/prisma/enums";

const CreateProjectZodSchema = z.object({
  organizationId: z.string("Organization ID is required"),
  name: z
    .string("Project name is required")
    .min(3, "Project name must be at least 3 characters long")
    .max(100, "Project name cannot exceed 100 characters"),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const UpdateProjectZodSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const ProjectValidation = {
  CreateProjectZodSchema,
  UpdateProjectZodSchema,
};
