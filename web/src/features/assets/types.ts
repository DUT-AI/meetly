export type EntityType = 'TASK' | 'TASK_COMMENT' | 'PROJECT' | 'WORKSPACE';

export type AssetCategory = 'IMAGE' | 'DOCUMENT' | 'ARCHIVE' | 'VIDEO' | 'AUDIO' | 'CODE' | 'OTHER';

export interface Asset {
  id: string;
  workspaceId: string;
  entityType: EntityType | string;
  entityId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  extension: string;
  category: AssetCategory;
  uploadedBy: string;
  uploaderName?: string;
  downloadUrl?: string;
  previewUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AssetListResponse {
  documents: Asset[];
  total: number;
}

export const normalizeAsset = (data: any): Asset => ({
  id: data.id || data.$id,
  workspaceId: data.workspace_id || data.workspaceId,
  entityType: data.entity_type || data.entityType,
  entityId: data.entity_id || data.entityId,
  fileName: data.file_name || data.fileName || 'Tệp không tên',
  fileSize: Number(data.file_size ?? data.fileSize ?? 0),
  mimeType: data.mime_type || data.mimeType || 'application/octet-stream',
  extension: (data.extension || '').toLowerCase(),
  category: data.category || 'OTHER',
  uploadedBy: data.uploaded_by || data.uploadedBy || '',
  uploaderName: data.uploader_name || data.uploaderName,
  downloadUrl: data.download_url || data.downloadUrl,
  previewUrl: data.preview_url || data.previewUrl,
  metadata: data.metadata || {},
  createdAt: data.created_at || data.createdAt || new Date().toISOString(),
  updatedAt: data.updated_at || data.updatedAt || new Date().toISOString(),
});
