import { useQuery } from '@tanstack/react-query';

import { meetingApi } from './meeting-api';

export const useGetMeeting = (workspaceId: string, meetingId: string) => {
  return useQuery({
    queryKey: ['meeting', workspaceId, meetingId],
    queryFn: async () => {
      return await meetingApi.getMeeting(workspaceId, meetingId);
    },
    enabled: !!workspaceId && !!meetingId,
  });
};
