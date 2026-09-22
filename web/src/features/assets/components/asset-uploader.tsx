'use client';

import { Loader2, UploadCloud } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { useUploadAsset } from '../api/use-upload-asset';
import type { EntityType } from '../types';

interface AssetUploaderProps {
  workspaceId: string;
  entityType: EntityType | string;
  entityId: string;
  onUploaded?: () => void;
  onFilesSelected?: (files: FileList | File[]) => void;
  compact?: boolean;
}

export const AssetUploader = ({ workspaceId, entityType, entityId, onUploaded, onFilesSelected, compact = false }: AssetUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { mutate: uploadAsset, isPending: isUploading } = useUploadAsset();

  const handleFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return;

      if (onFilesSelected) {
        onFilesSelected(files);
        return;
      }

      Array.from(files).forEach((file) => {
        uploadAsset(
          {
            workspaceId,
            entityType,
            entityId,
            file,
          },
          {
            onSuccess: () => {
              onUploaded?.();
            },
          },
        );
      });
    },
    [workspaceId, entityType, entityId, uploadAsset, onUploaded, onFilesSelected],
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (compact) {
    return (
      <div>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFileChange} disabled={isUploading} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-primary disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <UploadCloud className="size-3.5" />}
          <span>Đính kèm tệp</span>
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 hover:bg-neutral-50'
      } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
    >
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFileChange} disabled={isUploading} />

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex size-9 items-center justify-center rounded-full bg-white shadow-xs border">
          {isUploading ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <UploadCloud className="size-4 text-neutral-500 group-hover:text-primary transition-colors" />
          )}
        </div>
        <p className="text-xs font-semibold text-neutral-700">
          {isUploading ? 'Đang tải tệp lên...' : 'Kéo thả tệp vào đây, nhấn để chọn hoặc dán (Ctrl + V)'}
        </p>
        <p className="text-[11px] text-muted-foreground">Hỗ trợ dán ảnh từ clipboard, PDF, DOCX, XLSX, ZIP, MP4,...</p>
      </div>
    </div>
  );
};
