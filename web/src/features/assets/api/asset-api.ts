import { api } from '@/lib/api';
import { type Asset, type AssetListResponse, normalizeAsset } from '../types';

export const assetApi = {
  async getAssets(
    workspaceId: string,
    entityType: string,
    entityId: string,
  ): Promise<AssetListResponse> {
    const { data } = await api.get(`/workspaces/${workspaceId}/assets`, {
      params: {
        entity_type: entityType,
        entity_id: entityId,
      },
    });

    const documents = (data.documents || []).map(normalizeAsset);
    return {
      documents,
      total: data.total ?? documents.length,
    };
  },

  async uploadAsset(
    workspaceId: string,
    entityType: string,
    entityId: string,
    file: File,
    onProgress?: (percent: number, loaded: number, total: number) => void,
  ): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_type', entityType);
    formData.append('entity_id', entityId);

    const { data } = await api.post(
      `/workspaces/${workspaceId}/assets/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress?.(percent, progressEvent.loaded, progressEvent.total);
          }
        },
      },
    );

    return normalizeAsset(data);
  },

  async deleteAsset(workspaceId: string, assetId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/assets/${assetId}`);
  },

  async getDownloadUrl(
    workspaceId: string,
    assetId: string,
  ): Promise<{ downloadUrl: string; fileName: string; mimeType: string }> {
    const { data } = await api.get(
      `/workspaces/${workspaceId}/assets/${assetId}/download`,
    );
    return {
      downloadUrl: data.download_url,
      fileName: data.file_name,
      mimeType: data.mime_type,
    };
  },
};
