'use client';

import { Check, Loader2, RotateCw, X } from 'lucide-react';
import { DocumentBadgeIcon } from './document-badge-icon';
import { formatFileSize } from './asset-icon';

export interface UploadProgressItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  extension: string;
  progress: number;
  loaded: number;
  total: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

interface UploadProgressCardProps {
  item: UploadProgressItem;
  onCancel?: (id: string) => void;
  onRetry?: (item: UploadProgressItem) => void;
}

export const UploadProgressCard = ({
  item,
  onCancel,
  onRetry,
}: UploadProgressCardProps) => {
  const isError = item.status === 'error';
  const isCompleted = item.status === 'completed';

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between gap-4">
        {/* Document Badge Icon */}
        <DocumentBadgeIcon extension={item.extension} />

        {/* File Details */}
        <div className="flex flex-1 flex-col justify-center min-w-0">
          <p
            className="text-[14px] font-semibold text-neutral-800 truncate leading-snug"
            title={item.fileName}
          >
            {item.fileName}
          </p>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
            <span>
              {isCompleted
                ? `${formatFileSize(item.total)} of ${formatFileSize(item.total)}`
                : `${formatFileSize(item.loaded)} of ${formatFileSize(item.total)}`}
            </span>
            <span>•</span>

            {/* Status indicator */}
            {isError ? (
              <span className="flex items-center gap-1 font-medium text-red-600">
                <span className="flex size-4 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold">
                  !
                </span>
                <span>Error</span>
              </span>
            ) : isCompleted ? (
              <span className="flex items-center gap-1 font-medium text-neutral-700">
                <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">
                  <Check className="size-2.5 stroke-[3]" />
                </span>
                <span>Completed</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium text-neutral-600">
                <Loader2 className="size-3.5 animate-spin text-neutral-500" />
                <span>Uploading...</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Button on Right */}
        <div className="flex items-center shrink-0">
          {isError ? (
            <button
              type="button"
              onClick={() => onRetry?.(item)}
              title="Thử lại"
              className="flex size-7 items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900"
            >
              <RotateCw className="size-4 stroke-[2.2]" />
            </button>
          ) : !isCompleted ? (
            <button
              type="button"
              onClick={() => onCancel?.(item.id)}
              title="Hủy tải lên"
              className="flex size-6 items-center justify-center rounded-full bg-neutral-600 text-white transition hover:bg-neutral-800"
            >
              <X className="size-3.5 stroke-[2.5]" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Full-width Progress Bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isError
              ? 'bg-neutral-300 w-full'
              : isCompleted
              ? 'bg-[#48396e] w-full'
              : 'bg-[#48396e]'
          }`}
          style={{
            width: isError || isCompleted ? '100%' : `${Math.max(item.progress, 4)}%`,
          }}
        />
      </div>
    </div>
  );
};
