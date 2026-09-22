'use client';

import { Download, Eye, MoreVertical, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import { useDeleteAsset } from '../api/use-delete-asset';
import type { Asset } from '../types';
import { formatFileSize } from './asset-icon';
import { DocumentBadgeIcon } from './document-badge-icon';

interface AssetCardProps {
  asset: Asset;
  workspaceId: string;
  onPreview?: (asset: Asset) => void;
  canDelete?: boolean;
}

export const AssetCard = ({ asset, workspaceId, onPreview, canDelete = true }: AssetCardProps) => {
  const { mutate: deleteAsset, isPending: isDeleting } = useDeleteAsset();

  const isPreviewable = asset.category === 'IMAGE' || asset.extension === 'pdf' || asset.category === 'VIDEO' || asset.category === 'AUDIO';

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (asset.downloadUrl || asset.previewUrl) {
      window.open(asset.downloadUrl || asset.previewUrl, '_blank');
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Bạn có chắc chắn muốn xoá tệp "${asset.fileName}" không?`)) {
      deleteAsset({
        workspaceId,
        assetId: asset.id,
        fileName: asset.fileName,
        entityType: asset.entityType,
        entityId: asset.entityId,
      });
    }
  };

  return (
    <div
      onClick={() => isPreviewable && onPreview?.(asset)}
      className={`group relative flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md ${
        isPreviewable ? 'cursor-pointer' : ''
      } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Document Badge Icon */}
        <DocumentBadgeIcon extension={asset.extension} />

        {/* File Details */}
        <div className="flex flex-1 flex-col justify-center min-w-0">
          <p className="text-[14px] font-semibold text-neutral-800 truncate leading-snug" title={asset.fileName}>
            {asset.fileName}
          </p>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
            <span>{formatFileSize(asset.fileSize)}</span>
            <span>•</span>
            <span className="uppercase font-medium text-[10px] bg-neutral-100 px-1.5 py-0.2 rounded text-neutral-600">
              {asset.extension}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {isPreviewable && (
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-neutral-500 hover:text-neutral-800"
              title="Xem trước"
              onClick={(e) => {
                e.stopPropagation();
                onPreview?.(asset);
              }}
            >
              <Eye className="size-4" />
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-neutral-500 hover:text-neutral-800"
            title="Tải xuống"
            onClick={handleDownload}
          >
            <Download className="size-4" />
          </Button>

          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button size="icon" variant="ghost" className="size-8 text-neutral-400 hover:text-neutral-700">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={handleDelete}>
                  <Trash2 className="mr-2 size-4" /> Xoá tệp
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
};
