'use server';

import { serverFetch } from '@/lib/api-server';

import { type Workspace, normalizeWorkspace } from './types';

export const getWorkspaces = async (): Promise<{ documents: Workspace[]; total: number }> => {
  try {
    const res = await serverFetch<{ documents: any[]; total: number }>('/workspaces');
    if (!res) return { documents: [], total: 0 };
    return {
      documents: (res.documents || []).map(normalizeWorkspace),
      total: res.total || 0,
    };
  } catch {
    return { documents: [], total: 0 };
  }
};
