import { useQuery } from '@tanstack/react-query';

import { taskApi } from './task-api';

interface UseGetTaskCommentsProps {
  taskId: string;
}

export const useGetTaskComments = ({ taskId }: UseGetTaskCommentsProps) => {
  const query = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      return await taskApi.getTaskComments(taskId);
    },
    enabled: !!taskId,
  });

  return query;
};
