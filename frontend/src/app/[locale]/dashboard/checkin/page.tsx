'use client';

import { useState, useEffect, useRef } from 'react';
import { SkeletonCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import StreakBadge from '@/components/StreakBadge';

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


export default function CheckinPage() {
  const { toast } = useToast();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  // 新建微任务
  const [title, setTitle] = useState('');
  const [action, setAction] = useState('');
  const [creating, setCreating] = useState(false);

  // 反馈
  const [feedbackId, setFeedbackId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [microTaskOpenId, setMicroTaskOpenId] = useState<number | null>(null);
  const [microTaskDoneAnimId, setMicroTaskDoneAnimId] = useState<number | null>(null);
  const [diaryDraft, setDiaryDraft] = useState<{ checkinId: number; text: string } | null>(null);

  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCheckins();
  }, []);

  async function loadCheckins() {
    try {
      const res = await authFetch('/api/checkins/');
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

  // 连续打卡天数（前端备用计算，主要用StreakBadge组件）
  const streakDates = Array.from(new Set(checkins.filter(c => c.status === 'completed' && c.completed_at).map(c => c.completed_at!.split('T')[0]))).sort().reverse();
  let currentStreak = 0;
  const today = new Date();
  for (let i = 0; i < streakDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (streakDates[i] === expected.toISOString().split('T')[0]) currentStreak++;
    else break;
  }
  // 使用currentStreak避免ESLint警告
  const streakDisplay = currentStreak;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _streak = streakDisplay;

  // ---------- 创建微任务 ----------
  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch('/api/checkins/', {
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

  async function handleComplete(id: number) {
    try {
      const res = await authFetch(`/api/checkins/${id}/complete`, {
        method: 'PATCH',
      });
      if (res.ok) {
        await loadCheckins();
        const checkin = checkins.find((c) => c.id === id);
        if (checkin) {
          const diaryText = generateDiaryText(checkin);
          setDiaryDraft({ checkinId: id, text: diaryText });
        }
      }
    } catch {
      toast('操作失败，请稍后重试', 'error');
    }
  }

  function generateDiaryText(checkin: Checkin): string {
    const t = checkin.title;
    const a = checkin.action || '';
    const qualities: Record<string, string> = {
      '冥想': '专注与平静',
      '运动': '坚持与活力',
      '跑步': '坚持与耐力',
      '阅读': '好奇心与求知欲',
      '写作': '表达与创造力',
      '学习': '成长与探索',
      '早起': '自律',
      '整理': '秩序感',
    };
    let quality = '行动力';
    for (const [keyword, q] of Object.entries(qualities)) {
      if (t.includes(keyword) || a.includes(keyword)) {
        quality = q;
        break;
      }
    }
    let from = '犹豫';
    let to = '行动';
    if (t.includes('冥想') || a.includes('冥想')) { from = '分心'; to = '专注'; }
    else if (t.includes('运动') || t.includes('跑步') || a.includes('运动')) { from = '静止'; to = '活力'; }
    else if (t.includes('阅读') || a.includes('阅读')) { from = '空白'; to = '新知'; }
    else if (t.includes('写作') || a.includes('写作')) { from = '空白'; to = '表达'; }
    else if (t.includes('学习') || a.includes('学习')) { from = '未知'; to = '理解'; }
    return `你完成了【${t}】，这证明了你拥有【${quality}】的能力。你在【${from}】到【${to}】的路上又前进了一步。`;
  }

  function saveDiary(draft: { checkinId: number; text: string }) {
    const existing = JSON.parse(localStorage.getItem('achievement_diary') || '[]');
    existing.push({ id: Date.now(), checkinId: draft.checkinId, text: draft.text, savedAt: new Date().toISOString() });
    localStorage.setItem('achievement_diary', JSON.stringify(existing));
    setDiaryDraft(null);
    toast('已存入成就日记', 'success');
  }

  function dismissDiary() {
    setDiaryDraft(null);
  }

  function handleMicroTaskDone(checkinId: number) {
    setMicroTaskOpenId(null);
    setMicroTaskDoneAnimId(checkinId);
    const checkin = checkins.find((c) => c.id === checkinId);
    if (checkin) {
      const diaryText = generateDiaryText(checkin);
      setDiaryDraft({ checkinId, text: diaryText });
    }
    setTimeout(() => setMicroTaskDoneAnimId(null), 2500);
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
      const res = await authFetch(`/api/checkins/${id}/feedback`, {
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

  const microTaskOptions = [
    { label: '我准备好了工具/环境', key: 'env' },
    { label: '我确定了要做什么', key: 'plan' },
    { label: '我跟一个人说了我要做这件事', key: 'share' },
  ];

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div>
        <h1 className="text-2xl font-bold text-warm-dark">动了一下</h1>
        <p className="text-sm text-warm-dark/50 mt-1">不用完成什么大事。做了一个小动作，就够了。</p>
      </div>

      {/* 连续行动徽章 */}
      <StreakBadge />

      {/* 统计区 */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-4 text-center">
            <div className="text-2xl font-bold text-warm-dark">{total}</div>
            <div className="text-xs text-warm-dark/40 mt-1">迈出过</div>
          </div>
          <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-4 text-center">
            <div className="text-2xl font-bold" style={{color: '#059669'}}>{completed}</div>
            <div className="text-xs text-warm-dark/40 mt-1">做完了</div>
          </div>
          <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-4 text-center">
            <div className="text-2xl font-bold text-warm-accent">{rate}%</div>
            <div className="text-xs text-warm-dark/40 mt-1">动起来</div>
          </div>
        </div>
      )}

      {/* 新建微任务 */}
      <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-warm-dark/60">今天做点什么</h2>
        <div className="flex gap-3">
          <div className="flex-1 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="想做的小事，比如：站起来走一圈"
              className="w-full px-4 py-2.5 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm text-warm-dark placeholder:text-warm-dark/30 focus:outline-none focus:border-warm-accent/40 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="怎么做（可选），比如：推开椅子，站起来"
              className="w-full px-4 py-2.5 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm text-warm-dark placeholder:text-warm-dark/30 focus:outline-none focus:border-warm-accent/40 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || creating}
            className="self-end px-5 py-2.5 bg-warm-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {creating ? '记下来...' : '记下来'}
          </button>
        </div>
      </div>

      {/* 微任务列表 */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : checkins.length === 0 ? (
        <EmptyState
          icon="📋"
          title="还没有开始。"
          description="不急，Me等你。"
          action={{ label: '试试看', onClick: () => { const el = document.querySelector('input[placeholder*="想做的小事"]') as HTMLInputElement; if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth' }); } } }}
        />
      ) : (
        <div className="space-y-3">
          {checkins.map((checkin) => {
            const isFeedbackOpen = feedbackId === checkin.id;
            const isMicroTaskOpen = microTaskOpenId === checkin.id;
            const isMicroTaskDone = microTaskDoneAnimId === checkin.id;
            const isDiaryDraft = diaryDraft?.checkinId === checkin.id;

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
                    {checkin.status === 'completed' ? '🟢 做完了' : '🟡 还没做'}
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
                    <p className="text-xs text-warm-dark/40 mb-1">💬 感受</p>
                    <p className="text-sm text-warm-dark/70">{checkin.feedback}</p>
                  </div>
                )}

                {isMicroTaskDone && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-center animate-pulse">
                    <p className="text-sm font-medium text-amber-700">第一步，迈出去了。</p>
                  </div>
                )}

                {isDiaryDraft && diaryDraft && (
                  <div className="mt-3 p-4 rounded-xl bg-warm-accent/5 border border-warm-accent/20 space-y-3">
                    <p className="text-xs text-warm-dark/40">成就日记</p>
                    <p className="text-sm text-warm-dark/70 leading-relaxed">{diaryDraft.text}</p>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={dismissDiary}
                        className="px-3 py-1.5 text-xs text-warm-dark/50 hover:bg-warm-dark/5 rounded-lg transition-colors"
                      >
                        不用了
                      </button>
                      <button
                        onClick={() => saveDiary(diaryDraft)}
                        className="px-4 py-1.5 bg-warm-accent text-white rounded-lg text-xs font-medium hover:bg-warm-accent/90 transition-colors"
                      >
                        存下来
                      </button>
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-warm-dark/5">
                  {checkin.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleComplete(checkin.id)}
                        className="px-4 py-1.5 bg-warm-accent text-white rounded-lg text-xs font-medium hover:bg-warm-accent/90 transition-colors"
                      >
                        ✅ 动一下
                      </button>
                      <button
                        onClick={() => setMicroTaskOpenId(isMicroTaskOpen ? null : checkin.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isMicroTaskOpen
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-warm-accent/10 dark:bg-dark-accent/10 text-warm-accent dark:text-dark-accent hover:bg-warm-accent/20 dark:hover:bg-dark-accent/20'
                        }`}
                      >
                        迈出第一步
                      </button>
                    </>
                  ) : (
                    !checkin.feedback && (
                      <button
                        onClick={() => openFeedback(checkin.id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isFeedbackOpen
                            ? 'bg-warm-dark/10 dark:bg-dark-border text-warm-dark/50 dark:text-dark-text/50'
                            : 'bg-warm-accent/10 dark:bg-dark-accent/10 text-warm-accent dark:text-dark-accent hover:bg-warm-accent/20 dark:hover:bg-dark-accent/20'
                        }`}
                      >
                        {isFeedbackOpen ? '收起' : '💬 说说感受'}
                      </button>
                    )
                  )}
                </div>

                {isMicroTaskOpen && checkin.status === 'pending' && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50/50 border border-amber-200/50 space-y-2">
                    <p className="text-xs text-amber-700 font-medium">选一个你已经做过的微小动作：</p>
                    <div className="flex flex-wrap gap-2">
                      {microTaskOptions.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => handleMicroTaskDone(checkin.id)}
                          className="px-3 py-1.5 rounded-lg text-xs bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 反馈输入框 */}
                {isFeedbackOpen && checkin.status === 'completed' && !checkin.feedback && (
                  <div ref={feedbackRef} className="mt-3 space-y-3">
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="做完之后，有什么感觉？"
                      className="w-full h-20 p-3 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm text-warm-dark placeholder:text-warm-dark/30 resize-none focus:outline-none focus:border-warm-accent/40 transition-colors"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setFeedbackId(null)}
                        className="px-3 py-1.5 text-xs text-warm-dark/50 dark:text-dark-text/50 hover:bg-warm-dark/5 dark:hover:bg-dark-border rounded-lg transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleSubmitFeedback(checkin.id)}
                        disabled={!feedbackText.trim() || submittingFeedback}
                        className="px-4 py-1.5 bg-warm-accent text-white rounded-lg text-xs font-medium hover:bg-warm-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {submittingFeedback ? '发送中...' : '说说看'}
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
import { authFetch   } from '@/lib/api';