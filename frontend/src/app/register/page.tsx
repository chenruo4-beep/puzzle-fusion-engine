'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiUrl, setToken } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
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
        body: JSON.stringify({ email, password }),
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
    <main className="min-h-screen bg-gradient-to-b from-warm-light to-warm-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-warm-dark">拼拼看Me</Link>
          <p className="text-warm-dark/60 mt-2 text-sm">创建一个新账户</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-warm-dark/10 space-y-4">
          <div>
            <label className="block text-sm text-warm-dark/70 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-3 py-2 rounded-lg border border-warm-dark/20 bg-white/80 text-warm-dark placeholder-warm-dark/30 focus:outline-none focus:ring-2 focus:ring-warm-accent/40 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-warm-dark/70 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="至少6位密码"
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-lg border border-warm-dark/20 bg-white/80 text-warm-dark placeholder-warm-dark/30 focus:outline-none focus:ring-2 focus:ring-warm-accent/40 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-warm-dark/70 mb-1">确认密码</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="再次输入密码"
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-lg border border-warm-dark/20 bg-white/80 text-warm-dark placeholder-warm-dark/30 focus:outline-none focus:ring-2 focus:ring-warm-accent/40 text-sm"
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

          <p className="text-center text-sm text-warm-dark/50">
            已有账户？<Link href="/login" className="text-warm-accent hover:underline">登录</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
