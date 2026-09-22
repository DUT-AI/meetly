'use client';

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowRightCircle,
  AtSign,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { useGetNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '../api/use-notifications';
import type { NotificationItem } from '../types';

export const NotificationPopover = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useGetNotifications(activeTab === 'unread');
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead();

  const unreadCount = data?.unreadCount || 0;
  const items = data?.items || [];

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markRead(item.id);
    }
    setOpen(false);
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_comment_mention':
        return <AtSign className="size-3.5 text-blue-500" />;
      case 'task_new_comment':
        return <MessageSquare className="size-3.5 text-indigo-500" />;
      case 'task_assigned':
        return <CheckCircle2 className="size-3.5 text-emerald-500" />;
      case 'task_unassigned':
        return <UserMinus className="size-3.5 text-rose-500" />;
      case 'task_status_changed':
        return <ArrowRightCircle className="size-3.5 text-violet-500" />;
      case 'task_due_soon':
        return <Clock className="size-3.5 text-amber-500" />;
      case 'task_overdue':
        return <AlertTriangle className="size-3.5 text-red-600" />;
      case 'member_joined_workspace':
      case 'member_added_project':
        return <UserPlus className="size-3.5 text-teal-500" />;
      default:
        return <Bell className="size-3.5 text-neutral-500" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative size-10 rounded-full border-neutral-300 bg-neutral-100 hover:bg-neutral-200 transition"
        >
          <Bell className="size-5 text-neutral-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 sm:w-96 p-0 shadow-lg rounded-xl border border-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-neutral-50/50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-neutral-800">Thông báo</h4>
            {unreadCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{unreadCount} mới</span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead()}
              disabled={isMarkingAll}
              className="h-7 text-xs text-neutral-500 hover:text-neutral-800 px-2 gap-1"
            >
              <CheckCheck className="size-3.5" />
              Đã đọc tất cả
            </Button>
          )}
        </div>

        {/* Tabs Filter */}
        <div className="flex border-b px-4 gap-4 text-xs font-medium text-neutral-500">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`py-2 border-b-2 transition ${
              activeTab === 'all' ? 'border-neutral-900 text-neutral-900 font-semibold' : 'border-transparent hover:text-neutral-700'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`py-2 border-b-2 transition ${
              activeTab === 'unread' ? 'border-neutral-900 text-neutral-900 font-semibold' : 'border-transparent hover:text-neutral-700'
            }`}
          >
            Chưa đọc ({unreadCount})
          </button>
        </div>

        {/* List Content */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-neutral-100">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Bell className="size-8 stroke-1 text-neutral-400 mb-2" />
              <p className="text-sm font-medium text-neutral-700">Không có thông báo nào</p>
              <p className="text-xs text-neutral-400">
                {activeTab === 'unread' ? 'Bạn đã đọc tất cả thông báo.' : 'Bạn chưa có thông báo nào trong thời gian này.'}
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`flex gap-3 p-3.5 text-xs transition cursor-pointer hover:bg-neutral-50/80 ${
                  !item.isRead ? 'bg-blue-50/40' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="size-8">
                    <AvatarImage src={item.actorAvatarUrl || undefined} />
                    <AvatarFallback className="text-[10px] bg-neutral-200 font-semibold">
                      {item.actorName?.slice(0, 2).toUpperCase() || 'M'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow-sm">
                    {getNotificationIcon(item.type)}
                  </span>
                </div>

                <div className="flex-1 space-y-1 overflow-hidden">
                  <div className="flex items-start justify-between gap-1">
                    <p className={`text-neutral-900 truncate ${!item.isRead ? 'font-semibold' : 'font-normal'}`}>{item.title}</p>
                    {!item.isRead && <span className="size-1.5 rounded-full bg-blue-600 shrink-0 mt-1" />}
                  </div>

                  <p className="text-neutral-500 line-clamp-2 text-[11px] leading-relaxed">{item.content}</p>

                  <p className="text-[10px] text-neutral-400">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
