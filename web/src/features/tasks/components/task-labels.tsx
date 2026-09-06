import { cn } from '@/lib/utils';

interface TaskLabelsProps {
  labels: string[];
  labelColorMap?: Record<string, string>;
  className?: string;
  maxDisplay?: number;
}

export const TaskLabels = ({
  labels = [],
  labelColorMap = {},
  className,
  maxDisplay,
}: TaskLabelsProps) => {
  if (!labels || labels.length === 0) return null;

  const displayLabels = maxDisplay ? labels.slice(0, maxDisplay) : labels;
  const remainingCount = maxDisplay && labels.length > maxDisplay ? labels.length - maxDisplay : 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {displayLabels.map((name) => {
        const color = labelColorMap[name] || '#64748b';
        return (
          <span
            key={name}
            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-white shadow-xs"
            style={{ backgroundColor: color }}
          >
            {name}
          </span>
        );
      })}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-200 text-neutral-700">
          +{remainingCount}
        </span>
      )}
    </div>
  );
};
