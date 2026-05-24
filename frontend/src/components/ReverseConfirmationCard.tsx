'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch  } from '@/lib/api';

interface Trait {
  id: string;
  trait: string;
  dimension: string;
  reason: string;
}

type RowStatus = 'idle' | 'confirmed' | 'denied' | 'removed';

export default function ReverseConfirmationCard() {
  const [traits, setTraits] = useState<Trait[]>([]);
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});
  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    authFetch('/api/suggestions/traits')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          const t = data.suggestions as Trait[];
          setTraits(t);
          const init: Record<string, RowStatus> = {};
          t.forEach((x) => { init[x.id] = 'idle'; });
          setRowStatus(init);
          setCardVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  const answer = (trait: Trait, accept: boolean) => {
    const newStatus: RowStatus = accept ? 'confirmed' : 'denied';
    setRowStatus((prev) => ({ ...prev, [trait.id]: newStatus }));

    authFetch('/api/suggestions/traits/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestion_id: trait.id, accepted: accept }),
    }).catch(() => {});

    setTimeout(() => {
      setRowStatus((prev) => {
        const next = { ...prev, [trait.id]: 'removed' as RowStatus };
        if (Object.values(next).every((s) => s === 'removed')) {
          setTimeout(() => setCardVisible(false), 400);
        }
        return next;
      });
    }, 1000);
  };

  if (!cardVisible) return null;

  return (
    <AnimatePresence>
      {cardVisible && (
        <motion.div
          className="rounded-2xl bg-white/60 border border-warm-dark/10 p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h3 className="text-sm font-semibold text-warm-dark/60 mb-1">
            这可能也是你
          </h3>
          <p className="text-xs text-warm-dark/40 mb-4">
            Me 根据你已有的碎片，猜了几个你可能没意识到的特质——
          </p>

          <div>
            <AnimatePresence>
              {traits.map((trait, i) => {
                const s = rowStatus[trait.id];
                if (s === 'removed') return null;

                const border =
                  i < traits.length - 1 ? 'border-b border-warm-dark/5' : '';

                return (
                  <motion.div
                    key={trait.id}
                    className={`py-3 ${border}`}
                    exit={{
                      opacity: 0,
                      height: 0,
                      paddingTop: 0,
                      paddingBottom: 0,
                      overflow: 'hidden',
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-warm-dark/70 leading-relaxed">
                        &ldquo;{trait.trait}&rdquo;
                      </span>

                      {s === 'confirmed' ? (
                        <motion.span
                          className="shrink-0 text-base text-warm-accent"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          ✓
                        </motion.span>
                      ) : s === 'denied' ? (
                        <span className="shrink-0 text-xs text-warm-dark/30">
                          已记录
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => answer(trait, true)}
                            className="px-3 py-1 rounded-lg bg-warm-accent/10 text-warm-accent text-xs font-medium hover:bg-warm-accent/20 transition-colors"
                          >
                            是
                          </button>
                          <button
                            onClick={() => answer(trait, false)}
                            className="px-3 py-1 rounded-lg bg-warm-dark/5 text-warm-dark/35 text-xs hover:bg-warm-dark/10 transition-colors"
                          >
                            不是
                          </button>
                        </div>
                      )}
                    </div>
                    {s === 'idle' && (
                      <p className="text-xs text-warm-dark/25 mt-1 ml-1">
                        {trait.reason}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <p className="text-xs text-warm-dark/25 mt-4">
            确认的会加入你的碎片池
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
