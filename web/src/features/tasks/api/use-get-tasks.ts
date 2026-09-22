'use client';

import { useQuery } from '@tanstack/react-query';

import type { TaskStatus } from '@/features/tasks/types';

import { taskApi } from './task-api';

interface UseGetTasksProps {
  workspaceId: string;
  projectId?: string | null;
  status?: TaskStatus | null;
  search?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export const useGetTasks = ({ workspaceId, projectId, status, search, assigneeId, dueDate }: UseGetTasksProps) => {
  const query = useQuery({
    queryKey: ['tasks', workspaceId, projectId ?? null, status ?? null, search ?? null, assigneeId ?? null, dueDate ?? null],
    queryFn: async () => {
      return await taskApi.getTasks({
        workspaceId,
        projectId: projectId ?? null,
        status: status ?? null,
        search: search ?? null,
        assigneeId: assigneeId ?? null,
        dueDate: dueDate ?? null,
      });
    },
    enabled: !!workspaceId,
  });

  return query;
};
