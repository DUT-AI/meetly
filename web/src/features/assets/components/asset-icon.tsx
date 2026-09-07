import {
  File,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Presentation,
} from 'lucide-react';
import type { AssetCategory } from '../types';
import { cn } from '@/lib/utils';

interface AssetIconProps {
  category: AssetCategory | string;
  extension: string;
  className?: string;
}

export const AssetIcon = ({ category, extension, className }: AssetIconProps) => {
  const ext = extension.toLowerCase();

  if (category === 'IMAGE' || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) {
    return <ImageIcon className={cn('size-5 text-purple-600', className)} />;
  }

  if (ext === 'pdf') {
    return <FileText className={cn('size-5 text-red-600', className)} />;
  }

  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) {
    return <FileText className={cn('size-5 text-blue-600', className)} />;
  }

  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return <FileSpreadsheet className={cn('size-5 text-emerald-600', className)} />;
  }

  if (['ppt', 'pptx', 'odp'].includes(ext)) {
    return <Presentation className={cn('size-5 text-orange-600', className)} />;
  }

  if (category === 'ARCHIVE' || ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return <FileArchive className={cn('size-5 text-amber-600', className)} />;
  }

  if (category === 'VIDEO' || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
    return <Film className={cn('size-5 text-rose-600', className)} />;
  }

  if (category === 'AUDIO' || ['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext)) {
    return <Music className={cn('size-5 text-amber-500', className)} />;
  }

  if (category === 'CODE' || ['json', 'txt', 'md', 'ts', 'tsx', 'js', 'py', 'sql', 'log'].includes(ext)) {
    return <FileCode className={cn('size-5 text-cyan-600', className)} />;
  }

  return <File className={cn('size-5 text-neutral-500', className)} />;
};

export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(size < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};
