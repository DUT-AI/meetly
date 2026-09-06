import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import type { PropsWithChildren } from 'react';
import { useMedia } from 'react-use';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';

import { cn } from '@/lib/utils';

interface ResponsiveModalProps {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export const ResponsiveModal = ({
  children,
  title,
  description,
  open,
  onOpenChange,
  className,
}: PropsWithChildren<ResponsiveModalProps>) => {
  const isDesktop = useMedia('(min-width: 1024px)', true);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn('hide-scrollbar max-h-[90vh] w-full overflow-y-auto border-none p-0 sm:max-w-lg', className)}>
          <VisuallyHidden.Root>
            <DialogTitle>{title}</DialogTitle>

            <DialogDescription>{description}</DialogDescription>
          </VisuallyHidden.Root>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <VisuallyHidden.Root>
          <DrawerTitle>{title}</DrawerTitle>

          <DrawerDescription>{description}</DrawerDescription>
        </VisuallyHidden.Root>
        <div className={cn('hide-scrollbar max-h-[90vh] overflow-y-auto', className)}>{children}</div>
      </DrawerContent>
    </Drawer>
  );
};
