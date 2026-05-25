// Service Worker for Puzzle Fusion Engine
// 拼拼看Me - 离线缓存支持

const CACHE_NAME = 'puzzle-fusion-v1';
const STATIC_CACHE = 'puzzle-static-v1';
const DYNAMIC_CACHE = 'puzzle-dynamic-v1';

// 预缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/offline.html'
];

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] 预缓存静态资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] 安装完成');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] 安装失败:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] 激活完成');
        return self.clients.claim();
      })
  );
});

// 拦截请求 - 缓存优先策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过第三方请求
  if (!url.origin.includes(self.location.origin) && !url.origin.includes('localhost')) {
    return;
  }

  // 静态资源 - Cache First
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.url.includes('/_next/static/')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API 请求 - Network First
  if (request.url.includes('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // HTML 页面 - Stale While Revalidate
  if (request.destination === 'document') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 默认 - Network First
  event.respondWith(networkFirst(request));
});

// Cache First 策略
async function cacheFirst(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] 从缓存返回:', request.url);
      // 后台更新缓存
      fetchAndCache(request, cache);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache First 失败:', error);
    return await caches.match('/offline.html') || new Response('离线状态，请检查网络');
  }
}

// Network First 策略
async function networkFirst(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] 网络失败，尝试缓存:', request.url);
    const cachedResponse = await caches.match(request);
    return cachedResponse || await caches.match('/offline.html') || new Response('离线状态');
  }
}

// Stale While Revalidate 策略
async function staleWhileRevalidate(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    const fetchPromise = fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch(() => cachedResponse);

    return cachedResponse || await fetchPromise;
  } catch (error) {
    console.error('[SW] Stale While Revalidate 失败:', error);
    return await caches.match('/offline.html') || new Response('离线状态');
  }
}

// 后台更新缓存
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      console.log('[SW] 后台更新缓存:', request.url);
    }
  } catch (error) {
    console.log('[SW] 后台更新失败:', request.url);
  }
}

// 监听消息 - 用于手动跳过等待
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] 收到 SKIP_WAITING 消息');
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker 已加载');
