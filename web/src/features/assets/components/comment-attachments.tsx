'use client';

import { Download, Eye, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Asset } from '../types';
import { formatFileSize } from './asset-icon';
import { AssetPreviewModal } from './asset-preview-modal';
import { DocumentBadgeIcon } from './document-badge-icon';
import { useDeleteAsset } from '../api/use-delete-asset';
import { useGetAssets } from '../api/use-get-assets';

interface CommentAttachmentsProps {
  workspaceId: string;
  commentId: string;
  canDelete?: boolean;
  className?: string;
}

export const CommentAttachments = ({
  workspaceId,
  commentId,
  canDelete = false,
  className = '',
}: CommentAttachmentsProps) => {
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

  const { data, isLoading } = useGetAssets({
    workspaceId,
    entityType: 'TASK_COMMENT',
    entityId: commentId,
  });

  const { mutate: deleteAsset, isPending: isDeleting } = useDeleteAsset();

  const assets = data?.documents || [];

  if (isLoading || assets.length === 0) {
    return null;
  }

  const images = assets.filter(
    (a) => a.category === 'IMAGE' || a.mimeType?.startsWith('image/'),
  );
  const otherFiles = assets.filter(
    (a) => a.category !== 'IMAGE' && !a.mimeType?.startsWith('image/'),
  );

  const handleDownload = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    if (asset.downloadUrl || asset.previewUrl) {
      window.open(asset.downloadUrl || asset.previewUrl, '_blank');
    }
  };

  const handleDelete = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    if (confirm(`Bạn có chắc chắn muốn xoá tệp "${asset.fileName}" không?`)) {
      deleteAsset({
        workspaceId,
        assetId: asset.id,
        fileName: asset.fileName,
        entityType: 'TASK_COMMENT',
        entityId: commentId,
      });
    }
  };

  return (
    <div className={`mt-2 flex flex-col gap-2 ${className}`}>
      {/* Image Gallery */}
      {images.length > 0 && (
        <div
          className={
            images.length === 1
              ? 'flex'
              : 'grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg'
          }
        >
          {images.map((img) => (
            <div
              key={img.id}
              onClick={() => setPreviewAsset(img)}
              className="group relative cursor-pointer overflow-hidden rounded-lg border border-neutral-200/80 bg-neutral-50 shadow-2xs transition-all hover:border-neutral-300"
            >
              <img
                src={img.previewUrl || img.downloadUrl}
                alt={img.fileName}
                className={
                  images.length === 1
                    ? 'max-h-56 w-auto max-w-full rounded-lg object-contain'
                    : 'aspect-video sm:aspect-square size-full object-cover transition-transform duration-200 group-hover:scale-105'
                }
                loading="lazy"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-xs">
                  <Eye className="size-3.5" />
                  <span>Xem</span>
                </div>
              </div>

              {/* Delete button for author */}
              {canDelete && (
                <button
                  type="button"
                  title="Xoá ảnh"
                  onClick={(e) => handleDelete(e, img)}
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-white/80 text-neutral-600 opacity-0 shadow-xs transition hover:bg-red-500 hover:text-white group-hover:opacity-100"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Non-image File Cards */}
      {otherFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {otherFiles.map((file) => {
            const isPreviewable =
              file.extension === 'pdf' ||
              file.category === 'VIDEO' ||
              file.category === 'AUDIO';

            return (
              <div
                key={file.id}
                onClick={() => isPreviewable && setPreviewAsset(file)}
                className={`flex items-center gap-2 rounded-lg border border-neutral-200/90 bg-neutral-50/70 px-2.5 py-1.5 text-xs text-neutral-800 shadow-2xs transition hover:bg-neutral-100/90 ${
                  isPreviewable ? 'cursor-pointer' : ''
                }`}
              >
                <DocumentBadgeIcon extension={file.extension} className="scale-75 -mx-1" />

                <div className="flex flex-col min-w-0 max-w-[180px]">
                  <span className="truncate font-medium text-[12px] text-neutral-800" title={file.fileName}>
                    {file.fileName}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {formatFileSize(file.fileSize)}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 ml-1">
                  {isPreviewable && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 text-neutral-500 hover:text-neutral-800"
                      title="Xem trước"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewAsset(file);
                      }}
                    >
                      <Eye className="size-3" />
                    </Button>
                  )}

                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6 text-neutral-500 hover:text-neutral-800"
                    title="Tải xuống"
                    onClick={(e) => handleDownload(e, file)}
                  >
                    <Download className="size-3" />
                  </Button>

                  {canDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 text-neutral-400 hover:text-red-500"
                      title="Xoá tệp"
                      onClick={(e) => handleDelete(e, file)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <AssetPreviewModal
        asset={previewAsset}
        isOpen={!!previewAsset}
        onClose={() => setPreviewAsset(null)}
      />
    </div>
  );
};
