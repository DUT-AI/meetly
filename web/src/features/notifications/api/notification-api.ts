import { api } from '@/lib/api';

import { type NotificationItem, type NotificationListResponse, normalizeNotification } from '../types';

export const notificationApi = {
  async listNotifications(unreadOnly = false): Promise<NotificationListResponse> {
    const res = await api.get<{
      data: {
        items: any[];
        unread_count: number;
      };
    }>('/notifications', {
      params: {
        unread_only: unreadOnly,
        limit: 50,
      },
    });

    const data = res.data?.data || { items: [], unread_count: 0 };
    return {
      items: (data.items || []).map(normalizeNotification),
      unreadCount: data.unread_count || 0,
    };
  },

  async markAsRead(notificationId: string): Promise<NotificationItem> {
    const res = await api.patch<{ data: any }>(`/notifications/${notificationId}/read`);
    return normalizeNotification(res.data.data);
  },

  async markAllAsRead(): Promise<{ markedCount: number }> {
    const res = await api.patch<{ data: { marked_count: number } }>('/notifications/read-all');
    return { markedCount: res.data.data?.marked_count || 0 };
  },
};
