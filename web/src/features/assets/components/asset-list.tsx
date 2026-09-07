'use client';

import { FileText, Inbox, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Asset, AssetCategory, EntityType } from '../types';
import { AssetCard } from './asset-card';
import { AssetPreviewModal } from './asset-preview-modal';
import { useGetAssets } from '../api/use-get-assets';

interface AssetListProps {
  workspaceId: string;
  entityType: EntityType | string;
  entityId: string;
  canDelete?: boolean;
}

export const AssetList = ({
  workspaceId,
  entityType,
  entityId,
  canDelete = true,
}: AssetListProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

  const { data, isLoading } = useGetAssets({
    workspaceId,
    entityType,
    entityId,
  });

  const assets = data?.documents || [];

  const filteredAssets = useMemo(() => {
    if (selectedCategory === 'ALL') return assets;
    return assets.filter((a) => a.category === selectedCategory);
  }, [assets, selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set(assets.map((a) => a.category));
    return Array.from(set);
  }, [assets]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral-400">
        <Loader2 className="size-5 animate-spin mr-2" />
        <span className="text-xs">Đang tải danh sách tệp đính kèm...</span>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground border rounded-lg bg-neutral-50/40">
        <Inbox className="size-7 mb-1.5 opacity-40" />
        <p className="text-xs font-medium">Chưa có tệp đính kèm nào</p>
        <p className="text-[11px] text-neutral-400 mt-0.5">
          Tải lên tài liệu, hình ảnh hoặc file nén để lưu trữ cùng mục này
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Category filter pills if multiple categories exist */}
      {categories.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-neutral-800 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Tất cả ({assets.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                selectedCategory === cat
                  ? 'bg-neutral-800 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat} ({assets.filter((a) => a.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Grid of cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filteredAssets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            workspaceId={workspaceId}
            onPreview={setPreviewAsset}
            canDelete={canDelete}
          />
        ))}
      </div>

      {/* Preview Modal */}
      <AssetPreviewModal
        asset={previewAsset}
        isOpen={!!previewAsset}
        onClose={() => setPreviewAsset(null)}
      />
    </div>
  );
};
