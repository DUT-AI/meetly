import { useQuery } from '@tanstack/react-query';
import { transcriptionApi } from './transcription-api';

export const useGetTranscripts = (workspaceId: string, meetingId: string) => {
  return useQuery({
    queryKey: ['transcripts', workspaceId, meetingId],
    queryFn: async () => {
      return await transcriptionApi.getMeetingTranscripts(workspaceId, meetingId);
    },
    enabled: !!workspaceId && !!meetingId,
  });
};
