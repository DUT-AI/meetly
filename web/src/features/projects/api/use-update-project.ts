'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type Project } from '../types';
import { projectApi } from './project-api';

type UpdateProjectPayload = FormData | { name?: string; image?: File | string };
type RequestType = {
  form: UpdateProjectPayload;
  param: { projectId: string };
};
type ResponseType = { data: Project };

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ form, param }) => {
      const project = await projectApi.updateProject(param.projectId, form);
      return { data: project };
    },
    onSuccess: ({ data }) => {
      toast.success('Project updated.');

      const projectId = data.id || data.$id;
      const workspaceId = data.workspaceId || data.workspace_id;

      queryClient.invalidateQueries({
        queryKey: ['projects', workspaceId],
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: ['tasks', workspaceId, projectId],
        exact: false,
      });
    },
    onError: (error) => {
      console.error('[UPDATE_PROJECT]: ', error);
      toast.error('Failed to update project.');
    },
  });

  return mutation;
};
