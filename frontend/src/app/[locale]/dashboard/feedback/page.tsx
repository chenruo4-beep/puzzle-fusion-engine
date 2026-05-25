'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch   } from '@/lib/api';
import { LightbulbIcon, BugIcon, ThoughtIcon } from '@/components/AppIcons';

interface FeedbackItem {
  id: number;
  category: string;
  content: string;
  contact: string | null;
  created_at: string;
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res = await authFetch('/api/feedback/');
      if (res.ok) setFeedbacks(await res.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  if (loading) {
    return <div className="text-center py-12 text-warm-dark/30">加载中...</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-warm-dark">用户反馈</h1>
        <p className="text-sm text-warm-dark/50 mt-1">
          {feedbacks.length === 0 ? '还没有收到反馈' : `共 ${feedbacks.length} 条反馈`}
        </p>
      </div>

      {feedbacks.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">📭</span>
          <p className="mt-4 text-warm-dark/40">还没有收到用户反馈</p>
          <p className="text-xs text-warm-dark/25 mt-1">
            右下角的 💬 按钮就是用户提反馈的入口
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <div
              key={fb.id}
              className="p-4 rounded-2xl bg-white border border-warm-dark/8"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    fb.category === '建议'
                      ? 'bg-blue-50 text-blue-600'
                      : fb.category === '问题'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-purple-50 text-purple-600'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {fb.category === '建议' ? <><LightbulbIcon size={12} /> 建议</> : fb.category === '问题' ? <><BugIcon size={12} /> 问题</> : <><ThoughtIcon size={12} /> 体验</>}
                  </span>
                </span>
                <span className="text-xs text-warm-dark/25">
                  {fb.created_at ? new Date(fb.created_at).toLocaleString('zh-CN') : ''}
                </span>
              </div>
              <p className="text-sm text-warm-dark/70 leading-relaxed whitespace-pre-wrap">
                {fb.content}
              </p>
              {fb.contact && (
                <div className="mt-2 text-xs text-warm-dark/35">
                  联系方式：{fb.contact}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
