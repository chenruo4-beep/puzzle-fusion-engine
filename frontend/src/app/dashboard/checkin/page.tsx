'use client';

import { useState, useEffect, useRef } from 'react';
import { SkeletonCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

interface Checkin {
  id: number;
  user_id: number;
  title: string;
  action: string | null;
  fusion_id: number | null;
  status: 'pending' | 'completed';
  feedback: string | null;
  completed_at: string | null;
  created_at: string;
}

const API_BASE = 'http://localhost:8000';

export default function CheckinPage() {
  const { toast } = useToast();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  // 新建打卡
  const [title, setTitle] = useState('');
  const [action, setAction] = useState('');
  const [creating, setCreating] = useState(false);

  // 反馈
  const [feedbackId, setFeedbackId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCheckins();
  }, []);

  async function loadCheckins() {
    try {
      const res = await fetch(`${API_BASE}/api/checkins/`);
      const data = await res.json();
      setCheckins(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  // ---------- 统计 ----------
  const total = checkins.length;
  const completed = checkins.filter((c) => c.status === 'completed').length;
  // const pending = checkins.filter((c) => c.status === 'pending').length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 连续打卡天数
  const streakDates = Array.from(new Set(checkins.filter(c => c.status === 'completed' && c.completed_at).map(c => c.completed_at!.split('T')[0]))).sort().reverse();
  let currentStreak = 0;
  const today = new Date();
  for (let i = 0; i < streakDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (streakDates[i] === expected.toISOString().split('T')[0]) currentStreak++;
    else break;
  }

  // ---------- 创建打卡 ----------
  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/checkins/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          action: action.trim() || undefined,
        }),
      });
      if (res.ok) {
        setTitle('');
        setAction('');
        await loadCheckins();
      }
    } catch {
      toast('创建失败，请稍后重试', 'error');
    } finally {
      setCreating(false);
    }
  }

  // ---------- 完成打卡 ----------
  async function handleComplete(id: number) {
    try {
      const res = await fetch(`${API_BASE}/api/checkins/${id}/complete`, {
        method: 'PATCH',
      });
      if (res.ok) {
        await loadCheckins();
      }
    } catch {
      toast('操作失败，请稍后重试', 'error');
    }
  }

  // ---------- 反馈 ----------
  function openFeedback(id: number) {
    setFeedbackId(feedbackId === id ? null : id);
    setFeedbackText('');
    if (feedbackId !== id) {
      setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }

  async function handleSubmitFeedback(id: number) {
    if (!feedbackText.trim()) return;
    setSubmittingFeedback(true);
    try {
      const res = await fetch(`${API_BASE}/api/checkins/${id}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedbackText.trim() }),
      });
      if (res.ok) {
        setFeedbackId(null);
        setFeedbackText('');
        await loadCheckins();
      }
    } catch {
      toast('提交反馈失败，请稍后重试', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  }

  // ---------- 日期格式化 ----------
  function formatDate(iso: string) {
    const d = new Date(iso);
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${mm}月${dd}日 ${h}:${m}`;
  }

  useKeyboardShortcut({ onCtrlEnter: handleCreate });

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div>
        <h1 className="text-2xl font-bold text-warm-dark">每日打卡</h1>
        <p className="text-sm text-warm-dark/50 mt-1">持续小行动，累积大改变</p>
      </div>

      {/* 统计区 */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-4 text-center">
            <div className="text-2xl font-bold text-warm-dark">{total}</div>
            <div className="text-xs text-warm-dark/40 mt-1">总打卡</div>
          </div>
          <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-4 text-center">
            <div className="text-2xl font-bold" style={{color: '#059669'}}>{completed}</div>
            <div className="text-xs text-warm-dark/40 mt-1">已完成</div>
          </div>
          <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-4 text-center">
            <div className="text-2xl font-bold text-warm-accent">{rate}%</div>
            <div className="text-xs text-warm-dark/40 mt-1">完成率</div>
          </div>
          <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{currentStreak}</div>
            <div className="text-xs text-warm-dark/40 mt-1">连续天数</div>
          </div>
        </div>
      )}

      {/* 新建打卡 */}
      <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-warm-dark/60">新建打卡</h2>
        <div className="flex gap-3">
          <div className="flex-1 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="打卡标题，如：冥想10分钟"
              className="w-full px-4 py-2.5 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm text-warm-dark placeholder:text-warm-dark/30 focus:outline-none focus:border-warm-accent/40 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="行动描述（可选），如：找一个安静的地方，闭上眼睛"
              className="w-full px-4 py-2.5 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm text-warm-dark placeholder:text-warm-dark/30 focus:outline-none focus:border-warm-accent/40 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || creating}
            className="self-end px-5 py-2.5 bg-warm-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {creating ? '创建中...' : '创建'}
          </button>
        </div>
      </div>

      {/* 打卡列表 */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : checkins.length === 0 ? (
        <EmptyState
          icon="📋"
          title="还没有打卡记录"
          description="不需要完美的第一天，只需要真实的第一步。从这里开始你的第一个打卡吧。"
          action={{ label: '创建第一个打卡', onClick: () => { const el = document.querySelector('input[placeholder*="打卡标题"]') as HTMLInputElement; if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth' }); } } }}
        />
      ) : (
        <div className="space-y-3">
          {checkins.map((checkin) => {
            const isFeedbackOpen = feedbackId === checkin.id;

            return (
              <div
                key={checkin.id}
                className={`rounded-2xl bg-white/80 shadow-sm border border-warm-dark/10 p-5 transition-all hover:shadow-md ${
                  checkin.status === 'completed'
                    ? 'border-l-4 border-l-emerald-400'
                    : 'border-l-4 border-l-amber-400'
                }`}
              >
                {/* 头部：状态 + 时间 */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      checkin.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {checkin.status === 'completed' ? '🟢 已完成' : '🟡 进行中'}
                  </span>
                  <span className="text-xs text-warm-dark/40">
                    {formatDate(checkin.created_at)}
                  </span>
                  {checkin.status === 'completed' && checkin.completed_at && (
                    <span className="text-xs text-warm-dark/40">
                      · 完成于 {formatDate(checkin.completed_at)}
                    </span>
                  )}
                </div>

                {/* 标题 */}
                <h3 className="font-semibold text-warm-dark mb-1">{checkin.title}</h3>

                {/* 行动描述 */}
                {checkin.action && (
                  <p className="text-sm text-warm-dark/60 mb-3">{checkin.action}</p>
                )}

                {/* 已提交的反馈 */}
                {checkin.feedback && (
                  <div className="mt-2 p-3 rounded-xl bg-warm-accent/5 border border-warm-accent/10">
                    <p className="text-xs text-warm-dark/40 mb-1">💬 反馈</p>
                    <p className="text-sm text-warm-dark/70">{checkin.feedback}</p>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-warm-dark/5">
                  {checkin.status === 'pending' ? (
                    <button
                      onClick={() => handleComplete(checkin.id)}
                      className="px-4 py-1.5 bg-warm-accent text-white rounded-lg text-xs font-medium hover:bg-warm-accent/90 transition-colors"
                    >
                      ✅ 完成打卡
                    </button>
                  ) : (
                    !checkin.feedback && (
                      <button
                        onClick={() => openFeedback(checkin.id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isFeedbackOpen
                            ? 'bg-warm-dark/10 text-warm-dark/50'
                            : 'bg-warm-accent/10 text-warm-accent hover:bg-warm-accent/20'
                        }`}
                      >
                        {isFeedbackOpen ? '收起' : '💬 写反馈'}
                      </button>
                    )
                  )}
                </div>

                {/* 反馈输入框 */}
                {isFeedbackOpen && checkin.status === 'completed' && !checkin.feedback && (
                  <div ref={feedbackRef} className="mt-3 space-y-3">
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="写下完成后的感受..."
                      className="w-full h-20 p-3 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm text-warm-dark placeholder:text-warm-dark/30 resize-none focus:outline-none focus:border-warm-accent/40 transition-colors"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setFeedbackId(null)}
                        className="px-3 py-1.5 text-xs text-warm-dark/50 hover:bg-warm-dark/5 rounded-lg transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleSubmitFeedback(checkin.id)}
                        disabled={!feedbackText.trim() || submittingFeedback}
                        className="px-4 py-1.5 bg-warm-accent text-white rounded-lg text-xs font-medium hover:bg-warm-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {submittingFeedback ? '提交中...' : '提交反馈'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}