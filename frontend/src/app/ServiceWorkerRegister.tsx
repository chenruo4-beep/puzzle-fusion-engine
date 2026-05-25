'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // 动态导入注册函数，避免 SSR 问题
    const registerSW = async () => {
      try {
        const { registerServiceWorker } = await import('./sw-register');
        registerServiceWorker();
      } catch (error) {
        console.error('[SW] 加载注册脚本失败:', error);
      }
    };

    // 确保在浏览器环境中
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // 等待页面加载完成
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return null;
}
