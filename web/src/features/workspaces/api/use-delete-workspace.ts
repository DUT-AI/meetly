'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { workspaceApi } from './workspace-api';

type RequestType = {
  param: { workspaceId: string };
};
type ResponseType = { data: { id: string; $id?: string } };

export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const result = await workspaceApi.deleteWorkspace(param.workspaceId);
      return { data: { id: result.id, $id: result.id } };
    },
    onSuccess: ({ data }) => {
      toast.success('Workspace deleted.');

      const workspaceId = data.id || data.$id;
      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace', workspaceId],
        exact: true,
      });
    },
    onError: (error) => {
      console.error('[DELETE_WORKSPACE]: ', error);
      toast.error('Failed to delete workspace.');
    },
  });

  return mutation;
};
