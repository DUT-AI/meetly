'use client';

import { useQuery } from '@tanstack/react-query';

import { workspaceApi } from './workspace-api';

export const useGetWorkspaces = () => {
  const query = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      return await workspaceApi.getWorkspaces();
    },
  });

  return query;
};
