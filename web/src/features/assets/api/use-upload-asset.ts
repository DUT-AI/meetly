import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { assetApi } from './asset-api';
import type { EntityType } from '../types';

interface UploadAssetParam {
  workspaceId: string;
  entityType: EntityType | string;
  entityId: string;
  file: File;
  onProgress?: (percent: number, loaded: number, total: number) => void;
}

export const useUploadAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      entityType,
      entityId,
      file,
      onProgress,
    }: UploadAssetParam) => {
      return await assetApi.uploadAsset(
        workspaceId,
        entityType,
        entityId,
        file,
        onProgress,
      );
    },
    onSuccess: (data, variables) => {
      toast.success(`Đã tải lên tệp: ${data.fileName}`);
      queryClient.invalidateQueries({
        queryKey: [
          'assets',
          variables.workspaceId,
          variables.entityType,
          variables.entityId,
        ],
      });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail || 'Không thể tải lên tệp đính kèm';
      toast.error(msg);
    },
  });
};
