'use client';

import { usePathname } from 'next/navigation';

import { UserButton } from '@/features/auth/components/user-button';
import { NotificationPopover } from '@/features/notifications/components/notification-popover';

import { MobileSidebar } from './mobile-sidebar';
import { SourceCode } from './source-code';

const pathnameMap = {
  tasks: {
    title: 'Công việc của tôi',
    description: 'Xem tất cả các công việc của bạn tại đây.',
  },
  projects: {
    title: 'Dự án',
    description: 'Xem và quản lý các dự án trong phòng ban.',
  },
  settings: {
    title: 'Cài đặt phòng ban',
    description: 'Quản lý thông tin, nhân sự và cấu hình phòng ban.',
  },
};

const defaultMap = {
  title: 'Trang chủ',
  description: 'Theo dõi tổng quan các dự án và công việc tại đây.',
};

export const Navbar = () => {
  const pathname = usePathname();
  const pathnameParts = pathname.split('/');
  const pathnameKey = (pathnameParts[3] || pathnameParts[1]) as keyof typeof pathnameMap;

  const { title, description } = pathnameMap[pathnameKey] || defaultMap;

  return (
    <nav className="flex items-center justify-between px-6 pt-4 print:hidden no-print">
      <div className="hidden flex-col lg:flex">
        <h1 className="text-2xl font-semibold">{title}</h1>

        <p className="text-muted-foreground">{description}</p>
      </div>

      <MobileSidebar />

      <div className="flex items-center gap-x-3">
        <NotificationPopover />

        <UserButton />
      </div>
    </nav>
  );
};
