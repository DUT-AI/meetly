'use client';

import { useQuery } from '@tanstack/react-query';

import { type ProjectAnalytics } from '../types';
import { projectApi } from './project-api';

interface UseGetProjectAnalyticsProps {
  projectId: string;
}

export type ProjectAnalyticsResponseType = { data: ProjectAnalytics };

export const useGetProjectAnalytics = ({ projectId }: UseGetProjectAnalyticsProps) => {
  const query = useQuery({
    queryKey: ['project-analytics', projectId],
    queryFn: async () => {
      return await projectApi.getProjectAnalytics(projectId);
    },
    enabled: !!projectId,
  });

  return query;
};
