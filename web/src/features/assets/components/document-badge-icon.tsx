import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DocumentBadgeIconProps {
  extension: string;
  className?: string;
}

export const DocumentBadgeIcon = ({ extension, className }: DocumentBadgeIconProps) => {
  const ext = (extension || 'file').toLowerCase().replace('.', '');

  const badgeColor = useMemo(() => {
    switch (ext) {
      case 'pdf':
        return 'bg-[#DC2626]'; // Red
      case 'doc':
      case 'docx':
        return 'bg-[#2563EB]'; // Blue
      case 'xls':
      case 'xlsx':
      case 'csv':
        return 'bg-[#059669]'; // Green
      case 'ppt':
      case 'pptx':
        return 'bg-[#EA580C]'; // Orange
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return 'bg-[#D97706]'; // Amber
      case 'mov':
      case 'mp4':
      case 'webm':
      case 'avi':
      case 'mkv':
        return 'bg-[#E11D48]'; // Rose / Video
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'svg':
      case 'gif':
        return 'bg-[#7C3AED]'; // Purple / Image
      case 'mp3':
      case 'wav':
      case 'm4a':
        return 'bg-[#F59E0B]'; // Amber / Audio
      case 'json':
      case 'js':
      case 'ts':
      case 'tsx':
      case 'py':
      case 'sql':
      case 'txt':
        return 'bg-[#0891B2]'; // Cyan / Code
      default:
        return 'bg-[#4B5563]'; // Gray
    }
  }, [ext]);

  const displayBadge = ext.length > 4 ? ext.slice(0, 4).toUpperCase() : ext.toUpperCase();

  return (
    <div className={cn('relative flex size-12 shrink-0 items-center justify-center select-none', className)}>
      {/* Folded Paper Outline SVG */}
      <svg
        className="size-11 drop-shadow-2xs"
        viewBox="0 0 38 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Document Body with folded corner */}
        <path
          d="M3 8C3 4.68629 5.68629 2 9 2H23.5L35 13.5V40C35 43.3137 32.3137 46 29 46H9C5.68629 46 3 43.3137 3 40V8Z"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Folded flap */}
        <path
          d="M23.5 2V12C23.5 12.8284 24.1716 13.5 25 13.5H35"
          stroke="#CBD5E1"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Pill Badge at bottom left corner */}
      <span
        className={cn(
          'absolute bottom-0.5 left-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white shadow-xs',
          badgeColor,
        )}
      >
        {displayBadge}
      </span>
    </div>
  );
};
