import { Router } from "express";
import { taskController } from "./task.controller";
import { TaskValidation } from "./task.validation";
import { auth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validateRequest";

const router = Router();

router.post(
  "/",
  auth(),
  validateRequest(TaskValidation.CreateTaskZodSchema),
  taskController.createTask,
);

router.patch(
  "/:id/status",
  auth(),
  validateRequest(TaskValidation.UpdateTaskStatusZodSchema),
  taskController.updateTaskStatus,
);

router.delete("/:id", auth(), taskController.softDeleteTask);

export const taskRoutes = router;
