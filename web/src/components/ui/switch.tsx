'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
  return (
    <label
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        checked ? 'bg-blue-600' : 'bg-neutral-200 dark:bg-neutral-700',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        ref={ref}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
      <span
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-white shadow-md ring-0 transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]',
        )}
      />
    </label>
  );
});
Switch.displayName = 'Switch';

export { Switch };
