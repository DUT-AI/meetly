import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required.'),
  image: z.union([z.instanceof(File), z.string().transform((value) => (value === '' ? undefined : value))]).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name must be 1 or more characters.').optional(),
  note: z.string().optional(),
  discord_room_id: z.string().optional(),
  notify_on_task_status_change: z.boolean().optional(),
  notify_task_status_discord: z.boolean().optional(),
  notify_task_status_zalo: z.boolean().optional(),
  zalo_room_id: z.string().optional(),
  image: z.union([z.instanceof(File), z.string().transform((value) => (value === '' ? undefined : value))]).optional(),
});
