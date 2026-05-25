'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiUrl, setToken } from '@/lib/api';

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-b from-warm-light to-warm-bg dark:from-dark-bg dark:to-dark-surface flex items-center justify-center">
        <div className="text-warm-dark/40 dark:text-dark-text/40 text-sm">加载中...</div>
      </main>
    }>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('两次密码不一致');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, invite_code: inviteCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || '注册失败');
        return;
      }
      setToken(data.access_token);
      if (data.user_id) {
        localStorage.setItem('user_id', String(data.user_id));
      }
      router.replace('/onboarding/welcome');
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-warm-light to-warm-bg dark:from-dark-bg dark:to-dark-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-warm-dark dark:text-dark-text">拼拼看Me</Link>
          <p className="text-warm-dark/60 dark:text-dark-text/60 mt-2 text-sm">创建一个新账户</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/70 dark:bg-dark-surface/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-warm-dark/10 dark:border-dark-border space-y-4">
          {inviteCode && (
            <div className="p-3 rounded-xl bg-warm-accent/5 dark:bg-dark-accent/5 border border-warm-accent/10 dark:border-dark-accent/10 text-center">
              <p className="text-sm text-warm-accent dark:text-dark-accent">🎉 受邀注册，双方各得5次免费融合！</p>
            </div>
          )}
          <div>
            <label className="block text-sm text-warm-dark/70 dark:text-dark-text/70 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-3 py-2 rounded-lg border border-warm-dark/20 dark:border-dark-border bg-white/80 dark:bg-dark-bg/80 text-warm-dark dark:text-dark-text placeholder-warm-dark/30 dark:placeholder-dark-text/30 focus:outline-none focus:ring-2 focus:ring-warm-accent/40 dark:focus:ring-dark-accent/40 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-warm-dark/70 dark:text-dark-text/70 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="至少6位密码"
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-lg border border-warm-dark/20 dark:border-dark-border bg-white/80 dark:bg-dark-bg/80 text-warm-dark dark:text-dark-text placeholder-warm-dark/30 dark:placeholder-dark-text/30 focus:outline-none focus:ring-2 focus:ring-warm-accent/40 dark:focus:ring-dark-accent/40 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-warm-dark/70 dark:text-dark-text/70 mb-1">确认密码</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="再次输入密码"
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-lg border border-warm-dark/20 dark:border-dark-border bg-white/80 dark:bg-dark-bg/80 text-warm-dark dark:text-dark-text placeholder-warm-dark/30 dark:placeholder-dark-text/30 focus:outline-none focus:ring-2 focus:ring-warm-accent/40 dark:focus:ring-dark-accent/40 text-sm"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-warm-accent text-white font-medium text-sm hover:bg-warm-accent/90 disabled:opacity-50 transition-colors"
          >
            {loading ? '注册中...' : '注册'}
          </button>

          <p className="text-center text-sm text-warm-dark/50 dark:text-dark-text/50">
            已有账户？<Link href="/login" className="text-warm-accent dark:text-dark-accent hover:underline">登录</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
