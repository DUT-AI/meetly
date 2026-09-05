'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type Project } from '../types';
import { projectApi } from './project-api';

type CreateProjectPayload = FormData | { name: string; workspaceId: string; image?: File | string };
type RequestType = { form: CreateProjectPayload } | CreateProjectPayload;
type ResponseType = { data: Project };

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (param) => {
      const data = 'form' in param ? param.form : param;
      const project = await projectApi.createProject(data);
      return { data: project };
    },
    onSuccess: ({ data }) => {
      toast.success('Project created.');

      const workspaceId = data.workspaceId || data.workspace_id;
      queryClient.invalidateQueries({
        queryKey: ['projects', workspaceId],
        exact: true,
      });
    },
    onError: (error) => {
      console.error('[CREATE_PROJECT]: ', error);
      toast.error('Failed to create project.');
    },
  });

  return mutation;
};
