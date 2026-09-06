'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type PopulatedTask } from '../types';
import { type UpdateTaskPayload, taskApi } from './task-api';

type RequestType = {
  json: UpdateTaskPayload;
  param: { taskId: string };
};
type ResponseType = { data: PopulatedTask };

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json, param }) => {
      const task = await taskApi.updateTask(param.taskId, json);
      return { data: task };
    },
    onSuccess: ({ data }) => {
      toast.success('Task updated.');

      const taskId = data.id || data.$id;
      const workspaceId = data.workspaceId || data.workspace_id;
      const projectId = data.projectId || data.project_id;

      queryClient.invalidateQueries({
        queryKey: ['workspace-analytics', workspaceId],
        exact: true,
      });
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ['project-analytics', projectId],
          exact: true,
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['tasks', workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['task', taskId],
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: ['notifications'],
      });
    },
    onError: (error) => {
      console.error('[UPDATE_TASK]: ', error);
      toast.error('Failed to update task.');
    },
  });

  return mutation;
};
