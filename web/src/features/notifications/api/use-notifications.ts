import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from './notification-api';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export function useGetNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, { unreadOnly }],
    queryFn: () => notificationApi.listNotifications(unreadOnly),
    refetchInterval: 15000, // Poll every 15 seconds for real-time feel
  });
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
