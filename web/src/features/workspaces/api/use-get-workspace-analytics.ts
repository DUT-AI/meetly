'use client';

import { useQuery } from '@tanstack/react-query';

import { type WorkspaceAnalytics } from '../types';
import { workspaceApi } from './workspace-api';

interface UseGetWorkspaceAnalyticsProps {
  workspaceId: string;
}

export type WorkspaceAnalyticsResponseType = { data: WorkspaceAnalytics };

export const useGetWorkspaceAnalytics = ({ workspaceId }: UseGetWorkspaceAnalyticsProps) => {
  const query = useQuery({
    queryKey: ['workspace-analytics', workspaceId],
    queryFn: async () => {
      return await workspaceApi.getWorkspaceAnalytics(workspaceId);
    },
    enabled: !!workspaceId,
  });

  return query;
};
