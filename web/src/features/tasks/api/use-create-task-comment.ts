import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { taskApi } from './task-api';

interface UseCreateTaskCommentProps {
  taskId: string;
}

export const useCreateTaskComment = ({ taskId }: UseCreateTaskCommentProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { content: string; mentions?: string[] }) => {
      return await taskApi.createTaskComment(taskId, data);
    },
    onSuccess: () => {
      toast.success('Đã gửi bình luận');
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Không thể gửi bình luận');
    },
  });

  return mutation;
};
