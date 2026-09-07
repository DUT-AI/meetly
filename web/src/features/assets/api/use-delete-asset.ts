import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { assetApi } from './asset-api';
import type { EntityType } from '../types';

interface DeleteAssetParam {
  workspaceId: string;
  assetId: string;
  fileName?: string;
  entityType?: EntityType | string;
  entityId?: string;
}

export const useDeleteAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, assetId }: DeleteAssetParam) => {
      return await assetApi.deleteAsset(workspaceId, assetId);
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.fileName
          ? `Đã xoá tệp: ${variables.fileName}`
          : 'Đã xoá tệp đính kèm',
      );
      if (variables.entityType && variables.entityId) {
        queryClient.invalidateQueries({
          queryKey: [
            'assets',
            variables.workspaceId,
            variables.entityType,
            variables.entityId,
          ],
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: ['assets'],
        });
      }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail || 'Không thể xoá tệp đính kèm';
      toast.error(msg);
    },
  });
};
