'use client';

import { Paperclip, Plus, UploadCloud } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

import { useGetAssets } from '../api/use-get-assets';
import { useUploadAsset } from '../api/use-upload-asset';
import type { EntityType } from '../types';
import { AssetList } from './asset-list';
import { AssetUploader } from './asset-uploader';
import { UploadProgressCard, type UploadProgressItem } from './upload-progress-card';

interface AssetAttachmentSectionProps {
  workspaceId: string;
  entityType: EntityType | string;
  entityId: string;
  title?: string;
  canUpload?: boolean;
  canDelete?: boolean;
  className?: string;
}

export const AssetAttachmentSection = ({
  workspaceId,
  entityType,
  entityId,
  title = 'Tài liệu & Tệp đính kèm',
  canUpload = true,
  canDelete = true,
  className = '',
}: AssetAttachmentSectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadProgressItem[]>([]);

  const { data } = useGetAssets({
    workspaceId,
    entityType,
    entityId,
  });

  const { mutateAsync: uploadAsset } = useUploadAsset();

  const count = data?.total ?? data?.documents?.length ?? 0;

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return;

      const fileList = Array.from(files).map((file) => {
        // If it's a generic screenshot from clipboard (e.g. image.png, blob), assign a descriptive timestamped name
        if (file.name === 'image.png' || file.name === 'blob' || !file.name) {
          const now = new Date();
          const pad = (n: number) => n.toString().padStart(2, '0');
          const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
          const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
          return new File([file], `screenshot_${timestamp}.${ext}`, {
            type: file.type || 'image/png',
          });
        }
        return file;
      });

      for (const file of fileList) {
        const itemId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const ext = file.name.split('.').pop()?.toLowerCase() || '';

        const newItem: UploadProgressItem = {
          id: itemId,
          file,
          fileName: file.name,
          fileSize: file.size,
          extension: ext,
          progress: 0,
          loaded: 0,
          total: file.size,
          status: 'uploading',
        };

        // Add to queue
        setUploadQueue((prev) => [newItem, ...prev]);

        try {
          await uploadAsset({
            workspaceId,
            entityType,
            entityId,
            file,
            onProgress: (percent, loaded, total) => {
              setUploadQueue((prev) =>
                prev.map((item) =>
                  item.id === itemId
                    ? {
                        ...item,
                        progress: percent,
                        loaded,
                        total,
                        status: percent >= 100 ? 'processing' : 'uploading',
                      }
                    : item,
                ),
              );
            },
          });

          // Mark completed
          setUploadQueue((prev) => prev.map((item) => (item.id === itemId ? { ...item, progress: 100, status: 'completed' } : item)));

          // Auto-remove completed item after a short delay
          setTimeout(() => {
            setUploadQueue((prev) => prev.filter((item) => item.id !== itemId));
          }, 1200);
        } catch (err: any) {
          const detail = err?.response?.data?.detail || 'Tải lên thất bại';
          setUploadQueue((prev) => prev.map((item) => (item.id === itemId ? { ...item, status: 'error', error: detail } : item)));
        }
      }
    },
    [workspaceId, entityType, entityId, uploadAsset],
  );

  // Support Ctrl + V / Cmd + V pasting of files/screenshots
  useEffect(() => {
    if (!canUpload) return;

    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isTextInput =
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable);

      const clipboardFiles: File[] = [];

      if (e.clipboardData?.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) clipboardFiles.push(file);
          }
        }
      } else if (e.clipboardData?.files) {
        for (let i = 0; i < e.clipboardData.files.length; i++) {
          clipboardFiles.push(e.clipboardData.files[i]);
        }
      }

      if (clipboardFiles.length === 0) return;

      // If user is currently typing in an input/textarea and the clipboard has plain text,
      // don't hijack unless the paste action happened directly inside this attachment container
      const hasText = e.clipboardData?.types?.includes('text/plain');
      const isInsideContainer = containerRef.current?.contains(activeEl);

      if (isTextInput && hasText && !isInsideContainer) {
        return;
      }

      e.preventDefault();
      handleFiles(clipboardFiles);
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [canUpload, handleFiles]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canUpload) return;
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canUpload) return;
    handleFiles(e.dataTransfer.files);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeQueueItem = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div
      ref={containerRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      tabIndex={0}
      className={`relative flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-xs outline-none transition-colors focus-within:border-primary/50 ${
        isDragOver ? 'border-primary bg-primary/5' : ''
      } ${className}`}
    >
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFileInputChange} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-neutral-600" />
          <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
          {count > 0 && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">{count}</span>}
        </div>

        {canUpload && (
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:inline-flex">
              <span>hoặc nhấn</span>
              <kbd className="inline-flex h-4 items-center rounded border border-neutral-200 bg-neutral-100 px-1 font-mono text-[10px] text-neutral-500">
                Ctrl + V
              </kbd>
            </span>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 gap-1.5 text-xs font-medium border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900"
            >
              <Plus className="size-3.5" />
              <span>Thêm tệp</span>
            </Button>
          </div>
        )}
      </div>

      {/* Live Upload Progress Cards */}
      {uploadQueue.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {uploadQueue.map((item) => (
            <UploadProgressCard
              key={item.id}
              item={item}
              onCancel={removeQueueItem}
              onRetry={(failedItem) => {
                removeQueueItem(failedItem.id);
                handleFiles([failedItem.file] as any);
              }}
            />
          ))}
        </div>
      )}

      {/* Spacious dropzone when no files have been uploaded yet */}
      {canUpload && count === 0 && uploadQueue.length === 0 && (
        <AssetUploader workspaceId={workspaceId} entityType={entityType} entityId={entityId} onFilesSelected={handleFiles} />
      )}

      {/* Assets Grid / List */}
      <AssetList workspaceId={workspaceId} entityType={entityType} entityId={entityId} canDelete={canDelete} />
    </div>
  );
};
