import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { meetingApi } from './meeting-api';

export const useDeleteMeeting = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      return await meetingApi.deleteMeeting(workspaceId, meetingId);
    },
    onSuccess: () => {
      toast.success('Đã xóa cuộc họp');
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] });
    },
    onError: () => {
      toast.error('Lỗi khi xóa cuộc họp (chỉ Admin mới có quyền)');
    },
  });
};
