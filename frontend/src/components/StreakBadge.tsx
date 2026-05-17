'use client';

import { useState, useEffect } from 'react';

interface StreakData {
  current_streak: number;
  max_streak: number;
  today_completed: boolean;
  next_milestone: number;
}

export default function StreakBadge() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

  useEffect(() => {
    fetchStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStreak = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/checkins/streak`);
      if (res.ok) {
        const data = await res.json();
        setStreak(data);
        if (data.current_streak > 0 && data.current_streak % 7 === 0) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
      }
    } catch (e) {
      console.error('获取连续打卡失败:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-warm-light/40 rounded-xl p-3">
        <div className="h-8 bg-warm-dark/10 rounded-lg" />
      </div>
    );
  }

  if (!streak) return null;

  const progress = streak.current_streak > 0 
    ? (streak.current_streak % 7) / 7 * 100 
    : 0;

  return (
    <div className="relative">
      {/* 庆祝动画 */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <p className="text-2xl font-bold text-warm-accent">
              {streak.current_streak}天连续打卡！
            </p>
            <p className="text-sm text-warm-dark/60">你太棒了！</p>
          </div>
        </div>
      )}

      <div className={`p-4 rounded-2xl border transition-all ${
        streak.today_completed 
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200' 
          : 'bg-white/60 border-warm-dark/10'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{streak.today_completed ? '🔥' : '⚡'}</span>
            <div>
              <p className="text-sm font-bold text-warm-dark">
                {streak.current_streak > 0 
                  ? `连续打卡 ${streak.current_streak} 天` 
                  : '开始你的打卡之旅'}
              </p>
              {streak.max_streak > 0 && (
                <p className="text-xs text-warm-dark/50">
                  最高纪录: {streak.max_streak} 天
                </p>
              )}
            </div>
          </div>
          {streak.today_completed && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
              今日已打卡
            </span>
          )}
        </div>

        {/* 7天进度环 */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-warm-dark/40 mb-1">
              <span>本周进度</span>
              <span>{streak.current_streak % 7}/7</span>
            </div>
            <div className="h-2 bg-warm-dark/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-warm-dark/40">下个目标</p>
            <p className="text-sm font-bold text-amber-600">{streak.next_milestone}天</p>
          </div>
        </div>

        {/* 7天火焰图标 */}
        {streak.current_streak > 0 && (
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-warm-dark/5">
            {Array.from({ length: 7 }).map((_, i) => {
              const dayStreak = streak.current_streak % 7 || 7;
              const isActive = i < dayStreak;
              return (
                <div 
                  key={i} 
                  className={`flex-1 text-center py-1 rounded-lg text-xs transition-all ${
                    isActive 
                      ? 'bg-amber-100 text-amber-600' 
                      : 'bg-warm-dark/5 text-warm-dark/20'
                  }`}
                >
                  {isActive ? '🔥' : '○'}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
