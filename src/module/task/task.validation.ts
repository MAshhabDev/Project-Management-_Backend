import z from 'zod';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/enums';

const CreateTaskZodSchema = z.object({
  projectId: z.string('Project ID is required' ),
  columnId: z.string('Column ID is required' ),
  title: z
    .string('Task title is required' )
    .min(2, 'Title must be at least 2 characters long')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});

const UpdateTaskStatusZodSchema = z.object({
  columnId: z.string( 'Column ID is required' ),
  status: z.nativeEnum(TaskStatus, 'Task status is required' ),
});

const AddCommentZodSchema = z.object({
  content: z
    .string( 'Comment content is required' )
    .min(1, 'Comment cannot be empty'),
});

export const TaskValidation = {
  CreateTaskZodSchema,
  UpdateTaskStatusZodSchema,
  AddCommentZodSchema,
};