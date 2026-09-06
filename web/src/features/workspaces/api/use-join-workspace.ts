'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type Workspace } from '../types';
import { workspaceApi } from './workspace-api';

type RequestType = {
  param: { workspaceId: string };
  json: { code: string };
};
type ResponseType = { data: Workspace };

export const useJoinWorkspace = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, json }) => {
      const workspace = await workspaceApi.joinWorkspace(param.workspaceId, json.code);
      return { data: workspace };
    },
    onSuccess: ({ data }) => {
      toast.success('Joined workspace.');

      const workspaceId = data.id || data.$id;
      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace', workspaceId],
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: ['notifications'],
      });
    },
    onError: (error) => {
      console.error('[JOIN_WORKSPACE]: ', error);
      toast.error('Failed to join workspace.');
    },
  });

  return mutation;
};
