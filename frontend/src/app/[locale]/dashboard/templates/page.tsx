'use client';

import { useState, useEffect } from 'react';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';

interface Template {
  id: number;
  name: string;
  description: string;
  prompts: string; // JSON string array, e.g. '["Q1?", "Q2?"]'
  created_at: string;
}


// ── Fallback templates when API returns empty ──
const FALLBACK_TEMPLATES: Template[] = [
  {
    id: -1,
    name: '每日反思',
    description: '回顾一天，提炼收获与改进点',
    prompts: '["今天最重要的三件事是什么？", "今天学到了什么新东西？", "有什么可以改进的地方？", "明天最想完成的一件事？"]',
    created_at: '',
  },
  {
    id: -2,
    name: '感恩日记',
    description: '培养感恩心态，发现生活中的美好',
    prompts: '["今天有什么让你感到感恩的事？", "谁让你的今天变得更好？", "你今天帮助了谁？", "此刻最想感谢的是什么？"]',
    created_at: '',
  },
  {
    id: -3,
    name: '问题解决',
    description: '结构化分析问题，找到突破口',
    prompts: '["你遇到了什么问题？", "问题的根本原因可能是什么？", "有哪些可能的解决方案？", "你会先尝试哪一个方案？"]',
    created_at: '',
  },
  {
    id: -4,
    name: '学习记录',
    description: '记录学习过程，加深理解',
    prompts: '["今天学习了什么主题？", "核心知识点有哪些？", "哪些地方还没有完全理解？", "如何应用到实际中？"]',
    created_at: '',
  },
  {
    id: -5,
    name: '目标回顾',
    description: '定期回顾目标，保持方向感',
    prompts: '["本周/本月的主要目标是什么？", "目前进展如何？（0-100%）", "遇到了什么阻碍？", "下一步行动是什么？"]',
    created_at: '',
  },
  {
    id: -6,
    name: '晚间复盘',
    description: '睡前梳理思绪，为明天做好准备',
    prompts: '["今天过得怎么样？用一个词形容。", "最难忘的瞬间是什么？", "有没有什么没完成的事？为什么？", "明天要怎么开始？"]',
    created_at: '',
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [successId, setSuccessId] = useState<number | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const res = await authFetch('/api/templates/');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setTemplates(data);
      } else {
        setTemplates(FALLBACK_TEMPLATES);
      }
    } catch {
      setTemplates(FALLBACK_TEMPLATES);
    } finally {
      setLoading(false);
    }
  }

  function parsePrompts(t: Template): string[] {
    try {
      const parsed = JSON.parse(t.prompts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function buildPlaceholder(t: Template): string {
    const prompts = parsePrompts(t);
    return prompts.map((q, i) => `${i + 1}. ${q}`).join('\n\n');
  }

  function handleUseTemplate(t: Template) {
    setExpandedId(null);
    setActiveId(t.id);
    setContent('');
    setSuccessId(null);
  }

  function collapseActive() {
    setActiveId(null);
    setContent('');
  }

  async function handleSave(t: Template) {
    if (!content.trim()) return;
    setSaving(true);
    try {
      // Phase 1: apply template (skip for fallback templates)
      if (t.id > 0) {
        await authFetch(`/api/templates/${t.id}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() }),
        });
      }

      // Phase 2: persist as journal
      const res = await authFetch('/api/journal/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          tags: t.name,
        }),
      });

      if (res.ok) {
        setSuccessId(t.id);
        setTimeout(() => {
          setActiveId(null);
          setContent('');
          setSuccessId(null);
        }, 1500);
      }
    } catch {
      // silently ignore
    } finally {
      setSaving(false);
    }
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton height="h-7" width="w-32" />
          <Skeleton height="h-4" width="w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold text-warm-dark">写作模板</h1>
        <p className="text-sm text-warm-dark/50 mt-1">
          选一个模板开始书写，让灵感自然流淌
        </p>
      </div>

      {/* 模板网格 – 最多 3 列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => {
          const prompts = parsePrompts(t);
          const isExpanded = expandedId === t.id;
          const isActive = activeId === t.id;
          const isSuccess = successId === t.id;

          return (
            <div
              key={t.id}
              className={[
                'rounded-2xl bg-white/80 border shadow-sm transition-all',
                isActive
                  ? 'border-warm-accent/30 ring-2 ring-warm-accent/10'
                  : 'border-warm-dark/10 hover:shadow-md',
              ].join(' ')}
            >
              {/* ── 卡片头部（始终显示）── */}
              <div
                className="p-5 cursor-pointer select-none"
                onClick={() => {
                  if (!isActive) setExpandedId(isExpanded ? null : t.id);
                }}
              >
                {/* 模板名标签 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-warm-accent/10 text-warm-accent font-medium">
                    {t.name}
                  </span>
                </div>

                {/* 描述 */}
                <p className="text-sm text-warm-dark/60 mb-3">{t.description}</p>

                {/* 第一个问题预览 */}
                {prompts.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-warm-dark/40">
                    <span className="flex-shrink-0">📋</span>
                    <span className="truncate">{prompts[0]}</span>
                    {prompts.length > 1 && (
                      <span className="text-warm-dark/25 flex-shrink-0">+{prompts.length - 1} 问</span>
                    )}
                  </div>
                )}
              </div>

              {/* ── 展开：全部问题 + 使用按钮 ── */}
              {isExpanded && !isActive && (
                <div className="px-5 pb-5 border-t border-warm-dark/5 pt-4 space-y-4">
                  <ul className="space-y-2">
                    {prompts.map((q, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-warm-dark/70"
                      >
                        <span className="text-warm-accent mt-0.5 flex-shrink-0">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(t);
                    }}
                    className="w-full py-2 bg-warm-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 transition-colors"
                  >
                    使用此模板
                  </button>
                </div>
              )}

              {/* ── 激活：填写区域 ── */}
              {isActive && (
                <div className="px-5 pb-5 border-t border-warm-dark/5 pt-4">
                  {isSuccess ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <span className="text-3xl mb-1">✅</span>
                      <span className="text-sm text-warm-accent font-medium">保存成功！</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* 引导问题 */}
                      <div>
                        <p className="text-xs text-warm-dark/40 mb-2">参考问题：</p>
                        <ul className="space-y-1">
                          {prompts.map((q, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-warm-dark/50"
                            >
                              <span className="text-warm-accent mt-0.5 flex-shrink-0">•</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 填写区 */}
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={buildPlaceholder(t)}
                        className="w-full h-36 p-3 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm text-warm-dark placeholder:text-warm-dark/30 resize-none focus:outline-none focus:border-warm-accent/40 transition-colors"
                        autoFocus
                      />

                      {/* 按钮区 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={collapseActive}
                          className="flex-1 py-2 rounded-xl text-sm text-warm-dark/50 hover:bg-warm-dark/5 transition-colors"
                        >
                          收起
                        </button>
                        <button
                          onClick={() => handleSave(t)}
                          disabled={!content.trim() || saving}
                          className="flex-1 py-2 bg-warm-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {saving ? '保存中...' : '保存'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 收拢态：底部小型使用入口 ── */}
              {!isExpanded && !isActive && (
                <div className="px-5 pb-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(t);
                    }}
                    className="w-full py-1.5 text-xs text-warm-accent hover:bg-warm-accent/5 rounded-lg transition-colors"
                  >
                    使用此模板
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部提示 */}
      <div className="rounded-2xl bg-gradient-to-r from-warm-accent/5 to-warm-accent/10 border border-warm-accent/10 p-4 text-center">
        <p className="text-sm text-warm-dark/50">
          📝 模板帮你快速开始，随心修改内容即可
        </p>
      </div>
    </div>
  );
}
import { authFetch  } from '@/lib/api';