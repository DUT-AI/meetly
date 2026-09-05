'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type Workspace } from '../types';
import { workspaceApi } from './workspace-api';

type RequestType = {
  param: { workspaceId: string };
};
type ResponseType = { data: Workspace };

export const useResetInviteCode = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const workspace = await workspaceApi.resetInviteCode(param.workspaceId);
      return { data: workspace };
    },
    onSuccess: ({ data }) => {
      toast.success('Invite code reset.');

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
      console.error('[RESET_INVITE_CODE]: ', error);
      toast.error('Failed to reset invite code.');
    },
  });

  return mutation;
};
