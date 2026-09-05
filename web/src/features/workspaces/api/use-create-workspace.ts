'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { type Workspace } from '../types';
import { workspaceApi } from './workspace-api';

type CreateWorkspacePayload = FormData | { name: string; image?: File | string };
type RequestType = { form: CreateWorkspacePayload } | CreateWorkspacePayload;
type ResponseType = { data: Workspace };

export const useCreateWorkspace = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (param) => {
      const data = 'form' in param ? param.form : param;
      const workspace = await workspaceApi.createWorkspace(data);
      return { data: workspace };
    },
    onSuccess: () => {
      toast.success('Workspace created.');

      router.refresh();
      queryClient.invalidateQueries({
        queryKey: ['workspaces'],
      });
    },
    onError: (error) => {
      console.error('[CREATE_WORKSPACE]: ', error);
      toast.error('Failed to create workspace.');
    },
  });

  return mutation;
};
