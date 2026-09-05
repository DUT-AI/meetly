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

export const useGetTasks = ({
  workspaceId,
  projectId,
  status,
  search,
  assigneeId,
  dueDate,
}: UseGetTasksProps) => {
  const query = useQuery({
    queryKey: ['tasks', workspaceId, projectId, status, search, assigneeId, dueDate],
    queryFn: async () => {
      return await taskApi.getTasks({
        workspaceId,
        projectId,
        status,
        search,
        assigneeId,
        dueDate,
      });
    },
    enabled: !!workspaceId,
  });

  return query;
};
