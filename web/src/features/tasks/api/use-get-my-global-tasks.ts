'use client';

import { useQuery } from '@tanstack/react-query';

import type { TaskStatus } from '@/features/tasks/types';

import { taskApi } from './task-api';

interface UseGetMyGlobalTasksProps {
  status?: TaskStatus | null;
  search?: string | null;
  dueDate?: string | null;
}

export const useGetMyGlobalTasks = (params?: UseGetMyGlobalTasksProps) => {
  const query = useQuery({
    queryKey: ['my-global-tasks', params?.status, params?.search, params?.dueDate],
    queryFn: async () => {
      return await taskApi.getMyGlobalTasks({
        status: params?.status,
        search: params?.search,
        dueDate: params?.dueDate,
      });
    },
  });

  return query;
};
