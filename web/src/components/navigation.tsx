'use client';

import { Settings, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GoCheckCircle, GoCheckCircleFill, GoHome, GoHomeFill } from 'react-icons/go';

import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { cn } from '@/lib/utils';

export const Navigation = () => {
  const pathname = usePathname();
  const workspaceId = useWorkspaceId();

  const routes = [
    {
      label: 'Tất cả việc của tôi',
      href: '/tasks',
      isGlobal: true,
      icon: GoCheckCircle,
      activeIcon: GoCheckCircleFill,
    },
    {
      label: 'Tổng quan phòng ban',
      href: `/workspaces/${workspaceId}`,
      isGlobal: false,
      icon: GoHome,
      activeIcon: GoHomeFill,
    },
    {
      label: 'Việc phòng ban',
      href: `/workspaces/${workspaceId}/tasks`,
      isGlobal: false,
      icon: GoCheckCircle,
      activeIcon: GoCheckCircleFill,
    },
    {
      label: 'Nhân sự phòng ban',
      href: `/workspaces/${workspaceId}/members`,
      isGlobal: false,
      icon: UsersIcon,
      activeIcon: UsersIcon,
    },
    {
      label: 'Cài đặt phòng ban',
      href: `/workspaces/${workspaceId}/settings`,
      isGlobal: false,
      icon: Settings,
      activeIcon: Settings,
    },
  ];

  return (
    <ul className="flex flex-col">
      {routes.map((route) => {
        // If workspaceId is not yet available and route is workspace-specific, skip or render disabled
        if (!route.isGlobal && !workspaceId) return null;

        const isActive = pathname === route.href;
        const Icon = isActive ? route.activeIcon : route.icon;

        return (
          <li key={route.href}>
            <Link
              href={route.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md p-2.5 font-medium text-neutral-500 transition hover:text-primary',
                isActive && 'bg-white text-primary shadow-sm hover:opacity-100',
              )}
            >
              <Icon className="size-5 text-neutral-500" />
              {route.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};
