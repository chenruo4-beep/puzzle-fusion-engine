"use client";

import { useEffect } from "react";

/**
 * Next.js 全局错误页面 — 捕获根布局中的错误
 * 必须是 client component
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 动态上报错误到 Sentry（如果已安装并初始化）
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Sentry = (window as any).__sentry_module;
      if (Sentry?.captureException) {
        Sentry.captureException(error);
      }
    } catch {
      // Sentry 不可用，静默处理
    }
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 p-8">
          <div className="text-6xl mb-6">💥</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            应用出了点问题
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md text-center">
            我们已经记录了这个错误，正在修复中。请尝试刷新页面。
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
          >
            重新加载
          </button>
        </div>
      </body>
    </html>
  );
}
