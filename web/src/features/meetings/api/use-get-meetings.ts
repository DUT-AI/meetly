import { useQuery } from '@tanstack/react-query';

import { meetingApi } from './meeting-api';

export const useGetMeetings = (workspaceId: string) => {
  return useQuery({
    queryKey: ['meetings', workspaceId],
    queryFn: async () => {
      return await meetingApi.getMeetings(workspaceId);
    },
    enabled: !!workspaceId,
  });
};
