'use client';

import { Download, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import type { Asset } from '../types';
import { AssetIcon, formatFileSize } from './asset-icon';

interface AssetPreviewModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AssetPreviewModal = ({ asset, isOpen, onClose }: AssetPreviewModalProps) => {
  const [zoom, setZoom] = useState(1);

  if (!asset) return null;

  const url = asset.downloadUrl || asset.previewUrl;
  const isImage = asset.category === 'IMAGE';
  const isPdf = asset.extension === 'pdf';
  const isVideo = asset.category === 'VIDEO';
  const isAudio = asset.category === 'AUDIO';

  const handleDownload = () => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleOpenNewTab = () => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) setZoom(1);
        onClose();
      }}
    >
      <DialogContent className="flex flex-col gap-0 p-0 overflow-hidden w-[96vw] max-w-[96vw] sm:max-w-[96vw] h-[94vh] max-h-[94vh] sm:rounded-2xl border-neutral-200/80 shadow-2xl bg-white">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b px-6 py-3.5 bg-white shrink-0 pr-12">
          <div className="flex items-center gap-3 truncate pr-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
              <AssetIcon category={asset.category} extension={asset.extension} />
            </div>
            <div className="truncate text-left">
              <DialogTitle className="text-base font-semibold truncate text-neutral-900">{asset.fileName}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(asset.fileSize)} • {asset.extension.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isImage && (
              <div className="flex items-center gap-1 mr-2 border-r pr-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  title="Phóng to"
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                >
                  <ZoomIn className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  title="Thu nhỏ"
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                >
                  <ZoomOut className="size-4" />
                </Button>
                {zoom !== 1 && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-1.5" onClick={() => setZoom(1)}>
                    {Math.round(zoom * 100)}%
                  </Button>
                )}
              </div>
            )}

            {url && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleOpenNewTab}
                  title="Mở toàn màn hình trong tab mới"
                  className="hidden sm:inline-flex gap-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Tab mới</span>
                </Button>

                <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 text-xs">
                  <Download className="size-3.5" />
                  <span>Tải xuống</span>
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Content Preview Area - Expands to fill the 94vh dialog */}
        <div className="flex flex-1 w-full min-h-0 items-center justify-center overflow-auto bg-neutral-950/95 p-4 select-none">
          {isImage && url ? (
            <div className="flex size-full items-center justify-center overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={asset.fileName}
                style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease' }}
                className="max-h-[82vh] max-w-full object-contain rounded-md shadow-2xl"
              />
            </div>
          ) : isPdf && url ? (
            <iframe src={url} title={asset.fileName} className="size-full rounded-lg border-0 bg-white shadow-lg" />
          ) : isVideo && url ? (
            <video src={url} controls className="max-h-[82vh] max-w-full rounded-lg shadow-2xl" autoPlay>
              Trình duyệt của bạn không hỗ trợ phát video.
            </video>
          ) : isAudio && url ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-10 shadow-xl border">
              <AssetIcon category="AUDIO" extension="mp3" className="size-20 text-amber-500" />
              <p className="font-semibold text-neutral-800 text-base">{asset.fileName}</p>
              <audio src={url} controls className="w-96" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white p-12 text-center shadow-xl max-w-lg border">
              <div className="flex size-20 items-center justify-center rounded-2xl bg-neutral-100 shadow-xs border">
                <AssetIcon category={asset.category} extension={asset.extension} className="size-10" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">{asset.fileName}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  Định dạng này không hỗ trợ xem trước trực tiếp trong trình duyệt. Vui lòng tải về máy để mở.
                </p>
              </div>
              {url && (
                <Button onClick={handleDownload} className="mt-2 gap-2">
                  <Download className="size-4" /> Tải về ({formatFileSize(asset.fileSize)})
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
