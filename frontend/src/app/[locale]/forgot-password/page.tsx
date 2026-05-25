"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // 无论成功失败，都显示相同提示（防止邮箱枚举）
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white dark:from-dark-bg dark:to-dark-surface p-4">
        <div className="max-w-md w-full bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">请检查你的邮箱</h1>
          <p className="text-gray-500 dark:text-dark-text/50 text-sm mb-6">
            如果该邮箱已注册，你将收到重置密码的邮件。链接1小时内有效。
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-indigo-500 dark:bg-dark-accent text-white rounded-lg hover:bg-indigo-600 dark:hover:bg-dark-accent/80 transition-colors text-sm font-medium"
          >
            返回登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white dark:from-dark-bg dark:to-dark-surface p-4">
      <div className="max-w-md w-full bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔑</div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-dark-text">忘记密码</h1>
          <p className="text-gray-500 dark:text-dark-text/50 text-sm mt-1">
            输入注册邮箱，我们将发送重置链接
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text/70 mb-1">
              邮箱地址
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent text-sm dark:bg-dark-bg dark:text-dark-text"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-500 dark:bg-dark-accent text-white rounded-lg hover:bg-indigo-600 dark:hover:bg-dark-accent/80 transition-colors font-medium text-sm disabled:opacity-50"
          >
            {loading ? "发送中..." : "发送重置链接"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-dark-text/50 mt-4">
          想起密码了？{" "}
          <Link href="/login" className="text-indigo-500 dark:text-dark-accent hover:underline">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  );
}
