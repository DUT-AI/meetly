'use client';

import { useQuery } from '@tanstack/react-query';

import { taskApi } from './task-api';

interface UseGetTaskProps {
  taskId: string;
}

export const useGetTask = ({ taskId }: UseGetTaskProps) => {
  const query = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      return await taskApi.getTask(taskId);
    },
    enabled: !!taskId,
  });

  return query;
};
