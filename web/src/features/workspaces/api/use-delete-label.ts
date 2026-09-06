import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { workspaceApi } from './workspace-api';

interface UseDeleteLabelProps {
  workspaceId: string;
}

export const useDeleteLabel = ({ workspaceId }: UseDeleteLabelProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ labelId }: { labelId: string }) => {
      return await workspaceApi.deleteLabel(workspaceId, labelId);
    },
    onSuccess: () => {
      toast.success('Đã xóa nhãn');
      queryClient.invalidateQueries({ queryKey: ['workspace-labels', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Không thể xóa nhãn');
    },
  });

  return mutation;
};
