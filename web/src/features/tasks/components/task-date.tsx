import { differenceInDays, format } from 'date-fns';

import { cn } from '@/lib/utils';

interface TaskDateProps {
  value: string;
  className?: string;
}

export const TaskDate = ({ value, className }: TaskDateProps) => {
  if (!value) {
    return <span className={cn('text-xs text-muted-foreground italic', className)}>Chưa đặt hạn</span>;
  }

  const endDate = new Date(value);
  if (isNaN(endDate.getTime()) || endDate.getFullYear() <= 1970) {
    return <span className={cn('text-xs text-muted-foreground italic', className)}>Chưa đặt hạn</span>;
  }

  const today = new Date();
  const diffInDays = differenceInDays(endDate, today);

  let textColor = 'text-muted-foreground';

  if (diffInDays <= 3) {
    textColor = 'text-red-500';
  } else if (diffInDays <= 7) {
    textColor = 'text-orange-500';
  } else if (diffInDays <= 14) {
    textColor = 'text-yellow-500';
  }

  return (
    <div className={textColor}>
      <span className={cn('truncate', className)}>{format(endDate, 'PP p')}</span>
    </div>
  );
};
