import { api } from '@/lib/api';
import { MeetingTranscriptsResponse, TranscriptionSession } from '../types';

export const transcriptionApi = {
  getMeetingTranscripts: async (
    workspaceId: string,
    meetingId: string
  ): Promise<MeetingTranscriptsResponse> => {
    const response = await api.get<{ data: MeetingTranscriptsResponse }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/transcripts`
    );
    return response.data?.data ?? response.data;
  },

  getCurrentSession: async (
    workspaceId: string,
    meetingId: string
  ): Promise<TranscriptionSession | null> => {
    const response = await api.get<{ data: TranscriptionSession | null }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/transcription-sessions/current`
    );
    return response.data?.data ?? null;
  },

  createSession: async (
    workspaceId: string,
    meetingId: string
  ): Promise<TranscriptionSession> => {
    const response = await api.post<{ data: TranscriptionSession }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/transcription-sessions`,
      {
        source_type: 'GOOGLE_MEET',
        sample_rate: 16000,
        stt_model: 'openai/whisper-small',
      }
    );
    return response.data?.data ?? response.data;
  },

  stopSession: async (
    sessionId: string,
    totalSamples: number = 0,
    lastSeq: number = 0
  ): Promise<TranscriptionSession> => {
    const response = await api.post<{ data: TranscriptionSession }>(
      `/transcription-sessions/${sessionId}/stop`,
      {
        total_samples: totalSamples,
        last_seq: lastSeq,
        recording_part_count: 0,
      }
    );
    return response.data?.data ?? response.data;
  },
};
