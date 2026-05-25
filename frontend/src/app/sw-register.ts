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

// ── Push 订阅逻辑 ───────────────────────────────────────────────────────────────

const VAPID_SERVER_KEY_URL = '/api/push/vapid-public-key';
const SUBSCRIBE_URL = '/api/push/subscribe';
const UNSUBSCRIBE_URL = '/api/push/subscribe';

/**
 * 请求推送通知权限并订阅
 * @returns true 订阅成功, false 用户拒绝或不支持
 */
export async function requestPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] 浏览器不支持推送');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // 请求权限
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] 用户拒绝通知权限');
      return false;
    }

    // 获取 VAPID 公钥
    const keyRes = await fetch(VAPID_SERVER_KEY_URL);
    if (!keyRes.ok) throw new Error('获取 VAPID 公钥失败');
    const { public_key } = await keyRes.json();

    // 检查是否已订阅
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // 创建新订阅
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key).buffer as BufferSource,
      });
    }

    // 发送到后端保存
    const subJson = subscription.toJSON();
    const saveRes = await fetch(SUBSCRIBE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subJson }),
    });

    if (!saveRes.ok) throw new Error('保存订阅失败');

    console.log('[Push] 订阅成功');
    return true;
  } catch (err) {
    console.error('[Push] 订阅失败:', err);
    return false;
  }
}

/**
 * 取消推送订阅
 */
export async function cancelPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // 通知后端删除
      await fetch(UNSUBSCRIBE_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });

      console.log('[Push] 取消订阅成功');
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Push] 取消订阅失败:', err);
    return false;
  }
}

/**
 * 发送测试推送
 */
export async function sendTestPush(): Promise<boolean> {
  try {
    const res = await fetch('/api/push/test', { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || '发送失败');
    }
    console.log('[Push] 测试推送已发送');
    return true;
  } catch (err) {
    console.error('[Push] 测试推送失败:', err);
    return false;
  }
}

/**
 * 检查推送订阅状态
 */
export async function checkPushSubscription(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }

  const permission = Notification.permission;
  if (permission === 'denied') return 'denied';
  if (permission === 'granted') return 'granted';
  return 'default';
}

/**
 * Base64 URL 转换为 Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
