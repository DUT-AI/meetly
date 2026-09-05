import { api } from '@/lib/api';
import {
  type Project,
  type ProjectAnalytics,
  normalizeProject,
  normalizeProjectAnalytics,
} from '../types';

export const projectApi = {
  getProjects: async (workspaceId: string): Promise<{ documents: Project[]; total: number }> => {
    const response = await api.get<{ data: { documents: any[]; total: number } }>('/projects', {
      params: { workspaceId },
    });
    const result = response.data?.data ?? response.data;
    return {
      documents: (result.documents || []).map(normalizeProject),
      total: result.total || 0,
    };
  },

  getProject: async (projectId: string): Promise<Project> => {
    const response = await api.get<{ data: any }>(`/projects/${projectId}`);
    const result = response.data?.data ?? response.data;
    return normalizeProject(result);
  },

  createProject: async (
    data: FormData | { name: string; workspaceId: string; image?: File | string },
  ): Promise<Project> => {
    let payload: FormData;
    if (data instanceof FormData) {
      payload = data;
    } else {
      payload = new FormData();
      payload.append('name', data.name);
      payload.append('workspaceId', data.workspaceId);
      if (data.image instanceof File) {
        payload.append('image', data.image);
      }
    }

    const response = await api.post<{ data: any }>('/projects', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const result = response.data?.data ?? response.data;
    return normalizeProject(result);
  },

  updateProject: async (
    projectId: string,
    data: FormData | { name?: string; image?: File | string },
  ): Promise<Project> => {
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

    const response = await api.patch<{ data: any }>(`/projects/${projectId}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const result = response.data?.data ?? response.data;
    return normalizeProject(result);
  },

  deleteProject: async (projectId: string): Promise<{ id: string }> => {
    const response = await api.delete<{ data: { id: string } }>(`/projects/${projectId}`);
    return response.data?.data ?? response.data;
  },

  getProjectAnalytics: async (projectId: string): Promise<ProjectAnalytics> => {
    const response = await api.get<{ data: any }>(`/projects/${projectId}/analytics`);
    const result = response.data?.data ?? response.data;
    return normalizeProjectAnalytics(result);
  },
};
