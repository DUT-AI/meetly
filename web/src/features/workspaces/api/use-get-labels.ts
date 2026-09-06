import { useQuery } from '@tanstack/react-query';

import { workspaceApi } from './workspace-api';

interface UseGetLabelsProps {
  workspaceId: string;
}

export const useGetLabels = ({ workspaceId }: UseGetLabelsProps) => {
  const query = useQuery({
    queryKey: ['workspace-labels', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await workspaceApi.getLabels(workspaceId);
    },
    enabled: !!workspaceId,
  });

  return query;
};
