import { TaskPriority, TaskStatus } from '../../../generated/prisma/enums';

export interface ICreateTask {
  projectId: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  assigneeId?: string;
}

export interface IUpdateTaskStatus {
  columnId: string;
  status: TaskStatus;
}

export interface IAddComment {
  content: string;
}