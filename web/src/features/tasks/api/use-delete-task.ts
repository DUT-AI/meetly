'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { taskApi } from './task-api';

type RequestType = {
  param: { taskId: string };
};
type ResponseType = { data: { id: string; $id?: string; workspaceId?: string; projectId?: string } };

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const result = await taskApi.deleteTask(param.taskId);
      return { data: { id: result.id, $id: result.id } };
    },
    onSuccess: ({ data }) => {
      toast.success('Task deleted.');

      const taskId = data.id || data.$id;

      queryClient.invalidateQueries({
        queryKey: ['workspace-analytics'],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['project-analytics'],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['tasks'],
        exact: false,
      });
      if (taskId) {
        queryClient.invalidateQueries({
          queryKey: ['task', taskId],
          exact: true,
        });
      }
    },
    onError: (error) => {
      console.error('[DELETE_TASK]: ', error);
      toast.error('Failed to delete task.');
    },
  });

  return mutation;
};
