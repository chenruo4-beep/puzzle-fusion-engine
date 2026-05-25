'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { SkeletonCard } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { authFetch } from '@/lib/api';

interface JournalEntry {
  id: number;
  user_id: number;
  content: string;
  tags: string | null;
  suggested_fragments: string | null;
  extracted_fragment_ids: string | null;
  auto_extracted_count: number;
  created_at: string;
}

interface Template {
  id: number;
  name: string;
  description: string;
  prompts: string;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  '技能': '#4a7c9b',
  '能力': '#5a7a5a',
  '爱好': '#b88a9e',
  '习惯': '#c49a6c',
  '知识': '#7a6a9b',
  '经历': '#b8a088',
  '资源': '#7a9b4a',
  '性格': '#9b6c4a',
};

const FALLBACK_TEMPLATES: Template[] = [
  {
    id: -1, name: '每日反思', description: '回顾一天，提炼收获与改进点',
    prompts: '["今天最重要的三件事是什么？", "今天学到了什么新东西？", "有什么可以改进的地方？", "明天最想完成的一件事？"]', created_at: '',
  },
  {
    id: -2, name: '感恩日记', description: '培养感恩心态，发现生活中的美好',
    prompts: '["今天有什么让你感到感恩的事？", "谁让你的今天变得更好？", "你今天帮助了谁？", "此刻最想感谢的是什么？"]', created_at: '',
  },
  {
    id: -3, name: '问题解决', description: '结构化分析问题，找到突破口',
    prompts: '["你遇到了什么问题？", "问题的根本原因可能是什么？", "有哪些可能的解决方案？", "你会先尝试哪一个方案？"]', created_at: '',
  },
  {
    id: -4, name: '学习记录', description: '记录学习过程，加深理解',
    prompts: '["今天学习了什么主题？", "核心知识点有哪些？", "哪些地方还没有完全理解？", "如何应用到实际中？"]', created_at: '',
  },
  {
    id: -5, name: '目标回顾', description: '定期回顾目标，保持方向感',
    prompts: '["本周/本月的主要目标是什么？", "目前进展如何？（0-100%）", "遇到了什么阻碍？", "下一步行动是什么？"]', created_at: '',
  },
  {
    id: -6, name: '晚间复盘', description: '睡前梳理思绪，为明天做好准备',
    prompts: '["今天过得怎么样？用一个词形容。", "最难忘的瞬间是什么？", "有没有什么没完成的事？为什么？", "明天要怎么开始？"]', created_at: '',
  },
];

type WriteMode = 'free' | 'template';

export default function JournalPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [writeMode, setWriteMode] = useState<WriteMode>('free');
  const formRef = useRef<HTMLDivElement>(null);

  // 自由写
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  // 模板写
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [templateContent, setTemplateContent] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSuccess, setTemplateSuccess] = useState(false);

  // 编辑
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // 删除
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // 碎片建议
  const [showSuggestionsId, setShowSuggestionsId] = useState<number | null>(null);
  const [, setConfirmingIds] = useState<Set<number>>(new Set());
  const [confirmSaving, setConfirmSaving] = useState(false);

  // 逐个确认碎片
  const [currentConfirmIndex, setCurrentConfirmIndex] = useState(0);
  const [confirmResults, setConfirmResults] = useState<Record<number, 'confirmed' | 'skipped'>>({});
  const [showConfirmDone, setShowConfirmDone] = useState(false);

  useEffect(() => {
    loadEntries();
    loadTemplates();
  }, []);

  async function loadEntries() {
    try {
      const res = await authFetch('/api/journal/?page=1&page_size=50');
      const data = await res.json();
      setEntries(data?.data?.items ?? (Array.isArray(data) ? data : []));
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    try {
      const res = await authFetch('/api/templates/');
      const data = await res.json();
      setTemplates(Array.isArray(data) && data.length > 0 ? data : FALLBACK_TEMPLATES);
    } catch {
      setTemplates(FALLBACK_TEMPLATES);
    }
  }

  function parsePrompts(t: Template): string[] {
    try {
      const parsed = JSON.parse(t.prompts);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function isWithin24h(iso: string): boolean {
    return (Date.now() - new Date(iso).getTime()) < 24 * 60 * 60 * 1000;
  }

  function formatRemaining(iso: string): string {
    const remaining = 24 * 60 * 60 * 1000 - (Date.now() - new Date(iso).getTime());
    if (remaining <= 0) return '已过期';
    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    return hours > 0 ? `剩余 ${hours} 小时` : `剩余 ${mins} 分钟`;
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  // ── 自由写保存 ──
  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/journal/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), tags: tags.trim() || null }),
      });
      if (res.ok) {
        setContent(''); setTags(''); setShowForm(false);
        setSaving(false);
        await loadEntries();
      }
    } catch { toast('保存失败', 'error'); } finally { setSaving(false); }
  }

  // ── 模板写保存 ──
  async function handleTemplateSave(t: Template) {
    if (!templateContent.trim()) return;
    setTemplateSaving(true);
    try {
      if (t.id > 0) {
        await authFetch(`/api/templates/${t.id}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: templateContent.trim() }),
        });
      }
      const res = await authFetch('/api/journal/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: templateContent.trim(), tags: t.name }),
      });
      if (res.ok) {
        setTemplateSuccess(true);
        setTimeout(() => {
          setShowForm(false);
          setActiveTemplate(null);
          setTemplateContent('');
          setTemplateSuccess(false);
          loadEntries();
        }, 1500);
      }
    } catch { toast('保存失败', 'error'); } finally { setTemplateSaving(false); }
  }

  // ── 编辑 ──
  function startEdit(entry: JournalEntry) {
    setEditingId(entry.id); setEditContent(entry.content); setEditTags(entry.tags || '');
  }
  function cancelEdit() { setEditingId(null); setEditContent(''); setEditTags(''); }

  async function handleSaveEdit(entryId: number) {
    if (!editContent.trim()) return;
    setEditSaving(true);
    try {
      const res = await authFetch(`/api/journal/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim(), tags: editTags.trim() || null }),
      });
      if (res.ok) { cancelEdit(); await loadEntries(); }
      else if (res.status === 403) { toast('超过24小时，无法修改', 'warning'); cancelEdit(); }
      else { toast('编辑失败', 'error'); }
    } catch { toast('编辑失败', 'error'); } finally { setEditSaving(false); }
  }

  // ── 删除 ──
  function startDelete(entryId: number) {
    setDeleteConfirmId(entryId);
  }
  function cancelDelete() {
    setDeleteConfirmId(null);
  }

  async function handleDelete(entryId: number) {
    setDeleteSaving(true);
    try {
      const res = await authFetch(`/api/journal/${entryId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast('删除成功', 'success');
        setDeleteConfirmId(null);
        await loadEntries();
      } else if (res.status === 403) {
        toast('超过24小时，无法删除', 'warning');
        setDeleteConfirmId(null);
      } else {
        toast('删除失败', 'error');
      }
    } catch { toast('删除失败', 'error'); } finally { setDeleteSaving(false); }
  }

  function openForm(mode: WriteMode) {
    setWriteMode(mode);
    setShowForm(true);
    setActiveTemplate(null);
    setTemplateContent('');
    setContent('');
    setTags('');
    setTemplateSuccess(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  // ── 碎片建议 ──
  function parseSuggestedFragments(entry: JournalEntry): { type: string; content: string }[] {
    if (!entry.suggested_fragments) return [];
    try {
      const parsed = JSON.parse(entry.suggested_fragments);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function getConfirmedIndices(): number[] {
    return Object.entries(confirmResults)
      .filter(([, v]) => v === 'confirmed')
      .map(([k]) => parseInt(k));
  }

  async function handleConfirmFragments(entry: JournalEntry) {
    const indices = getConfirmedIndices();
    if (indices.length === 0) {
      await handleDismissFragments(entry);
      return;
    }

    setConfirmSaving(true);
    try {
      const res = await authFetch(`/api/journal/${entry.id}/confirm-fragments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indices }),
      });
      if (res.ok) {
        setShowSuggestionsId(null);
        setConfirmingIds(new Set());
        setConfirmResults({});
        setCurrentConfirmIndex(0);
        setShowConfirmDone(false);
        await loadEntries();
      } else {
        toast('确认失败', 'error');
      }
    } catch { toast('确认失败', 'error'); } finally { setConfirmSaving(false); }
  }

  function startConfirmOneByOne(entry: JournalEntry) {
    setShowSuggestionsId(entry.id);
    setCurrentConfirmIndex(0);
    setConfirmResults({});
    setShowConfirmDone(false);
  }

  function handleConfirmCurrent(entry: JournalEntry) {
    const frags = parseSuggestedFragments(entry);
    setConfirmResults(prev => ({ ...prev, [currentConfirmIndex]: 'confirmed' }));
    if (currentConfirmIndex < frags.length - 1) {
      setCurrentConfirmIndex(prev => prev + 1);
    } else {
      setShowConfirmDone(true);
    }
  }

  function handleSkipCurrent(entry: JournalEntry) {
    const frags = parseSuggestedFragments(entry);
    setConfirmResults(prev => ({ ...prev, [currentConfirmIndex]: 'skipped' }));
    if (currentConfirmIndex < frags.length - 1) {
      setCurrentConfirmIndex(prev => prev + 1);
    } else {
      setShowConfirmDone(true);
    }
  }

  function handleConfirmAllRemaining(entry: JournalEntry) {
    const frags = parseSuggestedFragments(entry);
    const next = { ...confirmResults };
    for (let i = currentConfirmIndex; i < frags.length; i++) {
      if (next[i] === undefined) next[i] = 'confirmed';
    }
    setConfirmResults(next);
    setShowConfirmDone(true);
  }

  function handleSkipAllRemaining(entry: JournalEntry) {
    const frags = parseSuggestedFragments(entry);
    const next = { ...confirmResults };
    for (let i = currentConfirmIndex; i < frags.length; i++) {
      if (next[i] === undefined) next[i] = 'skipped';
    }
    setConfirmResults(next);
    setShowConfirmDone(true);
  }

  async function handleDismissFragments(entry: JournalEntry) {
    try {
      await authFetch(`/api/journal/${entry.id}/dismiss-fragments`, { method: 'POST' });
      setShowSuggestionsId(null);
      setConfirmingIds(new Set());
      await loadEntries();
    } catch { /* silent */ }
  }

  useKeyboardShortcut({ onCtrlEnter: handleSave });

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-dark dark:text-dark-text">
            随手记
            {!loading && entries.length > 0 && (
              <span className="ml-2 text-base font-normal text-warm-dark/40 dark:text-dark-text/40">{entries.length} 篇</span>
            )}
          </h1>
          <p className="text-sm text-warm-dark/50 dark:text-dark-text/50 mt-1">不用组织语言，想到就写。</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openForm('free')}
            className="px-4 py-2 bg-warm-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 transition-colors"
          >
            ✍️ 自由写
          </button>
          <button
            onClick={() => openForm('template')}
            className="px-4 py-2 bg-white/80 dark:bg-dark-surface border border-warm-accent/30 text-warm-accent rounded-xl text-sm font-medium hover:bg-warm-accent/10 transition-colors"
          >
            📋 用模板
          </button>
        </div>
      </div>

      {/* 写日记表单 */}
      {showForm && (
        <div ref={formRef} className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5 space-y-4">
          {/* Tab 切换 */}
          <div className="flex gap-1 p-1 bg-warm-dark/5 dark:bg-dark-border/50 rounded-xl">
            <button
              onClick={() => { setWriteMode('free'); setActiveTemplate(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                writeMode === 'free' ? 'bg-white dark:bg-dark-surface text-warm-dark dark:text-dark-text shadow-sm' : 'text-warm-dark/50 dark:text-dark-text/50 hover:text-warm-dark/70 dark:hover:text-dark-text/70'
              }`}
            >
              ✍️ 自由写
            </button>
            <button
              onClick={() => setWriteMode('template')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                writeMode === 'template' ? 'bg-white dark:bg-dark-surface text-warm-dark dark:text-dark-text shadow-sm' : 'text-warm-dark/50 dark:text-dark-text/50 hover:text-warm-dark/70 dark:hover:text-dark-text/70'
              }`}
            >
              📋 用模板
            </button>
          </div>

          {/* 收起按钮 */}
          <button
            onClick={() => setShowForm(false)}
            className="text-xs text-warm-dark/40 dark:text-dark-text/40 hover:text-warm-dark/60 dark:hover:text-dark-text/60 transition-colors"
          >
            ✕ 收起
          </button>

          {/* ── 自由写模式 ── */}
          {writeMode === 'free' && (
            <div className="space-y-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="比如：今天帮同事改了一个标题，我自己也不知道为什么能想到……"
                className="w-full h-32 p-3 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm text-warm-dark placeholder:text-warm-dark/30 resize-none focus:outline-none focus:border-warm-accent/40 transition-colors"
                autoFocus
              />
              <div className="flex items-center gap-3">
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="标签，用逗号分隔（可选）"
                  className="flex-1 px-3 py-2 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm text-warm-dark placeholder:text-warm-dark/30 focus:outline-none focus:border-warm-accent/40 transition-colors"
                />
                <button
                  onClick={handleSave}
                  disabled={!content.trim() || saving}
                  className="px-5 py-2 bg-warm-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? '记下来...' : '记下来'}
                </button>
              </div>
            </div>
          )}

          {/* ── 模板写模式 ── */}
          {writeMode === 'template' && !activeTemplate && (
            <div className="space-y-3">
              <p className="text-xs text-warm-dark/40 dark:text-dark-text/40">选择一个模板开始：</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {templates.map((t) => {
                  const prompts = parsePrompts(t);
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setActiveTemplate(t); setTemplateContent(''); setTemplateSuccess(false); }}
                      className="text-left p-3 rounded-xl border border-warm-dark/10 dark:border-dark-border bg-white/60 dark:bg-dark-surface hover:border-warm-accent/30 hover:bg-warm-accent/5 transition-all"
                    >
                      <span className="text-xs px-2 py-0.5 rounded-full bg-warm-accent/10 text-warm-accent font-medium">
                        {t.name}
                      </span>
                      <p className="text-xs text-warm-dark/50 dark:text-dark-text/50 mt-1.5 line-clamp-2">{t.description}</p>
                      {prompts.length > 0 && (
                        <p className="text-xs text-warm-dark/30 dark:text-dark-text/30 mt-1">{prompts.length} 个引导问题</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {writeMode === 'template' && activeTemplate && templateSuccess && (
            <div className="flex flex-col items-center justify-center py-8">
              <span className="text-3xl mb-1">✅</span>
              <span className="text-sm text-warm-accent font-medium">记下来了</span>
            </div>
          )}

          {writeMode === 'template' && activeTemplate && !templateSuccess && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-warm-accent/10 text-warm-accent font-medium">
                  {activeTemplate.name}
                </span>
                <button
                  onClick={() => setActiveTemplate(null)}
                  className="text-xs text-warm-dark/40 dark:text-dark-text/40 hover:text-warm-dark/60 dark:hover:text-dark-text/60 transition-colors"
                >
                  换一个
                </button>
              </div>
              <div className="rounded-xl bg-warm-accent/5 border border-warm-accent/10 p-3">
                <p className="text-xs text-warm-dark/40 dark:text-dark-text/40 mb-2">引导问题：</p>
                <ul className="space-y-1">
                  {parsePrompts(activeTemplate).map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-warm-dark/60 dark:text-dark-text/60">
                      <span className="text-warm-accent mt-0.5 flex-shrink-0">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <textarea
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder={parsePrompts(activeTemplate).map((q, i) => `${i + 1}. ${q}`).join('\n\n')}
                className="w-full h-36 p-3 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm text-warm-dark placeholder:text-warm-dark/30 resize-none focus:outline-none focus:border-warm-accent/40 transition-colors"
                autoFocus
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setActiveTemplate(null)}
                  className="px-4 py-2 text-sm text-warm-dark/50 dark:text-dark-text/50 hover:bg-warm-dark/5 dark:hover:bg-dark-border/50 rounded-xl transition-colors"
                >
                  返回模板列表
                </button>
                <button
                  onClick={() => handleTemplateSave(activeTemplate)}
                  disabled={!templateContent.trim() || templateSaving}
                  className="px-5 py-2 bg-warm-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {templateSaving ? '记下来...' : '记下来'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 日记列表 */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="📔"
          title="今天有什么事，让你觉得'这就是我'？"
          description="或者'这绝对不是我'？不用组织语言。"
          action={{ label: '试试看', onClick: () => openForm('free') }}
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isEditing = editingId === entry.id;
            return (
              <div key={entry.id} className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5 transition-all hover:shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-warm-dark/40 dark:text-dark-text/40">{formatDate(entry.created_at)}</span>
                  {entry.tags && entry.tags.split(',').map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-warm-accent/10 text-warm-accent">{tag.trim()}</span>
                  ))}
                  {/* 碎片建议指示器 — 仅显示手动建议（自动提取的不再显示） */}
                  {parseSuggestedFragments(entry).length > 0 && entry.auto_extracted_count === 0 && (
                    <button
                      onClick={() => {
                        if (showSuggestionsId === entry.id) {
                          setShowSuggestionsId(null);
                        } else {
                          startConfirmOneByOne(entry);
                        }
                      }}
                      className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-xs font-medium animate-pulse hover:bg-amber-200 transition-colors"
                    >
                      💡 发现 {parseSuggestedFragments(entry).length} 个碎片
                    </button>
                  )}
                  {!isEditing && isWithin24h(entry.created_at) && !parseSuggestedFragments(entry).length && (
                    <span className="text-xs text-warm-dark/30 dark:text-dark-text/30 ml-auto">⏱ {formatRemaining(entry.created_at)}</span>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-28 p-3 rounded-xl border border-warm-accent/30 bg-warm-light/50 text-sm text-warm-dark resize-none focus:outline-none focus:border-warm-accent transition-colors"
                      autoFocus
                    />
                    <input
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="标签，用逗号分隔（可选）"
                      className="w-full px-3 py-2 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm text-warm-dark placeholder:text-warm-dark/30 focus:outline-none focus:border-warm-accent/40 transition-colors"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={cancelEdit} className="px-3 py-1.5 text-xs text-warm-dark/50 dark:text-dark-text/50 hover:bg-warm-dark/5 dark:hover:bg-dark-border/50 rounded-lg transition-colors">取消</button>
                      <button onClick={() => handleSaveEdit(entry.id)} disabled={!editContent.trim() || editSaving} className="px-4 py-1.5 bg-warm-accent text-white rounded-lg text-xs font-medium hover:bg-warm-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        {editSaving ? '保存中...' : '保存修改'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-warm-dark/80 dark:text-dark-text/80 leading-relaxed whitespace-pre-wrap">
                      {expandedId === entry.id ? entry.content : entry.content.length > 150 ? entry.content.slice(0, 150) + '...' : entry.content}
                    </div>

                    {/* 碎片建议 — 逐个确认面板 */}
                    {showSuggestionsId === entry.id && (
                      <div className="mt-3 rounded-xl bg-amber-50/80 dark:bg-dark-surface border border-amber-200/50 dark:border-dark-border p-4 space-y-4">
                        {/* 头部 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-amber-700">🧩 AI 发现了碎片</span>
                            <span className="text-xs text-amber-500/70">
                              ({currentConfirmIndex + 1 > parseSuggestedFragments(entry).length ? parseSuggestedFragments(entry).length : currentConfirmIndex + 1} / {parseSuggestedFragments(entry).length})
                            </span>
                          </div>
                          <button
                            onClick={() => { setShowSuggestionsId(null); setConfirmingIds(new Set()); setConfirmResults({}); setCurrentConfirmIndex(0); setShowConfirmDone(false); }}
                            className="text-xs text-warm-dark/40 dark:text-dark-text/40 hover:text-warm-dark/60 dark:hover:text-dark-text/60"
                          >✕</button>
                        </div>

                        {/* 进度条 */}
                        <div className="w-full h-1.5 bg-amber-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-300"
                            style={{ width: `${((currentConfirmIndex) / Math.max(parseSuggestedFragments(entry).length, 1)) * 100}%` }}
                          />
                        </div>

                        {/* 完成状态 */}
                        {showConfirmDone ? (
                          <div className="text-center space-y-3 py-2">
                            <div className="text-2xl">🎉</div>
                            <p className="text-sm text-warm-dark/70">
                              已处理 {parseSuggestedFragments(entry).length} 个碎片
                              <span className="ml-1 text-amber-600 font-medium">
                                ({getConfirmedIndices().length} 个确认入库)
                              </span>
                            </p>
                            <div className="flex items-center gap-2 justify-center">
                              <button
                                onClick={() => { setShowConfirmDone(false); setCurrentConfirmIndex(0); setConfirmResults({}); }}
                                className="px-3 py-1.5 text-xs text-warm-dark/50 hover:bg-warm-dark/5 rounded-lg transition-colors"
                              >
                                重新查看
                              </button>
                              <button
                                onClick={() => handleConfirmFragments(entry)}
                                disabled={confirmSaving}
                                className="px-4 py-1.5 bg-warm-accent text-white rounded-lg text-xs font-medium hover:bg-warm-accent/90 disabled:opacity-40 transition-colors"
                              >
                                {confirmSaving ? '保存中...' : `确认入库 (${getConfirmedIndices().length})`}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* 当前碎片卡片 */}
                            {(() => {
                              const frags = parseSuggestedFragments(entry);
                              const frag = frags[currentConfirmIndex];
                              if (!frag) return null;
                              return (
                                <div className="rounded-xl bg-white dark:bg-dark-bg border border-amber-200/60 dark:border-dark-border p-4 space-y-3">
                                  {/* 类型标签 */}
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="text-xs px-2.5 py-1 rounded-full text-white font-medium"
                                      style={{ backgroundColor: TYPE_COLORS[frag.type] || '#b8a088' }}
                                    >
                                      {frag.type}
                                    </span>
                                    <span className="text-xs text-warm-dark/30 dark:text-dark-text/30">AI 建议的碎片</span>
                                  </div>
                                  {/* 内容 */}
                                  <p className="text-sm text-warm-dark/80 dark:text-dark-text/80 leading-relaxed">{frag.content}</p>
                                  {/* 操作按钮 */}
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      onClick={() => handleSkipCurrent(entry)}
                                      className="flex-1 px-4 py-2 text-sm text-warm-dark/50 hover:text-warm-dark/70 hover:bg-warm-dark/5 rounded-xl transition-colors flex items-center justify-center gap-1"
                                    >
                                      <span>⏭</span> 跳过
                                    </button>
                                    <button
                                      onClick={() => handleConfirmCurrent(entry)}
                                      className="flex-1 px-4 py-2 bg-warm-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <span>✅</span> 确认入库
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 快捷操作 */}
                            <div className="flex items-center gap-2 justify-center">
                              <button
                                onClick={() => handleSkipAllRemaining(entry)}
                                className="text-xs text-warm-dark/30 hover:text-warm-dark/50 px-2 py-1 rounded hover:bg-warm-dark/5 transition-colors"
                              >
                                全部跳过
                              </button>
                              <span className="text-warm-dark/10">|</span>
                              <button
                                onClick={() => handleConfirmAllRemaining(entry)}
                                className="text-xs text-warm-dark/30 hover:text-warm-dark/50 px-2 py-1 rounded hover:bg-warm-dark/5 transition-colors"
                              >
                                全部确认
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-warm-dark/5">
                      {entry.content.length > 150 && (
                        <button onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)} className="text-xs text-warm-accent hover:underline">
                          {expandedId === entry.id ? '收起' : '展开全文'}
                        </button>
                      )}
                      {isWithin24h(entry.created_at) && (
                        <button onClick={() => startEdit(entry)} className="text-xs text-warm-accent hover:underline">✏️ 编辑</button>
                      )}
                      {isWithin24h(entry.created_at) && (
                        <button onClick={() => startDelete(entry.id)} className="text-xs text-rose-400 hover:text-rose-600 hover:underline">🗑️ 删除</button>
                      )}
                      {entry.extracted_fragment_ids ? (
                        <Link href="/dashboard/fragments" className="text-xs text-warm-dark/50 hover:text-warm-accent transition-colors">
                          🧩 已提取 {JSON.parse(entry.extracted_fragment_ids).length || 0} 个碎片
                          {entry.auto_extracted_count > 0 && <span className="ml-1 text-emerald-500">(AI自动)</span>}
                        </Link>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-warm-accent/5 to-warm-accent/10 border border-warm-accent/10 p-4 text-center">
          <p className="text-sm text-warm-dark/50">📝 24小时内可以修改，过了这个时间，就是你的一部分了</p>
        </div>
      )}

      {/* 删除确认对话框 */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="text-center">
              <div className="text-3xl mb-2">🗑️</div>
              <h3 className="text-lg font-bold text-warm-dark">确认删除？</h3>
              <p className="text-sm text-warm-dark/60 mt-2">
                删除后无法恢复，关联的自动提取碎片也会被删除。
              </p>
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ 超过24小时的日记无法删除
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 py-2.5 bg-warm-dark/5 text-warm-dark/60 rounded-xl text-sm font-medium hover:bg-warm-dark/10 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleteSaving}
                className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 disabled:opacity-50 transition-colors"
              >
                {deleteSaving ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
