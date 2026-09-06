'use client';

import { Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GoCheckCircle, GoCheckCircleFill, GoHome, GoHomeFill } from 'react-icons/go';

import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { cn } from '@/lib/utils';

export const GlobalNavigation = () => {
  const pathname = usePathname();
  const isActive = pathname === '/tasks';

  return (
    <ul className="flex flex-col">
      <li>
        <Link
          href="/tasks"
          className={cn(
            'flex items-center gap-2.5 rounded-md p-2.5 font-medium text-neutral-500 transition hover:text-primary',
            isActive && 'bg-white text-primary shadow-sm hover:opacity-100',
          )}
        >
          {isActive ? (
            <GoCheckCircleFill className="size-5 text-primary" />
          ) : (
            <GoCheckCircle className="size-5 text-neutral-500" />
          )}
          Tất cả việc của tôi
        </Link>
      </li>
    </ul>
  );
};

export const Navigation = () => {
  const pathname = usePathname();
  const workspaceId = useWorkspaceId();

  if (!workspaceId) return null;

  const routes = [
    {
      label: 'Tổng quan phòng ban',
      href: `/workspaces/${workspaceId}`,
      icon: GoHome,
      activeIcon: GoHomeFill,
    },
    {
      label: 'Việc phòng ban',
      href: `/workspaces/${workspaceId}/tasks`,
      icon: GoCheckCircle,
      activeIcon: GoCheckCircleFill,
    },
    {
      label: 'Cài đặt phòng ban',
      href: `/workspaces/${workspaceId}/settings`,
      icon: Settings,
      activeIcon: Settings,
    },
  ];

  return (
    <ul className="flex flex-col">
      {routes.map((route) => {
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
