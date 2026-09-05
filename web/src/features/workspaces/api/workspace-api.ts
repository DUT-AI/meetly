import { api } from '@/lib/api';
import {
  type Workspace,
  type WorkspaceAnalytics,
  type WorkspaceInfo,
  normalizeWorkspace,
  normalizeWorkspaceAnalytics,
} from '../types';

export const workspaceApi = {
  getWorkspaces: async (): Promise<{ documents: Workspace[]; total: number }> => {
    const response = await api.get<{ data: { documents: any[]; total: number } }>('/workspaces');
    const result = response.data?.data ?? response.data;
    return {
      documents: (result.documents || []).map(normalizeWorkspace),
      total: result.total || 0,
    };
  },

  getWorkspace: async (workspaceId: string): Promise<Workspace> => {
    const response = await api.get<{ data: any }>(`/workspaces/${workspaceId}`);
    const result = response.data?.data ?? response.data;
    return normalizeWorkspace(result);
  },

  getWorkspaceInfo: async (workspaceId: string): Promise<WorkspaceInfo> => {
    const response = await api.get<{ data: any }>(`/workspaces/${workspaceId}/info`);
    const result = response.data?.data ?? response.data;
    const id = result.id ?? result.$id;
    return {
      id,
      $id: id,
      name: result.name,
      imageUrl: result.imageUrl ?? result.image_url,
      image_url: result.image_url ?? result.imageUrl,
    };
  },

  createWorkspace: async (data: FormData | { name: string; image?: File | string }): Promise<Workspace> => {
    let payload: FormData;
    if (data instanceof FormData) {
      payload = data;
    } else {
      payload = new FormData();
      payload.append('name', data.name);
      if (data.image instanceof File) {
        payload.append('image', data.image);
      }
    }

    const response = await api.post<{ data: any }>('/workspaces', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const result = response.data?.data ?? response.data;
    return normalizeWorkspace(result);
  },

  updateWorkspace: async (
    workspaceId: string,
    data: FormData | { name?: string; image?: File | string },
  ): Promise<Workspace> => {
    let payload: FormData;
    if (data instanceof FormData) {
      payload = data;
    } else {
      payload = new FormData();
      if (data.name) payload.append('name', data.name);
      if (data.image instanceof File) {
        payload.append('image', data.image);
      }
    }

    const response = await api.patch<{ data: any }>(`/workspaces/${workspaceId}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const result = response.data?.data ?? response.data;
    return normalizeWorkspace(result);
  },

  deleteWorkspace: async (workspaceId: string): Promise<{ id: string }> => {
    const response = await api.delete<{ data: { id: string } }>(`/workspaces/${workspaceId}`);
    return response.data?.data ?? response.data;
  },

  resetInviteCode: async (workspaceId: string): Promise<Workspace> => {
    const response = await api.post<{ data: any }>(`/workspaces/${workspaceId}/reset-invite-code`);
    const result = response.data?.data ?? response.data;
    return normalizeWorkspace(result);
  },

  joinWorkspace: async (workspaceId: string, code: string): Promise<Workspace> => {
    const response = await api.post<{ data: any }>(`/workspaces/${workspaceId}/join`, { code });
    const result = response.data?.data ?? response.data;
    return normalizeWorkspace(result);
  },

  getWorkspaceAnalytics: async (workspaceId: string): Promise<WorkspaceAnalytics> => {
    const response = await api.get<{ data: any }>(`/workspaces/${workspaceId}/analytics`);
    const result = response.data?.data ?? response.data;
    return normalizeWorkspaceAnalytics(result);
  },
};
