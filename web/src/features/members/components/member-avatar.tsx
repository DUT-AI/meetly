import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MemberAvatarProps {
  name: string;
  image?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export const MemberAvatar = ({ name, image, className, fallbackClassName }: MemberAvatarProps) => {
  return (
    <Avatar className={cn('size-8 shrink-0 rounded-full border border-slate-200 overflow-hidden relative transition', className)}>
      {image ? <AvatarImage src={image} alt={name} className="aspect-square h-full w-full object-cover rounded-full shrink-0" /> : null}
      <AvatarFallback className={cn('flex items-center justify-center bg-slate-100 font-medium text-slate-600 select-none rounded-full w-full h-full', fallbackClassName)}>
        {name ? name.charAt(0).toUpperCase() : '?'}
      </AvatarFallback>
    </Avatar>
  );
};
