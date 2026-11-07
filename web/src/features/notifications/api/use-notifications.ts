import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { playNotificationSound } from '@/components/pwa-provider';
import { notificationApi } from './notification-api';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export function useGetNotifications(unreadOnly = false) {
  const prevCountRef = useRef<number | null>(null);

  const query = useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, { unreadOnly }],
    queryFn: () => notificationApi.listNotifications(unreadOnly),
    refetchInterval: 12000, // Poll every 12 seconds for real-time responsiveness
  });

  useEffect(() => {
    const currentUnread = query.data?.unreadCount ?? 0;
    const latestItems = query.data?.items ?? [];

    if (prevCountRef.current !== null && currentUnread > prevCountRef.current) {
      // 1. Kích hoạt âm thanh thông báo chime (Sound Alert)
      playNotificationSound();

      // 2. Hiển thị thông báo nổi Toast
      const newest = latestItems[0];
      if (newest) {
        toast.info(newest.title, {
          description: newest.content,
          action: newest.actionUrl
            ? {
                label: 'Xem ngay',
                onClick: () => {
                  window.location.href = newest.actionUrl!;
                },
              }
            : undefined,
          duration: 5000,
        });
      }
    }

    prevCountRef.current = currentUnread;
  }, [query.data]);

  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
