import { Router } from 'express';
import { taskController } from './task.controller';
import { TaskValidation } from './task.validation';
import { auth } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';

const router = Router();

router.post(
  '/',
  auth(),
  validateRequest(TaskValidation.CreateTaskZodSchema),
  taskController.createTask
);

export const taskRoutes = router;