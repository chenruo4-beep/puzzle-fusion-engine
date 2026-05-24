'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';


interface SmartLogResult {
  category: 'fragment' | 'journal';
  id: number;
  fragment_type?: string;
  content: string;
  quality_score?: number;
  reason: string;
  message: string;
}

const PLACEHOLDERS = [
  '比如：很会安慰人 / 能记住很久以前的事 / 看到配色不对就浑身难受……',
  '比如：朋友遇到事总找我聊 / 每次出门都是我规划路线 / 大家说我做饭有天赋……',
  '比如：明明很累但就是睡不着 / 听到好消息第一反应是不信 / 看到别人尴尬自己先不舒服……',
];

export default function SmartLogInput() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmartLogResult | null>(null);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 随机占位符（组件挂载时确定）
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await authFetch('/api/smart-log/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim() }),
      });
      if (!res.ok) throw new Error('暂时连不上，等一下再试试看');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setInput('');
      setCollapsed(false);
      // 触发 toast 提示
      setShowToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setShowToast(false), 3500);
    } catch (e) {
      setError(e instanceof Error ? e.message : '出了点问题，等会儿再试试看');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError('');
    setShowToast(false);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <section className="py-8 px-6" id="smart-log">
      <div className="max-w-2xl mx-auto">
        {/* 标题区 */}
        <div className="text-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-warm-dark flex items-center justify-center gap-2">
            <span className="text-2xl">🧩</span> 随手记
          </h2>
          <p className="text-sm text-warm-dark/50 mt-2">
            别想太多。你会什么？喜欢什么？别人老找你帮什么？
          </p>
        </div>

        {/* Toast 提示 */}
        {showToast && result && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-warm-accent/10 border border-warm-accent/20 text-sm text-warm-dark animate-fadeSlideIn">
            <span className="text-lg">{result.category === 'fragment' ? '🧩' : '📝'}</span>
            <span className="font-medium">{result.message}</span>
            <Link
              href={result.category === 'fragment' ? '/dashboard/fragments' : '/dashboard/journal'}
              className="ml-auto text-xs text-warm-accent hover:text-warm-accent/80 font-medium underline underline-offset-2"
            >
              去看看
            </Link>
          </div>
        )}

        {/* 输入区 */}
        <div className="bg-white/90 rounded-2xl border border-warm-dark/10 shadow-sm p-4">
          {/* 分拣指示器 */}
          {loading && (
            <div className="flex items-center gap-2 mb-3 text-sm text-warm-accent animate-pulse">
              <span className="text-lg">🤔</span>
              <span>正在看……</span>
              <span className="flex gap-0.5 ml-1">
                <span className="w-1.5 h-1.5 bg-warm-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-warm-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-warm-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          )}

          {/* 输入框 */}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-4 py-3 rounded-xl border border-warm-dark/15 bg-warm-light/40 text-sm text-warm-dark placeholder-warm-dark/30 focus:outline-none focus:border-warm-accent/50 focus:ring-1 focus:ring-warm-accent/20 resize-none transition-all"
              rows={3}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              className="shrink-0 self-end px-5 py-3 bg-warm-accent text-warm-light rounded-xl font-medium text-sm hover:bg-warm-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {loading ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </span>
              ) : '🧩 记下来'}
            </button>
          </div>

          {/* 快捷提示 */}
          <div className="flex gap-2 mt-2 text-xs text-warm-dark/30">
            <span>Enter 记下</span>
            <span>·</span>
            <span>Shift+Enter 换行</span>
            <span>·</span>
            <span>想到了就写，它会自己分类</span>
          </div>

          {/* 错误 */}
          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
              <button onClick={reset} className="ml-auto text-xs text-red-400 hover:text-red-600">再试一下</button>
            </div>
          )}

          {/* 结果卡片 */}
          {result && (
            <div className="mt-4">
              {/* 收起的缩略条 */}
              {collapsed && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warm-light/60 border border-warm-dark/10 cursor-pointer hover:bg-warm-light/80 transition-colors"
                  onClick={() => setCollapsed(false)}
                >
                  <span className="text-lg">{result.category === 'fragment' ? '🧩' : '📝'}</span>
                  <span className="text-sm text-warm-dark/70 truncate flex-1">
                    {result.message}
                  </span>
                  <span className="text-xs text-warm-dark/30">展开 ▾</span>
                </div>
              )}

              {/* 展开的结果卡片 */}
              {!collapsed && (
                <div
                  className={`p-4 rounded-2xl border ${
                    result.category === 'fragment'
                      ? 'bg-warm-accent/8 border-warm-accent/20'
                      : 'bg-green-50/80 border-green-200/60'
                  }`}
                >
                  {/* 结果头部 */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {result.category === 'fragment' ? '🧩' : '📝'}
                      </span>
                      <div>
                        <div className="font-semibold text-sm text-warm-dark">
                          {result.message}
                        </div>
                        <div className="text-xs text-warm-dark/40 mt-0.5">{result.reason}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setCollapsed(true)}
                      className="text-xs text-warm-dark/30 hover:text-warm-dark/50 px-1"
                    >
                      ▲
                    </button>
                  </div>

                  {/* 碎片：显示类型和质量 */}
                  {result.category === 'fragment' && (
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-warm-accent/20 text-warm-accent font-medium">
                        {result.fragment_type}
                      </span>
                      {result.quality_score && (
                        <span className="flex items-center gap-0.5 text-warm-dark/40">
                          {Array.from({ length: result.quality_score || 0 }).map((_, i) => (
                            <span key={i}>⭐</span>
                          ))}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <Link
                      href={result.category === 'fragment' ? '/dashboard/fragments' : '/dashboard/journal'}
                      className="flex-1 text-center text-xs py-2 rounded-lg bg-white border border-warm-dark/10 text-warm-dark hover:bg-warm-light hover:border-warm-accent/30 transition-all"
                    >
                      {result.category === 'fragment' ? '🧩 去碎片本看看' : '📝 去日记本看看'}
                    </Link>
                    <Link
                      href="/dashboard/puzzle-board"
                      className="flex-1 text-center text-xs py-2 rounded-lg bg-white border border-warm-dark/10 text-warm-dark hover:bg-warm-light hover:border-warm-accent/30 transition-all"
                    >
                      🔮 拼拼看
                    </Link>
                    <button
                      onClick={reset}
                      className="shrink-0 px-4 py-2 rounded-lg bg-white border border-warm-dark/10 text-warm-dark/50 hover:text-warm-dark hover:bg-warm-light text-xs transition-all"
                    >
                      再写点
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
import { authFetch   } from '@/lib/api';