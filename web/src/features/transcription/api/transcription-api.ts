import { api } from '@/lib/api';

import { MeetingTranscriptsResponse, TranscriptionSession } from '../types';

export const transcriptionApi = {
  getMeetingTranscripts: async (workspaceId: string, meetingId: string): Promise<MeetingTranscriptsResponse> => {
    const response = await api.get<{ data: MeetingTranscriptsResponse }>(`/workspaces/${workspaceId}/meetings/${meetingId}/transcripts`);
    return response.data?.data ?? response.data;
  },

  getCurrentSession: async (workspaceId: string, meetingId: string): Promise<TranscriptionSession | null> => {
    const response = await api.get<{ data: TranscriptionSession | null }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/transcription-sessions/current`,
    );
    return response.data?.data ?? null;
  },

  createSession: async (workspaceId: string, meetingId: string): Promise<TranscriptionSession> => {
    const response = await api.post<{ data: TranscriptionSession }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/transcription-sessions`,
      {
        source_type: 'GOOGLE_MEET',
        sample_rate: 16000,
        stt_model: 'Systran/faster-whisper-large-v3',
      },
    );
    return response.data?.data ?? response.data;
  },

  stopSession: async (sessionId: string, totalSamples: number = 0, lastSeq: number = 0): Promise<TranscriptionSession> => {
    const response = await api.post<{ data: TranscriptionSession }>(`/transcription-sessions/${sessionId}/stop`, {
      total_samples: totalSamples,
      last_seq: lastSeq,
      recording_part_count: 0,
    });
    return response.data?.data ?? response.data;
  },

  uploadOfflineAudio: async (workspaceId: string, meetingId: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ data: any }>(`/workspaces/${workspaceId}/meetings/${meetingId}/offline-audio`, formData);
    return response.data?.data ?? response.data;
  },

  enrollVoice: async (workspaceId: string, userId: string, memberName: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ data: any }>(
      `/workspaces/${workspaceId}/voicebank/enroll?user_id=${encodeURIComponent(userId)}&member_name=${encodeURIComponent(memberName)}`,
      formData,
    );
    return response.data?.data ?? response.data;
  },

  getVoicebank: async (workspaceId: string): Promise<any[]> => {
    const response = await api.get<{ data: any[] }>(`/workspaces/${workspaceId}/voicebank`);
    return response.data?.data ?? response.data;
  },

  confirmSpeakers: async (workspaceId: string, meetingId: string, speakerMappings: Record<string, string>): Promise<any> => {
    const response = await api.post<{ data: any }>(`/workspaces/${workspaceId}/meetings/${meetingId}/confirm-speakers`, {
      speaker_mappings: speakerMappings,
    });
    return response.data?.data ?? response.data;
  },

  deleteSegment: async (workspaceId: string, meetingId: string, segmentId: string): Promise<any> => {
    const response = await api.delete<{ data: any }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/transcripts/${segmentId}`,
    );
    return response.data?.data ?? response.data;
  },

  clearMeetingTranscripts: async (workspaceId: string, meetingId: string): Promise<any> => {
    const response = await api.delete<{ data: any }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/transcripts`,
    );
    return response.data?.data ?? response.data;
  },
};

