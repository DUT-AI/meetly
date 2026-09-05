'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { MemberRole } from '../types';
import { memberApi } from './member-api';

type RequestType = {
  param: { memberId: string };
  json: { role: MemberRole };
};
type ResponseType = { data: { id: string; workspace_id?: string; workspaceId?: string } };

export const useUpdateMember = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, json }) => {
      const result = await memberApi.updateMember(param.memberId, json.role);
      return {
        data: {
          id: result.id,
          workspaceId: result.workspace_id,
          workspace_id: result.workspace_id,
        },
      };
    },
    onSuccess: () => {
      toast.success('Member updated.');

      queryClient.invalidateQueries({
        queryKey: ['members'],
      });
    },
    onError: (error) => {
      console.error('[UPDATE_MEMBER]: ', error);
      toast.error('Failed to update member.');
    },
  });

  return mutation;
};
