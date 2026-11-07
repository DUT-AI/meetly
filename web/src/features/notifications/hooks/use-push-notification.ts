'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotification() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Silent sync to ensure server database has active subscription for logged-in user
  const syncSubscriptionSilently = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (Notification.permission !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      const res = await api.get<{ data: { public_key: string } }>('/notifications/vapid-public-key');
      const publicKey = res.data?.data?.public_key;
      if (!publicKey) return;

      if (!sub) {
        const convertedVapidKey = urlBase64ToUint8Array(publicKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      const rawSub = sub.toJSON();
      const p256dh = rawSub.keys?.p256dh;
      const auth = rawSub.keys?.auth;

      if (p256dh && auth) {
        await api.post('/notifications/push-subscriptions', {
          endpoint: sub.endpoint,
          keys: { p256dh, auth },
          user_agent: navigator.userAgent.substring(0, 250),
        });
        setIsSubscribed(true);
      }
    } catch (err) {
      // Silent failure if unauthenticated or network issue
      console.debug('[WebPush] Silent sync skipped/failed:', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      const currentPerm = Notification.permission;
      setPermission(currentPerm);

      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
          if (currentPerm === 'granted') {
            syncSubscriptionSilently();
          }
        });
      });
    }
  }, [syncSubscriptionSilently]);

  const subscribeToPush = async (promptTest: boolean = true) => {
    if (!isSupported) {
      toast.error('Trình duyệt hoặc thiết bị của bạn không hỗ trợ Web Push Notification.');
      return false;
    }

    setIsLoading(true);
    try {
      // 1. Yêu cầu quyền thông báo từ người dùng
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast.warning('Bạn chưa cấp quyền thông báo trên trình duyệt/điện thoại.');
        setIsLoading(false);
        return false;
      }

      // 2. Lấy VAPID public key từ Backend
      const res = await api.get<{ data: { public_key: string } }>('/notifications/vapid-public-key');
      const publicKey = res.data?.data?.public_key;
      if (!publicKey) {
        throw new Error('Không nhận được VAPID Public Key từ máy chủ.');
      }

      // 3. Đăng ký subscription qua PushManager của Service Worker
      // Unsubscribe existing stale sub first to guarantee using active VAPID key
      const reg = await navigator.serviceWorker.ready;
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        try {
          await existingSub.unsubscribe();
        } catch (e) {
          console.warn('[WebPush] Unsubscribe previous sub error:', e);
        }
      }

      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      const rawSub = sub.toJSON();
      const p256dh = rawSub.keys?.p256dh;
      const auth = rawSub.keys?.auth;

      if (!p256dh || !auth) {
        throw new Error('Không trích xuất được khóa mã hóa từ thiết bị.');
      }

      // 4. Gửi subscription lên Backend để lưu vào database
      await api.post('/notifications/push-subscriptions', {
        endpoint: sub.endpoint,
        keys: { p256dh, auth },
        user_agent: navigator.userAgent.substring(0, 250),
      });

      setIsSubscribed(true);
      toast.success('Đã kích hoạt thông báo đẩy Web Push trên điện thoại thành công!');

      // Send initial test push to verify sound & vibration immediately
      if (promptTest) {
        try {
          await api.post('/notifications/test-push', null, {
            params: {
              title: 'Meetly kết nối thành công!',
              message: 'Bạn sẽ nhận thông báo đẩy tức thì trên điện thoại khi có việc mới hoặc cập nhật!',
            },
          });
        } catch (e) {
          console.warn('[WebPush] Test push dispatch warning:', e);
        }
      }

      return true;
    } catch (err: any) {
      console.error('[WebPush] Lỗi đăng ký push:', err);
      toast.error('Lỗi đăng ký thông báo đẩy: ' + (err.message || 'Thử lại sau.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestPush = async () => {
    setIsLoading(true);
    try {
      const res = await api.post('/notifications/test-push', null, {
        params: {
          title: 'Meetly Thử Nghiệm Chuông & Thông Báo',
          message: 'Thông báo đẩy hoạt động tốt trên điện thoại kể cả khi bạn không mở app!',
        },
      });
      if (res.data?.success) {
        toast.success(`Đã gửi thông báo đẩy tới ${res.data.delivered_devices || 1} thiết bị!`);
      } else {
        toast.info(res.data?.message || 'Không có thiết bị nhận nào.');
      }
    } catch (err: any) {
      toast.error('Lỗi gửi push thử nghiệm: ' + (err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.delete('/notifications/push-subscriptions', {
          params: { endpoint: sub.endpoint },
        });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      toast.info('Đã hủy đăng ký nhận thông báo đẩy trên thiết bị này.');
      return true;
    } catch (err: any) {
      console.error('[WebPush] Lỗi hủy đăng ký push:', err);
      toast.error('Không thể hủy đăng ký: ' + (err.message || ''));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribeToPush,
    sendTestPush,
    unsubscribeFromPush,
    syncSubscriptionSilently,
  };
}
