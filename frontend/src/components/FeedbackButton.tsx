'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch  } from '@/lib/api';
import { FeedbackIcon, LightbulbIcon, BugIcon, ThoughtIcon } from '@/components/AppIcons';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('建议');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await authFetch('/api/feedback/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content: content.trim(), contact: contact.trim() || null }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => { setOpen(false); setSubmitted(false); setContent(''); setContact(''); }, 2000);
      }
    } catch { /* silent */ } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-warm-accent/90 text-white shadow-lg hover:bg-warm-accent hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        title="反馈建议"
      >
        <FeedbackIcon size={22} />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full sm:max-w-md mx-4 mb-0 sm:mb-0 p-6 rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {submitted ? (
                <div className="text-center py-8">
                  <span className="text-4xl">🙏</span>
                  <p className="mt-3 text-warm-dark font-medium">收到你的反馈了，谢谢！</p>
                  <p className="text-xs text-warm-dark/40 mt-1">你的声音会帮助Me变得更好</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-warm-dark">和制作者聊聊</h3>
                    <button onClick={() => setOpen(false)} className="text-warm-dark/30 hover:text-warm-dark/60 text-lg">✕</button>
                  </div>

                  <p className="text-xs text-warm-dark/40 mb-4">
                    发现 bug、有优化建议、或想聊聊你的使用感受，都可以告诉我。
                  </p>

                  {/* Category */}
                  <div className="flex gap-2 mb-4">
                    {['建议', '问题', '使用体验'].map(c => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                          category === c
                            ? 'bg-warm-accent text-white'
                            : 'bg-warm-dark/5 text-warm-dark/40 hover:bg-warm-dark/10'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {c === '建议' ? <><LightbulbIcon size={14} /> 建议</> : c === '问题' ? <><BugIcon size={14} /> 问题</> : <><ThoughtIcon size={14} /> 使用体验</>}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Content */}
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="说说你的想法…"
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-warm-light/60 border border-warm-dark/10 text-sm text-warm-dark placeholder-warm-dark/30 resize-none mb-3"
                  />

                  {/* Contact */}
                  <input
                    type="text"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder="联系方式（选填，方便我回复你）"
                    className="w-full px-4 py-2.5 rounded-xl bg-warm-light/60 border border-warm-dark/10 text-sm text-warm-dark placeholder-warm-dark/30 mb-4"
                  />

                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || sending}
                    className="w-full py-2.5 rounded-xl bg-warm-accent text-white text-sm font-medium hover:bg-warm-accent/90 transition-all disabled:opacity-40"
                  >
                    {sending ? '发送中…' : '发送'}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
