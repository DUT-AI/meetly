import { z } from 'zod';

import { TaskPriority, TaskStatus } from './types';

export const createTaskSchema = z.object({
  name: z.string().trim().min(1, 'Task name is required.'),
  status: z.nativeEnum(TaskStatus, {
    required_error: 'Task status is required.',
  }),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  labels: z.array(z.string()).default([]),
  workspaceId: z.string().trim().min(1, 'Workspace id is required.'),
  projectId: z.string().trim().min(1, 'Project id is required.'),
  dueDate: z.coerce.date(),
  assigneeIds: z.array(z.string()).default([]),
  description: z.string().optional(),
});
