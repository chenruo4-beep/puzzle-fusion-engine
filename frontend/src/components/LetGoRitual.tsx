'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch  } from '@/lib/api';

interface FragmentItem {
  id: number;
  fragment_type: string;
  content: string;
  created_at: string;
}

export default function LetGoRitual() {
  const [stage, setStage] = useState<'idle' | 'reviewing' | 'done'>('idle');
  const [fragments, setFragments] = useState<FragmentItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [letGoItems, setLetGoItems] = useState<number[]>([]);

  useEffect(() => {
    const seen = localStorage.getItem('letgo_last_seen');
    if (seen) {
      const daysSince = (Date.now() - parseInt(seen)) / 86400000;
      if (daysSince < 5) return;
    }
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/fragments/?archived_filter=0');
      if (!res.ok) return;
      const data = await res.json();
      if (data.length >= 3) {
        const shuffled = data.sort(() => Math.random() - 0.5);
        setFragments(shuffled.slice(0, 4));
        setStage('reviewing');
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const handleYes = async (id: number) => {
    setLetGoItems(prev => [...prev, id]);
    try {
      await authFetch(`/api/fragments/${id}/let-go`, { method: 'POST' });
    } catch { /* silent */ }
    setTimeout(() => {
      if (current < fragments.length - 1) {
        setCurrent(prev => prev + 1);
        setShowConfirm(false);
      } else {
        setStage('done');
      }
    }, 400);
  };

  const handleNo = () => {
    if (current < fragments.length - 1) {
      setCurrent(prev => prev + 1);
      setShowConfirm(false);
    } else {
      setStage('done');
    }
  };

  const dismiss = () => {
    localStorage.setItem('letgo_last_seen', String(Date.now()));
    setStage('idle');
  };

  if (stage === 'idle' || fragments.length === 0) return null;

  return (
    <section className="py-4 px-6">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {stage === 'reviewing' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5 rounded-2xl bg-white/90 border border-warm-dark/10 shadow-sm"
            >
              <div className="text-center mb-4">
                <div className="text-sm font-medium text-warm-dark/60">
                  每隔一段时间，Me会帮你确认一下
                </div>
                <div className="text-xs text-warm-dark/40 mt-1">
                  下面这些，还是你吗？
                </div>
              </div>

              {/* Current fragment */}
              <div className="bg-warm-light/60 rounded-xl p-4 mb-4 text-center">
                <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-warm-accent/15 text-warm-accent mb-2">
                  {fragments[current].fragment_type}
                </span>
                <div className="text-sm text-warm-dark font-medium">
                  {fragments[current].content}
                </div>
              </div>

              {!showConfirm ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleNo()}
                    className="flex-1 py-2.5 rounded-xl border border-warm-dark/10 text-warm-dark/60 text-sm hover:bg-warm-light transition-all active:scale-95"
                  >
                    这依然是我
                  </button>
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-400 text-sm hover:bg-red-50 transition-all active:scale-95"
                  >
                    有些不是我
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  <div className="text-xs text-center text-warm-dark/50">
                    把它放入&ldquo;我选择不再背负的&rdquo;区域。你可以随时反悔。
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleYes(fragments[current].id)}
                      className="flex-1 py-2.5 rounded-xl bg-red-100 text-red-500 text-sm font-medium hover:bg-red-200 transition-all active:scale-95"
                    >
                      放下它
                    </button>
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="px-4 py-2.5 rounded-xl border border-warm-dark/10 text-warm-dark/40 text-sm hover:bg-warm-light transition-all"
                    >
                      算了
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="flex justify-center gap-1.5 mt-3">
                {fragments.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === current ? 'bg-warm-accent' : 'bg-warm-dark/15'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {stage === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5 rounded-2xl bg-white/90 border border-warm-dark/10 shadow-sm text-center"
            >
              <div className="text-2xl mb-2">
                {letGoItems.length > 0 ? '🌿' : '💪'}
              </div>
              <div className="text-sm text-warm-dark/60 mb-3">
                {letGoItems.length > 0
                  ? `放下了 ${letGoItems.length} 块。你比以前更清楚自己是谁了。`
                  : '这些都还是你。你对自己的了解，越来越清晰了。'}
              </div>
              <button
                onClick={dismiss}
                className="text-xs text-warm-accent hover:text-warm-accent/80 font-medium"
              >
                好的
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
