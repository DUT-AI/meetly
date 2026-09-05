'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { memberApi } from './member-api';

type RequestType = {
  param: { memberId: string };
};
type ResponseType = { data: { id: string; workspaceId?: string; workspace_id?: string } };

export const useDeleteMember = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const result = await memberApi.deleteMember(param.memberId);
      return { data: { id: result.id } };
    },
    onSuccess: () => {
      toast.success('Member deleted.');

      queryClient.invalidateQueries({
        queryKey: ['members'],
      });
    },
    onError: (error) => {
      console.error('[DELETE_MEMBER]: ', error);
      toast.error('Failed to delete member.');
    },
  });

  return mutation;
};
