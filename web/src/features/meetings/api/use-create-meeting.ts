import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type CreateMeetingPayload, meetingApi } from './meeting-api';

export const useCreateMeeting = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateMeetingPayload) => {
      return await meetingApi.createMeeting(workspaceId, payload);
    },
    onSuccess: () => {
      toast.success('Đã tạo cuộc họp');
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Lỗi khi tạo cuộc họp');
    },
  });
};
