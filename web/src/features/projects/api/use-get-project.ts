'use client';

import { useQuery } from '@tanstack/react-query';

import { projectApi } from './project-api';

interface UseGetProjectProps {
  projectId: string;
}

export const useGetProject = ({ projectId }: UseGetProjectProps) => {
  const query = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      return await projectApi.getProject(projectId);
    },
    enabled: !!projectId,
  });

  return query;
};
