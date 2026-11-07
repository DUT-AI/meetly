import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { playNotificationSound } from '@/components/pwa-provider';
import { notificationApi } from './notification-api';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

// Lưu trữ ID thông báo mới nhất đã thông báo để không bị lặp lại qua các lần điều hướng trang
let globalLastNotifiedId: string | null = null;
let isFirstLoadGlobally = true;

export function useGetNotifications(unreadOnly = false) {
  const isInitializedRef = useRef(false);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, { unreadOnly }],
    queryFn: () => notificationApi.listNotifications(unreadOnly),
    refetchInterval: 12000, // Poll every 12 seconds for real-time responsiveness
  });

  // Listen for instant push notifications dispatched by Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MEETLY_PUSH_RECEIVED') {
        queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, [queryClient]);

  useEffect(() => {
    // Nếu dữ liệu chưa tải xong thì không xử lý
    if (!query.data) return;

    const latestItems = query.data.items ?? [];
    const newest = latestItems[0];

    // Lần tải đầu tiên: chỉ ghi nhận mốc hiện tại, KHÔNG phát chuông và KHÔNG toast các thông báo cũ trong quá khứ
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      if (isFirstLoadGlobally) {
        isFirstLoadGlobally = false;
        if (newest) {
          globalLastNotifiedId = newest.id;
        }
        return;
      }
    }

    // Chỉ kích hoạt toast & âm thanh khi có thông báo THỰC SỰ MỚI phát sinh trong phiên làm việc
    if (newest && newest.id !== globalLastNotifiedId && !newest.isRead) {
      // Kiểm tra thời gian: chỉ thông báo nếu được tạo trong vòng 2 phút gần nhất
      const createdAtMs = new Date(newest.createdAt).getTime();
      const isRecent = !isNaN(createdAtMs) && Date.now() - createdAtMs < 120_000;

      if (isRecent) {
        // 1. Kích hoạt âm thanh thông báo chime (Sound Alert)
        playNotificationSound();

        // 2. Hiển thị thông báo nổi Toast
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

      globalLastNotifiedId = newest.id;
    }
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
