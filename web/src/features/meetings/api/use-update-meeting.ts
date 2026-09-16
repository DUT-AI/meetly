import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { meetingApi, type UpdateMeetingPayload } from './meeting-api';

export const useUpdateMeeting = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, payload }: { meetingId: string; payload: UpdateMeetingPayload }) => {
      return await meetingApi.updateMeeting(workspaceId, meetingId, payload);
    },
    onSuccess: () => {
      toast.success('Đã cập nhật cuộc họp');
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Lỗi khi cập nhật cuộc họp');
    },
  });
};
