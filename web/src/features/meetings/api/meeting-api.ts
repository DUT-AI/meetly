import { api } from '@/lib/api';
import { Meeting } from '../types';

export interface CreateMeetingPayload {
  title: string;
  start_time: Date | string;
  end_time: Date | string;
  participants?: string[];
  report?: Record<string, any>;
}

export interface UpdateMeetingPayload {
  title?: string;
  start_time?: Date | string;
  end_time?: Date | string;
  participants?: string[];
  report?: Record<string, any>;
}

export const meetingApi = {
  getMeetings: async (workspaceId: string): Promise<{ documents: Meeting[]; total: number }> => {
    const response = await api.get<{ data: { documents: Meeting[]; total: number } }>(
      `/workspaces/${workspaceId}/meetings`,
    );
    return response.data?.data ?? response.data;
  },

  createMeeting: async (workspaceId: string, payload: CreateMeetingPayload): Promise<Meeting> => {
    const body = {
      ...payload,
      workspace_id: workspaceId,
      start_time: payload.start_time instanceof Date ? payload.start_time.toISOString() : payload.start_time,
      end_time: payload.end_time instanceof Date ? payload.end_time.toISOString() : payload.end_time,
      participants: payload.participants || [],
      report: payload.report || {},
    };
    const response = await api.post<{ data: Meeting }>(`/workspaces/${workspaceId}/meetings`, body);
    return response.data?.data ?? response.data;
  },

  updateMeeting: async (
    workspaceId: string,
    meetingId: string,
    payload: UpdateMeetingPayload,
  ): Promise<Meeting> => {
    const body: Record<string, any> = { ...payload };
    if (payload.start_time) {
      body.start_time =
        payload.start_time instanceof Date ? payload.start_time.toISOString() : payload.start_time;
    }
    if (payload.end_time) {
      body.end_time =
        payload.end_time instanceof Date ? payload.end_time.toISOString() : payload.end_time;
    }
    const response = await api.patch<{ data: Meeting }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}`,
      body,
    );
    return response.data?.data ?? response.data;
  },

  deleteMeeting: async (workspaceId: string, meetingId: string): Promise<{ id: string }> => {
    const response = await api.delete<{ data: { id: string } }>(
      `/workspaces/${workspaceId}/meetings/${meetingId}`,
    );
    return response.data?.data ?? response.data;
  },
};
