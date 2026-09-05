'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type Workspace } from '../types';
import { workspaceApi } from './workspace-api';

type UpdateWorkspacePayload = FormData | { name?: string; image?: File | string };
type RequestType = {
  form: UpdateWorkspacePayload;
  param: { workspaceId: string };
};
type ResponseType = { data: Workspace };

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ form, param }) => {
      const workspace = await workspaceApi.updateWorkspace(param.workspaceId, form);
      return { data: workspace };
    },
    onSuccess: ({ data }) => {
      toast.success('Workspace updated.');

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
      console.error('[UPDATE_WORKSPACE]: ', error);
      toast.error('Failed to update workspace.');
    },
  });

  return mutation;
};
