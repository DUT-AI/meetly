'use client';

import { useQuery } from '@tanstack/react-query';

import { projectApi } from './project-api';

interface UseGetProjectsProps {
  workspaceId: string;
}

export const useGetProjects = ({ workspaceId }: UseGetProjectsProps) => {
  const query = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      return await projectApi.getProjects(workspaceId);
    },
    enabled: !!workspaceId,
  });

  return query;
};
