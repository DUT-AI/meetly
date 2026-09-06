import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { workspaceApi } from './workspace-api';

interface UseCreateLabelProps {
  workspaceId: string;
}

export const useCreateLabel = ({ workspaceId }: UseCreateLabelProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      return await workspaceApi.createLabel(workspaceId, data);
    },
    onSuccess: () => {
      toast.success('Đã tạo nhãn mới');
      queryClient.invalidateQueries({ queryKey: ['workspace-labels', workspaceId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Không thể tạo nhãn');
    },
  });

  return mutation;
};
