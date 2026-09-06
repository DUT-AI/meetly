'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { MemberRole } from '../types';
import { memberApi } from './member-api';

type RequestType = {
  json: {
    workspaceId: string;
    userId: string | number;
    role?: MemberRole;
  };
};

export const useAddMember = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ json }: RequestType) => {
      return await memberApi.addMember(json);
    },
    onSuccess: (_, { json }) => {
      toast.success('Đã thêm nhân sự vào phòng ban thành công!');
      queryClient.invalidateQueries({
        queryKey: ['members', json.workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['members'],
      });
    },
    onError: (error: any) => {
      console.error('[ADD_MEMBER]: ', error);
      const msg = error.response?.data?.detail || error.message || 'Không thể thêm nhân sự.';
      toast.error(msg);
    },
  });

  return mutation;
};
