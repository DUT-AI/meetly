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
    <Avatar className={cn('size-5 rounded-full border border-neutral-300 transition', className)}>
      {image ? <AvatarImage src={image} alt={name} className="object-cover" /> : null}
      <AvatarFallback className={cn('flex items-center justify-center bg-neutral-200 font-medium text-neutral-500', fallbackClassName)}>
        {name ? name.charAt(0).toUpperCase() : '?'}
      </AvatarFallback>
    </Avatar>
  );
};
