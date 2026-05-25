"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ConfirmResetPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("密码至少8个字符");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    if (!token) {
      setError("重置链接无效，请重新申请");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/confirm-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "重置失败");
        return;
      }
      setSuccess(true);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white dark:from-dark-bg dark:to-dark-surface p-4">
        <div className="max-w-md w-full bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">密码重置成功</h1>
          <p className="text-gray-500 dark:text-dark-text/50 text-sm mb-6">
            请使用新密码登录
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-indigo-500 dark:bg-dark-accent text-white rounded-lg hover:bg-indigo-600 dark:hover:bg-dark-accent/80 transition-colors text-sm font-medium"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white dark:from-dark-bg dark:to-dark-surface p-4">
        <div className="max-w-md w-full bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-dark-text mb-3">链接无效</h1>
          <p className="text-gray-500 dark:text-dark-text/50 text-sm mb-6">
            这个重置链接无效或已过期
          </p>
          <Link
            href="/forgot-password"
            className="inline-block px-6 py-2 bg-indigo-500 dark:bg-dark-accent text-white rounded-lg hover:bg-indigo-600 dark:hover:bg-dark-accent/80 transition-colors text-sm font-medium"
          >
            重新申请
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white dark:from-dark-bg dark:to-dark-surface p-4">
      <div className="max-w-md w-full bg-white dark:bg-dark-surface rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-dark-text">设置新密码</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text/70 mb-1">
              新密码
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="至少8个字符"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent text-sm dark:bg-dark-bg dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text/70 mb-1">
              确认新密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="再次输入新密码"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-transparent text-sm dark:bg-dark-bg dark:text-dark-text"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-500 dark:bg-dark-accent text-white rounded-lg hover:bg-indigo-600 dark:hover:bg-dark-accent/80 transition-colors font-medium text-sm disabled:opacity-50"
          >
            {loading ? "重置中..." : "确认重置"}
          </button>
        </form>
      </div>
    </div>
  );
}
