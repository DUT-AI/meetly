import { useQuery } from '@tanstack/react-query';

import { transcriptionApi } from './transcription-api';

export const useGetCurrentSession = (workspaceId: string, meetingId: string) => {
  return useQuery({
    queryKey: ['transcription-session', workspaceId, meetingId],
    queryFn: async () => {
      return await transcriptionApi.getCurrentSession(workspaceId, meetingId);
    },
    enabled: !!workspaceId && !!meetingId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === 'STREAMING' || data.status === 'CREATED')) {
        return 5000;
      }
      return false;
    },
  });
};
