import { cn } from '@/lib/utils';

const PRESET_LABEL_COLORS = [
  '#0284c7', // Sky
  '#0d9488', // Teal
  '#16a34a', // Emerald/Green
  '#d97706', // Amber
  '#e11d48', // Rose
  '#7c3aed', // Violet
  '#2563eb', // Blue
  '#db2777', // Pink
  '#ea580c', // Orange
  '#4f46e5', // Indigo
];

export function getDeterministicLabelColor(name: string): string {
  if (!name) return '#64748b';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_LABEL_COLORS.length;
  return PRESET_LABEL_COLORS[index];
}

interface TaskLabelsProps {
  labels: string[];
  labelColorMap?: Record<string, string>;
  className?: string;
  maxDisplay?: number;
}

export const TaskLabels = ({ labels = [], labelColorMap = {}, className, maxDisplay }: TaskLabelsProps) => {
  if (!labels || labels.length === 0) return null;

  const displayLabels = maxDisplay ? labels.slice(0, maxDisplay) : labels;
  const remainingCount = maxDisplay && labels.length > maxDisplay ? labels.length - maxDisplay : 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {displayLabels.map((name) => {
        const color = labelColorMap[name] || getDeterministicLabelColor(name);
        return (
          <span
            key={name}
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-white shadow-xs select-none tracking-tight"
            style={{ backgroundColor: color }}
          >
            {name}
          </span>
        );
      })}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-200 text-neutral-700 shadow-2xs">
          +{remainingCount}
        </span>
      )}
    </div>
  );
};
