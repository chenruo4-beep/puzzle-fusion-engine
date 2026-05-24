'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authHeaders, authFetch   } from '@/lib/api';

interface HabitSuggestion {
  fragment_id: number;
  fragment_content: string;
  fragment_type: string;
  habit_name: string;
  habit_desc: string;
  daily_action: string;
  growth_stages: { stage: number; label: string; icon: string; days: number }[];
}

interface ActiveHabit {
  id: number;
  fragment_id: number;
  fragment_content: string;
  name: string;
  description: string;
  streak: number;
  growth_stage: number;
  stage_label: string;
  stage_icon: string;
  last_checkin_date: string;
  today_checked: boolean;
}

export default function MicroHabitSeed() {
  const [habits, setHabits] = useState<ActiveHabit[]>([]);
  const [showSuggestion, setShowSuggestion] = useState<HabitSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchHabits(); }, []);

  const fetchHabits = async () => {
    try {
      const res = await authFetch('/api/habits/active');
      if (res.ok) {
        const data = await res.json();
        setHabits(data.habits || []);
      }
    } catch { /* silent */ }
  };

  const suggestFromFragment = async (fragmentId: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/habits/suggest', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ fragment_id: fragmentId }),
      });
      if (!res.ok) throw new Error('');
      const data = await res.json();
      setShowSuggestion(data);
    } catch {
      setError('暂时连接不上，等一下再试试看');
    } finally {
      setLoading(false);
    }
  };

  const startHabit = async () => {
    if (!showSuggestion) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/habits/start_with_data', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          fragment_id: showSuggestion.fragment_id,
          habit_name: showSuggestion.habit_name,
          habit_desc: showSuggestion.habit_desc,
        }),
      });
      if (!res.ok) throw new Error('');
      const data = await res.json();
      if (!data.existing) {
        await fetchHabits();
      }
      setShowSuggestion(null);
    } catch {
      setError('出了点问题，等一下再试试看');
    } finally {
      setLoading(false);
    }
  };

  const checkin = async (habitId: number) => {
    try {
      const res = await authFetch('/api/habits/checkin', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ habit_id: habitId }),
      });
      if (res.ok) await fetchHabits();
    } catch { /* silent */ }
  };

  const stageColor = (stage: number) => {
    const colors = ['#b8a088', '#9ab88a', '#6aab6a', '#e0a060', '#c06060'];
    return colors[stage] || colors[0];
  };

  const [pickOpen, setPickOpen] = useState(false);
  const [fragments, setFragments] = useState<{ id: number; content: string; fragment_type: string }[]>([]);

  const openPicker = async () => {
    setPickOpen(true);
    try {
      const res = await authFetch('/api/fragments/?archived_filter=0');
      if (res.ok) {
        const data = await res.json();
        setFragments(data.slice(0, 10).map((f: { id: number; content: string; fragment_type: string }) => ({
          id: f.id, content: f.content, fragment_type: f.fragment_type
        })));
      }
    } catch { /* silent */ }
  };

  return (
    <section className="py-4 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-3">
          <h3 className="text-sm font-medium text-warm-dark/50">
            {habits.length > 0 ? '正在孵化中' : ''}
          </h3>
        </div>

        {/* Active habits */}
        <AnimatePresence>
          {habits.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-3 p-4 rounded-2xl bg-white/90 border border-warm-dark/10 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">{h.stage_icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-warm-dark truncate">{h.name}</div>
                  <div className="text-xs text-warm-dark/40 mt-0.5">
                    {h.stage_label} · 连续 {h.streak} 天
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-warm-dark/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: stageColor(h.growth_stage) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (h.streak / 66) * 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => checkin(h.id)}
                  disabled={h.today_checked}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                    h.today_checked
                      ? 'bg-warm-light/60 text-warm-dark/30 cursor-default'
                      : 'bg-warm-accent text-warm-light hover:bg-warm-accent/90 active:scale-95'
                  }`}
                >
                  {h.today_checked ? '已浇水' : '浇水'}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* New seed button */}
        {!showSuggestion && !pickOpen && (
          <button
            onClick={openPicker}
            className="w-full py-2 rounded-xl border border-dashed border-warm-dark/15 text-warm-dark/40 text-xs hover:text-warm-dark/60 hover:border-warm-dark/25 transition-colors"
          >
            + 孵化一块碎片
          </button>
        )}

        {/* Fragment picker */}
        <AnimatePresence>
          {pickOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-warm-light/60 border border-warm-dark/10">
                <div className="text-xs text-warm-dark/50 mb-2">选一块想变强的碎片</div>
                {fragments.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setPickOpen(false); suggestFromFragment(f.id); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-warm-dark hover:bg-warm-accent/10 transition-colors truncate"
                  >
                    <span className="text-xs px-1.5 py-0.5 rounded bg-warm-accent/15 text-warm-accent mr-2">
                      {f.fragment_type}
                    </span>
                    {f.content}
                  </button>
                ))}
                <button
                  onClick={() => setPickOpen(false)}
                  className="w-full mt-1 text-xs text-center text-warm-dark/30 py-1 hover:text-warm-dark/50"
                >
                  取消
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestion card */}
        <AnimatePresence>
          {showSuggestion && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-warm-accent/8 border border-warm-accent/20"
            >
              <div className="text-center mb-3">
                <div className="text-lg mb-1">🌱</div>
                <div className="text-sm text-warm-dark/60">这块碎片，你想让它变得更强吗？</div>
              </div>
              <div className="bg-white/80 rounded-xl p-3 mb-3">
                <div className="text-sm font-medium text-warm-dark">{showSuggestion.habit_name}</div>
                <div className="text-xs text-warm-dark/50 mt-1">{showSuggestion.habit_desc}</div>
                <div className="text-xs text-warm-accent mt-2 flex items-center gap-1">
                  <span>☀️</span>
                  <span>{showSuggestion.daily_action}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={startHabit}
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-warm-accent text-warm-light text-sm font-medium hover:bg-warm-accent/90 disabled:opacity-40 transition-all active:scale-95"
                >
                  种下这颗种子
                </button>
                <button
                  onClick={() => setShowSuggestion(null)}
                  className="px-4 py-2 rounded-xl border border-warm-dark/10 text-warm-dark/50 text-sm hover:bg-warm-light transition-all"
                >
                  先不要
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-2 text-xs text-red-400 text-center">{error}</div>
        )}
      </div>
    </section>
  );
}
