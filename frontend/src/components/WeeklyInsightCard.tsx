'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch   } from '@/lib/api';

interface Insight {
  text: string;
  icon: string;
}

interface WeeklyData {
  title?: string;
  insights: Insight[];
  highlight?: string;
  week?: string;
  message?: string;
}

export default function WeeklyInsightCard() {
  const [data, setData] = useState<WeeklyData | null>(null);

  useEffect(() => {
    authFetch('/api/journal/weekly-insight')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && !json.message && json.insights && json.insights.length > 0) {
          setData(json);
        }
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="rounded-2xl bg-white/60 border border-warm-dark/10 p-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <h3 className="text-sm font-semibold text-warm-dark/60">
          本周新发现
        </h3>
        <p className="text-xs text-warm-dark/40 mt-0.5 mb-4">
          来自你这一周的记录
        </p>

        <div className="space-y-0">
          {data.insights.map((insight, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 py-3 ${
                i < data.insights.length - 1
                  ? 'border-b border-warm-dark/5'
                  : ''
              }`}
            >
              <span className="shrink-0 text-lg leading-none mt-0.5">
                {insight.icon}
              </span>
              <span className="text-sm text-warm-dark/70 leading-relaxed">
                {insight.text}
              </span>
            </div>
          ))}
        </div>

        {data.highlight && (
          <div className="mt-4 rounded-xl bg-warm-accent/10 px-4 py-3">
            <p className="text-sm text-warm-dark/70 leading-relaxed">
              {data.highlight}
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
