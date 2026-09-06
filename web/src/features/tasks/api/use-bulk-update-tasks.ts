'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type BulkUpdateTaskItem, taskApi } from './task-api';

type RequestType = {
  json: { tasks: BulkUpdateTaskItem[] };
};
type ResponseType = { data: { updatedTasks: any[]; workspaceId?: string } };

export const useBulkUpdateTasks = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const result = await taskApi.bulkUpdateTasks(json.tasks);
      return { data: result };
    },
    onSuccess: ({ data }) => {
      toast.success('Tasks updated.');

      if (data.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: ['workspace-analytics', data.workspaceId],
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: ['tasks', data.workspaceId],
          exact: false,
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: ['tasks'],
          exact: false,
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['project-analytics'],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['notifications'],
      });
    },
    onError: (error) => {
      console.error('[BULK_UPDATE_TASKS]: ', error);
      toast.error('Failed to update tasks.');
    },
  });

  return mutation;
};
