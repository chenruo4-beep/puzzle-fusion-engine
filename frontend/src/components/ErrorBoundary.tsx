"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界 — 捕获子组件树中的未处理异常，展示友好提示
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 动态上报错误到 Sentry（如果已安装并初始化）
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Sentry = (window as any).__sentry_module;
      if (Sentry?.captureException) {
        Sentry.captureException(error, { contexts: { react: errorInfo } });
      }
    } catch {
      // Sentry 不可用，静默处理
    }
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-8 text-center">
          <div className="text-4xl mb-4">😵</div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            出了点问题
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
            这个页面遇到了意外错误，我们已经记录了这个问题。
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
            }}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
