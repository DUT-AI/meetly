'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type PopulatedTask } from '../types';
import { type CreateTaskPayload, taskApi } from './task-api';

type RequestType = { json: CreateTaskPayload } | CreateTaskPayload;
type ResponseType = { data: PopulatedTask };

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (param) => {
      const payload = 'json' in param ? param.json : param;
      const task = await taskApi.createTask(payload);
      return { data: task };
    },
    onSuccess: ({ data }) => {
      toast.success('Task created.');

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
    },
    onError: (error) => {
      console.error('[CREATE_TASK]: ', error);
      toast.error('Failed to create task.');
    },
  });

  return mutation;
};
