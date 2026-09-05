'use client';

import { useQuery } from '@tanstack/react-query';

import { workspaceApi } from './workspace-api';

interface UseGetWorkspaceProps {
  workspaceId: string;
}

export const useGetWorkspace = ({ workspaceId }: UseGetWorkspaceProps) => {
  const query = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      return await workspaceApi.getWorkspace(workspaceId);
    },
    enabled: !!workspaceId,
  });

  return query;
};
