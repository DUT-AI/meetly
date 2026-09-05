'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { projectApi } from './project-api';

type RequestType = {
  param: { projectId: string };
};
type ResponseType = { data: { id: string; $id?: string; workspaceId?: string } };

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const result = await projectApi.deleteProject(param.projectId);
      return { data: { id: result.id, $id: result.id } };
    },
    onSuccess: ({ data }) => {
      toast.success('Project deleted.');

      const projectId = data.id || data.$id;
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
        exact: true,
      });
    },
    onError: (error) => {
      console.error('[DELETE_PROJECT]: ', error);
      toast.error('Failed to delete project.');
    },
  });

  return mutation;
};
