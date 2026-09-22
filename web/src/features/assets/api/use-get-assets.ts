import { useQuery } from '@tanstack/react-query';

import type { EntityType } from '../types';
import { assetApi } from './asset-api';

interface UseGetAssetsProps {
  workspaceId: string;
  entityType: EntityType | string;
  entityId: string;
  enabled?: boolean;
}

export const useGetAssets = ({ workspaceId, entityType, entityId, enabled = true }: UseGetAssetsProps) => {
  return useQuery({
    queryKey: ['assets', workspaceId, entityType, entityId],
    queryFn: async () => {
      return await assetApi.getAssets(workspaceId, entityType, entityId);
    },
    enabled: enabled && !!workspaceId && !!entityType && !!entityId,
  });
};
