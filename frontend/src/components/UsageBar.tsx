'use client';

import { useState, useEffect } from 'react';
import { getUsage, UsageInfo } from '@/lib/api';

export default function UsageBar() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  useEffect(() => {
    getUsage().then(setUsage).catch(() => {});
  }, []);

  if (!usage || usage.tier === 'pro') return null;

  const fragPct = usage.fragments.limit
    ? Math.min(100, Math.round((usage.fragments.used / usage.fragments.limit) * 100))
    : 0;
  const fusionPct = usage.fusions.limit
    ? Math.min(100, Math.round((usage.fusions.used / usage.fusions.limit) * 100))
    : 0;
  const nearLimit = fragPct >= 80 || fusionPct >= 80;
  const overLimit = fragPct >= 100 || fusionPct >= 100;

  if (!nearLimit) return null;

  return (
    <div className={`mb-4 p-3 rounded-xl text-sm ${
      overLimit ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-warm-dark">
          {overLimit ? '🚫 已用完免费额度' : '📊 免费版即将用尽'}
        </span>
        <button
          onClick={() => {/* TODO: navigate to pricing */}}
          className="px-3 py-1 bg-warm-accent text-white rounded-lg text-xs hover:bg-warm-accent/90"
        >
          升级专业版
        </button>
      </div>
      <div className="space-y-1.5">
        <div>
          <div className="flex justify-between text-xs text-warm-dark/60 mb-0.5">
            <span>碎片</span>
            <span>{usage.fragments.used} / {usage.fragments.limit}</span>
          </div>
          <div className="h-1.5 bg-warm-dark/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                fragPct >= 100 ? 'bg-red-400' : fragPct >= 80 ? 'bg-amber-400' : 'bg-warm-accent'
              }`}
              style={{ width: `${fragPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-warm-dark/60 mb-0.5">
            <span>融合</span>
            <span>{usage.fusions.used} / {usage.fusions.limit}</span>
          </div>
          <div className="h-1.5 bg-warm-dark/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                fusionPct >= 100 ? 'bg-red-400' : fusionPct >= 80 ? 'bg-amber-400' : 'bg-warm-accent'
              }`}
              style={{ width: `${fusionPct}%` }}
            />
          </div>
        </div>
      </div>
      {usage.is_trial && (
        <p className="text-xs text-warm-dark/40 mt-2">
          专业版试用还剩 {usage.trial_days_left} 天
        </p>
      )}
    </div>
  );
}
