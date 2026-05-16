'use client';

import { useState, useEffect, useCallback } from 'react';
import PuzzleBoard from '@/components/PuzzleBoard';
import { useToast } from '@/components/Toast';
import { SkeletonCard, SkeletonHeader } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import SmartBundleRecommend from '@/components/SmartBundleRecommend';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

const API_BASE = 'http://localhost:8000';

interface Fragment {
  id: number;
  user_id: number;
  journal_id: number | null;
  fragment_type: string;
  content: string;
  tags: string | null;
  created_at: string;
}

interface FragmentForm {
  fragment_type: string;
  content: string;
  tags: string;
}

interface BatchPreviewItem {
  type: string;
  content: string;
  selected: boolean;
}

const FRAGMENT_TYPES = ['技能', '经历', '习惯', '知识', '资源', '能力'];

const TYPE_COLORS: Record<string, string> = {
  '技能': '#4a7c9b',
  '经历': '#5a7a5a',
  '习惯': '#c49a6c',
  '知识': '#7a6a9b',
  '资源': '#7a9b4a',
  '能力': '#b8a088',
};

const EMPTY_FORM: FragmentForm = {
  fragment_type: '技能',
  content: '',
  tags: '',
};

export default function FragmentsPage() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FragmentForm>(EMPTY_FORM);
  const [filterType, setFilterType] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchPreview, setBatchPreview] = useState<BatchPreviewItem[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [dedupeOpen, setDedupeOpen] = useState(false);
  const [dedupeResults, setDedupeResults] = useState<Fragment[][]>([]);
  const [dedupeIndex, setDedupeIndex] = useState(0);
  const [dedupeKeep, setDedupeKeep] = useState<number | null>(null);
  const [dedupeDeleting, setDedupeDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const { toast } = useToast();

  const fetchFragments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/fragments/?archived_filter=0`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Fragment[] = await res.json();
      setFragments(data);
    } catch (err) {
      console.error('Failed to fetch fragments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFragments();
  }, [fetchFragments]);

  const handleSubmit = async () => {
    if (!form.content.trim()) return;
    try {
      const url = editingId
        ? `${API_BASE}/api/fragments/${editingId}`
        : `${API_BASE}/api/fragments/`;
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId
        ? { ...form, tags: form.tags || null }
        : { ...form, tags: form.tags || null };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`保存失败 (${res.status})`);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await fetchFragments();
    } catch (err) {
      toast('保存失败：' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  };

  const handleEdit = (f: Fragment) => {
    setForm({
      fragment_type: f.fragment_type,
      content: f.content,
      tags: f.tags || '',
    });
    setEditingId(f.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这个碎片？')) return;
    try {
      const res = await fetch(`${API_BASE}/api/fragments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`删除失败 (${res.status})`);
      await fetchFragments();
    } catch (err) {
      toast('删除失败：' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  };

  const handleBatchAnalyze = async () => {
    if (batchText.trim().length < 20) {
      toast('请输入至少20个字符', 'warning');
      return;
    }
    setBatchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/fragments/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: batchText.trim() }),
      });
      if (!res.ok) throw new Error(`AI分析失败 (${res.status})`);
      const data: { type: string; content: string }[] = await res.json();
      setBatchPreview(data.map(d => ({ ...d, selected: true })));
    } catch (err) {
      toast('AI分析失败：' + (err instanceof Error ? err.message : '未知错误'), 'error');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchSave = async () => {
    const selected = batchPreview.filter(i => i.selected);
    if (selected.length === 0) {
      toast('请至少选择一条碎片', 'warning');
      return;
    }
    setBatchSaving(true);
    try {
      for (const item of selected) {
        await fetch(`${API_BASE}/api/fragments/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fragment_type: item.type,
            content: item.content,
          }),
        });
      }
      setBatchOpen(false);
      setBatchText('');
      setBatchPreview([]);
      await fetchFragments();
    } catch (err) {
      toast('批量保存失败：' + (err instanceof Error ? err.message : '未知错误'), 'error');
    } finally {
      setBatchSaving(false);
    }
  };

  const toggleBatchItem = (index: number) => {
    setBatchPreview(prev => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  };

  const selectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: true })));
  const deselectAllBatch = () => setBatchPreview(prev => prev.map(item => ({ ...item, selected: false })));

  const startDedupe = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/fragments/deduplicate`, { method: 'POST' });
      if (!res.ok) throw new Error(`去重扫描失败 (${res.status})`);
      const data = await res.json();
      setDedupeResults(data);
      setDedupeIndex(0);
      setDedupeKeep(null);
      setDedupeOpen(true);
    } catch (err) {
      toast('去重扫描失败：' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  };

  const handleDedupeDelete = async (idToDelete: number) => {
    setDedupeDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/fragments/${idToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`删除失败 (${res.status})`);
      const newResults = dedupeResults.filter((_, i) => i !== dedupeIndex);
      if (newResults.length === 0) {
        setDedupeOpen(false);
        await fetchFragments();
        return;
      }
      if (dedupeIndex >= newResults.length) {
        setDedupeIndex(newResults.length - 1);
      }
      setDedupeResults(newResults);
      setDedupeKeep(null);
    } catch (err) {
      toast('删除失败：' + (err instanceof Error ? err.message : '未知错误'), 'error');
    } finally {
      setDedupeDeleting(false);
    }
  };

  useKeyboardShortcut({ onCtrlEnter: handleSubmit, onEsc: () => setShowForm(false) });

  // ── Early return for loading ─────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // ── Filtering ────────────────────────────────────────────────────
  const filtered = fragments.filter(f => {
    const matchType = filterType === '全部' || f.fragment_type === filterType;
    const matchSearch = !searchQuery || f.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  // ── Main UI ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            能力碎片
            {fragments.length > 0 && (
              <span className="ml-2 text-sm font-normal text-warm-dark/50">
                ({fragments.length})
              </span>
            )}
          </h1>
          <p className="text-warm-dark/60 text-sm mt-1">
            管理你的拼图片库，添加、编辑或删除拼图片
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => { setBatchOpen(true); setBatchText(''); setBatchPreview([]); }}
            className="px-4 py-2 rounded-xl border border-warm-dark/10 text-sm text-warm-dark/60 hover:bg-warm-dark/5 transition-all"
          >
            📦 批量导入
          </button>
          <button
            onClick={startDedupe}
            className="px-4 py-2 rounded-xl border border-amber-200 text-sm text-amber-600 hover:bg-amber-50 transition-all"
          >
            🔍 去重
          </button>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
            className="px-4 py-2 rounded-xl bg-warm-accent text-white text-sm font-medium hover:bg-warm-accent/90 transition-all"
          >
            ＋ 添加拼图片
          </button>
        </div>
      </div>

      {/* ── Smart Bundle Recommendations ─────────────────────── */}
      <SmartBundleRecommend />

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === 'list'
              ? 'bg-warm-accent text-white'
              : 'bg-white/60 text-warm-dark/50 hover:bg-white/80'
          }`}
        >
          📋 列表视图
        </button>
        <button
          onClick={() => setViewMode('board')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === 'board'
              ? 'bg-warm-accent text-white'
              : 'bg-white/60 text-warm-dark/50 hover:bg-white/80'
          }`}
        >
          🧩 拼图板
        </button>
      </div>

      {/* ── View Content ─────────────────────────────────────── */}
      {viewMode === 'board' ? (
        <PuzzleBoard />
      ) : (
        <>
          {/* ── Notice ─────────────────────────────────────────────── */}
          {/* ── Stats Bar ──────────────────────────────────────────── */}
          {fragments.length > 0 && (
            <>
              <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-white/50 border border-warm-dark/5 text-xs">
                <span className="text-warm-dark/50">拼图片库：</span>
                <span className="font-bold text-warm-accent">{fragments.length} 个</span>
              </div>

              {/* ── Filter + Search ───────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-2">
                {['全部', ...FRAGMENT_TYPES].map(ft => (
                  <button
                    key={ft}
                    onClick={() => setFilterType(ft)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      filterType === ft
                        ? 'bg-warm-accent text-white'
                        : 'bg-white/60 text-warm-dark/50 hover:bg-white/80'
                    }`}
                  >
                    {ft}
                  </button>
                ))}
                <div className="relative ml-auto">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="搜索碎片内容…"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/80 border border-warm-dark/10 text-sm text-warm-dark placeholder-warm-dark/30"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-dark/30 text-sm">🔍</span>
                </div>
              </div>
            </>
          )}

          {/* ── Fragment List ─────────────────────────────────────── */}
          {filtered.length === 0 ? (
            fragments.length === 0 ? (
              <EmptyState
                icon="🧩"
                title="从这里开始"
                description="拼图不需要一开始就完整。慢慢来，从第一块拼图片开始。"
                action={{ label: '添加第一块拼图片', onClick: () => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); } }}
              />
            ) : (
              <EmptyState
                icon="🔍"
                title="换个角度看看"
                description="有时候看不见，不代表不存在。换种方式寻找，也许它就在那里。"
                action={{ label: '清除筛选', onClick: () => { setSearchQuery(''); setFilterType('全部'); } }}
              />
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((f, idx) => {
                const typeColor = TYPE_COLORS[f.fragment_type] || '#b8a088';
                const shapes = ['tab-top', 'tab-bottom', 'tab-left', 'tab-right'];
                const shape = shapes[idx % 4];
                return (
                  <div
                    key={f.id}
                    data-card-id={f.id}
                    data-shape={shape}
                    className="relative group p-4 puzzle-card bg-white/65 backdrop-blur-sm border border-warm-dark/8"
                  >
                    {/* ── 左侧类型色条 (::before) ── */}
                    <style>{`.puzzle-card[data-card-id="${f.id}"]::before { background: ${typeColor}; }`}</style>

                    {/* Actions (visible on hover) */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(f)} className="text-warm-dark/30 hover:text-warm-dark/60 text-xs">✎</button>
                      <button onClick={() => handleDelete(f.id)} className="text-warm-dark/30 hover:text-rose-500 text-xs">✕</button>
                    </div>

                    {/* Type badge */}
                    <div className="flex items-center gap-2 mb-2 ml-1">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs puzzle-type-badge text-white shadow-sm"
                        style={{ backgroundColor: typeColor }}
                      >
                        {f.fragment_type}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-warm-dark/80 leading-relaxed whitespace-pre-wrap break-words ml-1">
                      {f.content}
                    </p>

                    {/* Actions (visible on hover) */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(f)} className="text-warm-dark/30 hover:text-warm-dark/60 text-xs">✎</button>
                      <button onClick={() => handleDelete(f.id)} className="text-warm-dark/30 hover:text-rose-500 text-xs">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Add/Edit Modal ───────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 p-6 rounded-3xl bg-white/90 backdrop-blur-sm shadow-2xl">
            <h2 className="text-lg font-bold mb-4">{editingId ? '编辑碎片' : '添加碎片'}</h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {FRAGMENT_TYPES.map(ft => (
                  <button
                    key={ft}
                    onClick={() => setForm(prev => ({ ...prev, fragment_type: ft }))}
                    className={`px-3 py-1 rounded-full text-xs transition-all ${
                      form.fragment_type === ft
                        ? 'text-white'
                        : 'bg-warm-dark/5 text-warm-dark/50 hover:bg-warm-dark/10'
                    }`}
                    style={form.fragment_type === ft ? { backgroundColor: TYPE_COLORS[ft] } : {}}
                  >
                    {ft}
                  </button>
                ))}
              </div>
              <textarea
                value={form.content}
                onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="碎片内容…"
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/80 border border-warm-dark/10 text-sm text-warm-dark placeholder-warm-dark/30 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-warm-dark/10 text-sm text-warm-dark/60 hover:bg-warm-dark/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.content.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-warm-accent text-white text-sm font-medium hover:bg-warm-accent/90 transition-all disabled:opacity-40"
              >
                {editingId ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch Import Modal ────────────────────────────────── */}
      {batchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 p-6 rounded-3xl bg-white/90 backdrop-blur-sm shadow-2xl">
            <h2 className="text-lg font-bold mb-4">📦 批量导入碎片</h2>
            {batchPreview.length === 0 ? (
              <>
                <textarea
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  placeholder="粘贴你的日记、笔记或想法…（AI 会自动按语义拆分成碎片）"
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl bg-white/80 border border-warm-dark/10 text-sm text-warm-dark placeholder-warm-dark/30 resize-none"
                />
                <button
                  onClick={handleBatchAnalyze}
                  disabled={batchLoading || batchText.trim().length < 20}
                  className="mt-4 w-full px-4 py-2.5 rounded-xl bg-warm-accent text-white text-sm font-medium hover:bg-warm-accent/90 transition-all disabled:opacity-40"
                >
                  {batchLoading ? 'AI 分析中…' : '🪄 AI 智能拆分'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-warm-dark/60 mb-3">AI 拆分结果（{batchPreview.length} 条）：</p>
                <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                  {batchPreview.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-xl bg-white/60">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleBatchItem(i)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs text-white"
                          style={{ backgroundColor: TYPE_COLORS[item.type] || '#b8a088' }}
                        >
                          {item.type}
                        </span>
                        <p className="text-xs text-warm-dark/70 mt-1">{item.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mb-4">
                  <button onClick={selectAllBatch} className="text-xs text-warm-accent hover:underline">全选</button>
                  <button onClick={deselectAllBatch} className="text-xs text-warm-dark/40 hover:underline">取消全选</button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setBatchPreview([]); setBatchText(''); }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-warm-dark/10 text-sm"
                  >
                    返回修改
                  </button>
                  <button
                    onClick={handleBatchSave}
                    disabled={batchSaving}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-warm-accent text-white text-sm font-medium hover:bg-warm-accent/90 transition-all disabled:opacity-40"
                  >
                    {batchSaving ? '保存中…' : `保存 (${batchPreview.filter(i => i.selected).length} 条)`}
                  </button>
                </div>
              </>
            )}
            <button
              onClick={() => { setBatchOpen(false); setBatchText(''); setBatchPreview([]); }}
              className="absolute top-4 right-4 text-warm-dark/30 hover:text-warm-dark/60"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Dedupe Modal ─────────────────────────────────────── */}
      {dedupeOpen && dedupeResults.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 p-6 rounded-3xl bg-white/90 backdrop-blur-sm shadow-2xl">
            <h2 className="text-lg font-bold mb-2">🔍 去重结果</h2>
            <p className="text-sm text-warm-dark/60 mb-4">
              发现 {dedupeResults.length} 对相似碎片，正在处理第 {dedupeIndex + 1} 对
            </p>
            {(() => {
              const pair = dedupeResults[dedupeIndex];
              return (
                <div className="space-y-3">
                  {pair.map((f: Fragment) => {
                    return (
                      <div
                        key={f.id}
                        className={`p-3 rounded-xl border transition-all cursor-pointer puzzle-card ${
                          dedupeKeep === f.id
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-warm-dark/10 bg-white/60 hover:border-warm-dark/20'
                        }`}
                        onClick={() => setDedupeKeep(f.id)}
                      >
                        <div className="flex items-center gap-2 mb-1 ml-1">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs text-white puzzle-type-badge"
                            style={{ backgroundColor: TYPE_COLORS[f.fragment_type] || '#b8a088' }}
                          >
                            {f.fragment_type}
                          </span>
                        </div>
                        <p className="text-xs text-warm-dark/70 ml-1">{f.content}</p>
                      </div>
                    );
                  })}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        if (dedupeIndex >= dedupeResults.length - 1) {
                          setDedupeOpen(false);
                          fetchFragments();
                          return;
                        }
                        setDedupeIndex(prev => prev + 1);
                        setDedupeKeep(null);
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-warm-dark/10 text-sm"
                    >
                      跳过
                    </button>
                    <button
                      onClick={async () => {
                        if (dedupeKeep === null) return;
                        const toDelete = pair.find((f: { id: number }) => f.id !== dedupeKeep);
                        if (toDelete) await handleDedupeDelete(toDelete.id);
                      }}
                      disabled={dedupeKeep === null || dedupeDeleting}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-rose-400 text-white text-sm font-medium hover:bg-rose-500 transition-all disabled:opacity-40"
                    >
                      {dedupeDeleting ? '删除中…' : '🗑 删除另一条，保留选中项'}
                    </button>
                  </div>
                </div>
              );
            })()}
            <button
              onClick={async () => { setDedupeOpen(false); await fetchFragments(); }}
              className="w-full mt-3 px-4 py-2 rounded-xl border border-warm-dark/10 text-sm text-warm-dark/60 hover:bg-warm-dark/5 transition-all"
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
