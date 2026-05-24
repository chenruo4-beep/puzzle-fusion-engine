'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { authFetch   } from '@/lib/api';

interface UserProfile {
  action_preference: string;
  action_desc: string;
  advice: string;
  icons: string;
  stats: {
    total_fragments: number;
    total_fusions: number;
    total_journals: number;
    total_checkins: number;
    active_maps: number;
    completed_maps: number;
    total_failures: number;
    common_failure_reason: string | null;
  };
  top_strengths: { type: string; count: number }[];
}

const TYPE_LABELS: Record<string, string> = {
  '技能': '动手能力',
  '知识': '知识储备',
  '特质': '人格特质',
  '经验': '经验积累',
  '兴趣': '兴趣驱动',
  '资源': '资源网络',
  '直觉': '直觉判断',
};

const TYPE_ICONS: Record<string, string> = {
  '技能': '🛠️',
  '知识': '📚',
  '特质': '💎',
  '经验': '🗺️',
  '兴趣': '🔥',
  '资源': '🔗',
  '直觉': '🔮',
};

export default function UserProfileCard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    authFetch('/api/analytics/user-profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProfile(d); })
      .catch(() => {});
  }, []);

  if (!profile || profile.stats.total_fragments === 0) return null;

  return (
    <section className="py-4 px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-white/90 border border-warm-dark/10 shadow-sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{profile.icons}</span>
              <div>
                <div className="text-sm font-semibold text-warm-dark">
                  你的认知画像
                </div>
                <div className="text-xs text-warm-dark/40">
                  {profile.action_preference}
                </div>
              </div>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-warm-dark/30 hover:text-warm-dark/50"
            >
              {expanded ? '收起 ▲' : '详情 ▼'}
            </button>
          </div>

          {/* Main insight */}
          <div className="bg-warm-light/60 rounded-xl p-3 mb-3">
            <p className="text-sm text-warm-dark/70 leading-relaxed">{profile.action_desc}</p>
          </div>

          {/* Stats mini grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center p-2 rounded-lg bg-warm-light/40">
              <div className="text-lg font-bold text-warm-dark">{profile.stats.total_fragments}</div>
              <div className="text-[10px] text-warm-dark/35">碎片</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-warm-light/40">
              <div className="text-lg font-bold text-warm-dark">{profile.stats.total_fusions}</div>
              <div className="text-[10px] text-warm-dark/35">融合</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-warm-light/40">
              <div className="text-lg font-bold text-warm-dark">{profile.stats.total_checkins}</div>
              <div className="text-[10px] text-warm-dark/35">行动</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-warm-light/40">
              <div className="text-lg font-bold text-warm-dark">{profile.stats.completed_maps}</div>
              <div className="text-[10px] text-warm-dark/35">完成的拼图</div>
            </div>
          </div>

          {/* Expand: strengths + advice */}
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 pt-2 border-t border-warm-dark/5"
            >
              {/* Top strengths */}
              {profile.top_strengths.length > 0 && (
                <div>
                  <div className="text-xs text-warm-dark/40 mb-1.5">优势领域</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.top_strengths.map((s) => (
                      <span
                        key={s.type}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warm-accent/10 text-xs text-warm-accent"
                      >
                        {TYPE_ICONS[s.type] || '🧩'} {TYPE_LABELS[s.type] || s.type}
                        <span className="text-warm-dark/25">×{s.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Advice */}
              <div className="bg-warm-accent/5 rounded-xl p-3">
                <div className="text-xs text-warm-dark/40 mb-1">给现阶段你的建议</div>
                <p className="text-sm text-warm-dark/70 leading-relaxed">{profile.advice}</p>
              </div>

              {/* Common failure reason if any */}
              {profile.stats.common_failure_reason && (
                <div className="text-xs text-warm-dark/35 text-center">
                  你最容易放弃的原因：{profile.stats.common_failure_reason}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
