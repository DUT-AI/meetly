import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { workspaceApi } from './workspace-api';

interface UseUpdateLabelProps {
  workspaceId: string;
}

export const useUpdateLabel = ({ workspaceId }: UseUpdateLabelProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ labelId, data }: { labelId: string; data: { name?: string; color?: string } }) => {
      return await workspaceApi.updateLabel(workspaceId, labelId, data);
    },
    onSuccess: () => {
      toast.success('Đã cập nhật nhãn');
      queryClient.invalidateQueries({ queryKey: ['workspace-labels', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật nhãn');
    },
  });

  return mutation;
};
