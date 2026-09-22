import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { taskApi } from './task-api';

interface UseUpdateTaskCommentProps {
  taskId: string;
}

export const useUpdateTaskComment = ({ taskId }: UseUpdateTaskCommentProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ commentId, data }: { commentId: string; data: { content: string; mentions?: string[] } }) => {
      return await taskApi.updateTaskComment(taskId, commentId, data);
    },
    onSuccess: () => {
      toast.success('Đã cập nhật bình luận');
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật bình luận');
    },
  });

  return mutation;
};
