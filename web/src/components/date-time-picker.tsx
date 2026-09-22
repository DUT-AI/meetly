'use client';

import { PopoverClose } from '@radix-ui/react-popover';
import { format } from 'date-fns';
import { CalendarIcon, OctagonMinus } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  showReset?: boolean;
}

export const DateTimePicker = ({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = 'Select date & time',
  showReset = false,
}: DateTimePickerProps) => {
  // Extract time from value if exists, otherwise default to 12:00
  const [time, setTime] = React.useState<string>(() => {
    if (value) {
      return format(value, 'HH:mm');
    }
    return '12:00';
  });

  // Update internal time state if value changes externally
  React.useEffect(() => {
    if (value) {
      setTime(format(value, 'HH:mm'));
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    // Create a new date with the selected day and the current time string
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    onChange(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);

    if (value) {
      const [hours, minutes] = newTime.split(':').map(Number);
      const newDate = new Date(value);
      newDate.setHours(hours, minutes, 0, 0);
      onChange(newDate);
    }
  };

  const handleReset = () => {
    onChange(null);
    setTime('12:00');
  };

  return (
    <Popover>
      <PopoverTrigger disabled={disabled} asChild>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className={cn('w-full justify-start px-3 text-left font-normal overflow-hidden', !value && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          {value ? <span className="truncate">{format(value, 'PP p')}</span> : <span className="truncate">{placeholder}</span>}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={value} onSelect={handleDateSelect} initialFocus />

        <div className="p-3 border-t border-border flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Time</span>
          <Input type="time" value={time} onChange={handleTimeChange} className="w-auto h-8 text-sm" />
        </div>

        {showReset && value && (
          <PopoverClose asChild>
            <Button onClick={handleReset} variant="secondary" size="sm" className="w-full rounded-t-none">
              <OctagonMinus className="size-4" />
              Reset Filter
            </Button>
          </PopoverClose>
        )}
      </PopoverContent>
    </Popover>
  );
};
