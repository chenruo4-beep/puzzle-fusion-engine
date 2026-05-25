// Service Worker 注册脚本
// 拼拼看Me - 离线支持

export function registerServiceWorker() {
  if (typeof window === 'undefined') {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('[SW] 浏览器不支持 Service Worker');
    return;
  }

  const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.\d+){0,2}\.\d+$/)
  );

  window.addEventListener('load', () => {
    const swUrl = `${window.location.origin}/sw.js`;

    if (isLocalhost) {
      // 本地开发环境 - 检查 Service Worker 是否可用
      checkValidServiceWorker(swUrl);
    } else {
      // 生产环境 - 直接注册
      register(swUrl);
    }

    // 监听 Service Worker 消息
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW] 收到消息:', event.data);
    });
  });
}

function register(swUrl: string) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[SW] 注册成功:', registration);

      // 检测新 Service Worker 安装
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // 新内容可用
              console.log('[SW] 新内容可用，请刷新页面');
              // 可以在这里显示更新提示
              showUpdateNotification();
            } else {
              // 首次安装
              console.log('[SW] 首次安装完成，已支持离线');
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[SW] 注册失败:', error);
    });
}

function checkValidServiceWorker(swUrl: string) {
  // 检查 Service Worker 是否可以访问
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // 没有找到 Service Worker - 可能是不同的 origin
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // 找到 Service Worker
        register(swUrl);
      }
    })
    .catch(() => {
      console.log('[SW] 离线状态，无法检查 Service Worker');
    });
}

function showUpdateNotification() {
  // 简单的更新提示
  if (confirm('发现新版本，是否立即刷新？')) {
    window.location.reload();
  }
}

// 取消注册 Service Worker (用于开发调试)
export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// 请求 Service Worker 跳过等待 (立即激活新版本)
export function skipWaiting() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SKIP_WAITING',
    });
  }
}
