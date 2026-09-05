import { api } from '@/lib/api';
import { type Member, MemberRole, normalizeMember } from '../types';

export const memberApi = {
  getMembers: async (workspaceId: string): Promise<{ documents: Member[]; total: number }> => {
    const response = await api.get<{ data: { documents: any[]; total: number } }>('/members', {
      params: { workspaceId },
    });
    const result = response.data?.data ?? response.data;
    return {
      documents: (result.documents || []).map(normalizeMember),
      total: result.total || 0,
    };
  },

  updateMember: async (memberId: string, role: MemberRole): Promise<{ id: string; workspace_id?: string }> => {
    const response = await api.patch<{ data: { id: string; workspace_id?: string } }>(`/members/${memberId}`, {
      role,
    });
    return response.data?.data ?? response.data;
  },

  deleteMember: async (memberId: string): Promise<{ id: string }> => {
    const response = await api.delete<{ data: { id: string } }>(`/members/${memberId}`);
    return response.data?.data ?? response.data;
  },
};
