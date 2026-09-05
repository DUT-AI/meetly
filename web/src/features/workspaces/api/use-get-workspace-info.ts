'use client';

import { useQuery } from '@tanstack/react-query';

import { workspaceApi } from './workspace-api';

interface UseGetWorkspaceInfoProps {
  workspaceId: string;
}

export const useGetWorkspaceInfo = ({ workspaceId }: UseGetWorkspaceInfoProps) => {
  const query = useQuery({
    queryKey: ['workspace-info', workspaceId],
    queryFn: async () => {
      return await workspaceApi.getWorkspaceInfo(workspaceId);
    },
    enabled: !!workspaceId,
  });

  return query;
};
