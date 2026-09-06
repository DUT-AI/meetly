import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { taskApi } from './task-api';

interface UseDeleteTaskCommentProps {
  taskId: string;
}

export const useDeleteTaskComment = ({ taskId }: UseDeleteTaskCommentProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ commentId }: { commentId: string }) => {
      return await taskApi.deleteTaskComment(taskId, commentId);
    },
    onSuccess: () => {
      toast.success('Đã xóa bình luận');
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Không thể xóa bình luận');
    },
  });

  return mutation;
};
