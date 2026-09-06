import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { TaskPriority } from '@/features/tasks/types';
import { cn } from '@/lib/utils';

interface TaskPriorityBadgeProps {
  priority?: TaskPriority;
  className?: string;
  showIcon?: boolean;
}

const PRIORITY_CONFIG = {
  [TaskPriority.LOW]: {
    label: 'Thấp',
    color: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80',
    icon: ArrowDown,
    iconColor: 'text-slate-500',
  },
  [TaskPriority.MEDIUM]: {
    label: 'Trung bình',
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    icon: Minus,
    iconColor: 'text-blue-500',
  },
  [TaskPriority.HIGH]: {
    label: 'Cao',
    color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    icon: ArrowUp,
    iconColor: 'text-orange-500',
  },
  [TaskPriority.URGENT]: {
    label: 'Khẩn cấp',
    color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-bold',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
  },
};

export const TaskPriorityBadge = ({
  priority = TaskPriority.MEDIUM,
  className,
  showIcon = true,
}: TaskPriorityBadgeProps) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[TaskPriority.MEDIUM];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('inline-flex items-center gap-x-1 px-2 py-0.5 text-xs font-medium', config.color, className)}
    >
      {showIcon && <Icon className={cn('size-3', config.iconColor)} />}
      <span>{config.label}</span>
    </Badge>
  );
};
