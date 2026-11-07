// Meetly PWA & Web Push Service Worker
const CACHE_NAME = 'meetly-cache-v4';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/sounds/notification.wav',
  '/sounds/notification.mp3'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Meetly SW] Non-fatal: Static asset pre-cache skipped', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Lắng nghe sự kiện Push từ Web Push Server
self.addEventListener('push', (event) => {
  let data = {
    title: 'Meetly Notification',
    body: 'Bạn có một thông báo mới từ Meetly.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: {
      url: 'https://meetly.dutai.io.vn',
    },
  };

  if (event.data) {
    try {
      const json = event.data.json();
      data = { ...data, ...json };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body || data.content,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: data.data || { url: data.action_url || 'https://meetly.dutai.io.vn' },
    tag: data.tag || 'meetly-push-' + Date.now(),
    renotify: true,
  };

  // Only include actions on browsers that support them (iOS WebKit throws on actions)
  if (typeof Notification !== 'undefined' && 'actions' in Notification.prototype) {
    notificationOptions.actions = [
      { action: 'open', title: '👉 Xem chi tiết' },
      { action: 'close', title: 'Đóng' },
    ];
  }

  const notifyClients = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'MEETLY_PUSH_RECEIVED', payload: data });
      });
    })
    .catch((err) => console.warn('[Meetly SW] Failed to notify clients', err));

  const showPromise = self.registration
    .showNotification(data.title, notificationOptions)
    .catch((err) => {
      console.warn('[Meetly SW] showNotification error, falling back:', err);
      return self.registration.showNotification(data.title, {
        body: data.body || data.content,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
      });
    });

  event.waitUntil(
    Promise.all([
      showPromise,
      notifyClients,
    ])
  );
});

// Xử lý khi người dùng click vào thông báo trên điện thoại/máy tính
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : 'https://meetly.dutai.io.vn';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('meetly') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

