import z from "zod";
import { UserStatus } from "../../../generated/prisma/enums";

const ToggleUserStatusZodSchema = z.object({
  status: z.nativeEnum(
    UserStatus,
    "Status is required (ACTIVE, BLOCKED, or DELETED)",
  ),
});

export const AdminValidation = {
  ToggleUserStatusZodSchema,
};
