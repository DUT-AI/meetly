'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribeToPush = async () => {
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
        toast.warning('Bạn đã từ chối quyền thông báo trên trình duyệt.');
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
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

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

      if (!p256dh || !auth) {
        throw new Error('Không trích xuất được khóa p256dh hoặc auth từ thiết bị.');
      }

      // 4. Gửi subscription lên Backend để lưu vào database
      await api.post('/notifications/push-subscriptions', {
        endpoint: sub.endpoint,
        keys: { p256dh, auth },
        user_agent: navigator.userAgent.substring(0, 250),
      });

      setIsSubscribed(true);
      toast.success('Đã kích hoạt thông báo đẩy Web Push trên điện thoại & trình duyệt thành công!');
      return true;
    } catch (err: any) {
      console.error('[WebPush] Lỗi đăng ký push:', err);
      toast.error('Lỗi đăng ký thông báo đẩy: ' + (err.message || 'Thử lại sau.'));
      return false;
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
    unsubscribeFromPush,
  };
}

