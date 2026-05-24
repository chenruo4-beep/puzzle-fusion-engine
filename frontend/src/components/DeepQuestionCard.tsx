'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch  } from '@/lib/api';

export default function DeepQuestionCard() {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const lastFetch = sessionStorage.getItem('dq_fetched');
    if (lastFetch) return;
    fetchQuestion();
  }, []);

  const fetchQuestion = async () => {
    try {
      const res = await authFetch('/api/journal/deep-question');
      if (!res.ok) return;
      const data = await res.json();
      if (data.question) {
        setQuestion(data.question);
        setContext(data.context || '');
        setVisible(true);
        sessionStorage.setItem('dq_fetched', '1');
      }
    } catch { /* silent */ }
  };

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  if (!visible && dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="py-3 px-6"
        >
          <div className="max-w-2xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/90 border border-warm-accent/15 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="text-lg shrink-0 mt-0.5">💭</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-warm-dark/80 leading-relaxed">
                    {question}
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="shrink-0 text-warm-dark/20 hover:text-warm-dark/40 text-sm transition-colors"
                >
                  ✕
                </button>
              </div>
              {context && (
                <div className="mt-2 text-[10px] text-warm-dark/25 text-right">
                  {context === '积累' && '你的碎片在等你'}
                  {context === '卡住' && '休息一下也没关系'}
                  {context === '完成' && '这一步走完了'}
                  {context === '探索' && '随便想想'}
                </div>
              )}
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
