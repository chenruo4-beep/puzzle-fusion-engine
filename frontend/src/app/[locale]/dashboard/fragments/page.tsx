'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { SkeletonCard, SkeletonHeader } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import SmartBundleRecommend from '@/components/SmartBundleRecommend';
import FragmentRelations from '@/components/FragmentRelations';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import FileImportModal from '@/components/FileImportModal';


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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [fileImportOpen, setFileImportOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'markdown'>('json');
  const [exporting, setExporting] = useState(false);
  const [selectedFragment, setSelectedFragment] = useState<Fragment | null>(null);
  const [fragmentStory, setFragmentStory] = useState<string | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFragments = useCallback(async (loadMorePage?: number) => {
    try {
      const targetPage = loadMorePage ?? 1;
      const res = await authFetch(`/api/fragments/?archived_filter=0&page=${targetPage}&page_size=30`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: Fragment[] = data?.data?.items ?? [];
      const pagination = data?.data?.pagination ?? {};
      if (loadMorePage && loadMorePage > 1) {
        setFragments(prev => [...prev, ...items]);
      } else {
        setFragments(items);
      }
      setTotalCount(pagination.total ?? items.length);
      setHasMore((pagination.pages ?? 1) > targetPage);
    } catch (err) {
      console.error('Failed to fetch fragments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFragments(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFragments(nextPage);
  };

  const handleSubmit = async () => {
    if (!form.content.trim()) return;
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId
        ? { ...form, tags: form.tags || null }
        : { ...form, tags: form.tags || null };
      const res = await authFetch(editingId ? `/api/fragments/${editingId}` : '/api/fragments/', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (res.status === 402) {
          const data = await res.json().catch(() => ({}));
          toast(data?.detail?.message || '免费版碎片已满，升级专业版解锁无限碎片', 'error');
          return;
        }
        throw new Error(`保存失败 (${res.status})`);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      toast('收到，这是你的一块', 'success');
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
      const res = await authFetch(`/api/fragments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`删除失败 (${res.status})`);
      await fetchFragments();
    } catch (err) {
      toast('删除失败：' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(false);
    let deleted = 0;
    for (const id of Array.from(selectedIds)) {
      try {
        const res = await authFetch(`/api/fragments/${id}`, { method: 'DELETE' });
        if (res.ok) deleted++;
      } catch { /* continue */ }
    }
    setSelectedIds(new Set());
    setSelectMode(false);
    if (deleted > 0) toast(`已删除 ${deleted} 个碎片`, 'success');
    await fetchFragments();
  };

  const handleBatchAnalyze = async () => {
    if (batchText.trim().length < 20) {
      toast('请输入至少20个字符', 'warning');
      return;
    }
    setBatchLoading(true);
    try {
      const res = await authFetch('/api/fragments/batch-import', {
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
        await authFetch('/api/fragments/', {
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
      const res = await authFetch('/api/fragments/deduplicate', { method: 'POST' });
      if (!res.ok) throw new Error(`去重扫描失败 (${res.status})`);
      const data = await res.json();
      // 后端返回 { candidates: [{ fragment_a, fragment_b, similarity }] }
      // 前端 dedupeResults 期望 Fragment[][] 格式
      const candidates = data.candidates || [];
      if (candidates.length === 0) {
        toast('没有发现重复碎片，你的碎片都很独特 ✨', 'success');
        return;
      }
      const pairs: Fragment[][] = candidates.map((c: { fragment_a: Fragment; fragment_b: Fragment; similarity: number }) => [c.fragment_a, c.fragment_b]);
      setDedupeResults(pairs);
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
      const res = await authFetch(`/api/fragments/${idToDelete}`, { method: 'DELETE' });
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
            这段时间，Me又认识了你一点。
            {totalCount > 0 && (
              <span className="ml-2 text-sm font-normal text-warm-dark/50 dark:text-dark-text/50">
                ({totalCount})
              </span>
            )}
          </h1>
          <p className="text-warm-dark/60 dark:text-dark-text/60 text-sm mt-1">
            它们不是任务，是路上捡到的线索
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => setExportOpen(true)}
            className="px-4 py-2 rounded-xl border border-warm-dark/10 dark:border-dark-border text-sm text-warm-dark/60 dark:text-dark-text/60 hover:bg-warm-dark/5 transition-all"
          >
            📥 导出数据
          </button>
          <button
            onClick={() => { setBatchOpen(true); setBatchText(''); setBatchPreview([]); }}
            className="px-4 py-2 rounded-xl border border-warm-dark/10 dark:border-dark-border text-sm text-warm-dark/60 dark:text-dark-text/60 hover:bg-warm-dark/5 transition-all"
          >
            📦 批量导入
          </button>
          <button
            onClick={() => setFileImportOpen(true)}
            className="px-4 py-2 rounded-xl border border-warm-dark/10 dark:border-dark-border text-sm text-warm-dark/60 dark:text-dark-text/60 hover:bg-warm-dark/5 transition-all"
          >
            📤 从文件导入
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
            ＋ 捡到碎片了
          </button>
        </div>
      </div>

      {/* ── Export Modal ─────────────────────────────────────── */}
      {exportOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setExportOpen(false)}
        >
          <div
            className="bg-warm-light rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-warm-dark">📥 导出我的数据</h2>
              <button
                onClick={() => setExportOpen(false)}
                className="text-warm-dark/40 hover:text-warm-dark text-xl"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-warm-dark/60">
              将导出你所有的碎片和融合记录，包含完整内容和标签。
            </p>
            <div className="space-y-2">
              <span className="text-xs text-warm-dark/40 font-medium">选择格式</span>
              {(['json', 'csv', 'markdown'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    exportFormat === fmt
                      ? 'border-warm-accent bg-warm-accent/5 text-warm-dark'
                      : 'border-warm-dark/10 text-warm-dark/60 hover:border-warm-dark/20 hover:bg-warm-dark/5'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    exportFormat === fmt ? 'border-warm-accent' : 'border-warm-dark/20'
                  }`}>
                    {exportFormat === fmt && (
                      <span className="w-2 h-2 rounded-full bg-warm-accent" />
                    )}
                  </span>
                  <div className="text-left">
                    <div className="text-sm font-medium">
                      {fmt === 'json' ? 'JSON' : fmt === 'csv' ? 'CSV（表格）' : 'Markdown（笔记）'}
                    </div>
                    <div className="text-xs text-warm-dark/40">
                      {fmt === 'json' ? '完整数据，可编程使用'
                        : fmt === 'csv' ? '可导入 Excel / Numbers'
                        : '适合阅读和分享'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={async () => {
                setExporting(true);
                try {
                  const token = localStorage.getItem('token');
                  if (!token) { toast('请先登录', 'error'); return; }
                  const res = await authFetch('/api/export/all', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ type: 'all', format: exportFormat }),
                  });
                  if (!res.ok) throw new Error(`导出失败 (${res.status})`);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  const now = new Date();
                  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                  a.href = url;
                  a.download = `拼拼看Me_全量导出_${ts}.${exportFormat === 'markdown' ? 'md' : exportFormat}`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  setExportOpen(false);
                  toast('导出成功，文件已下载', 'success');
                } catch (err) {
                  toast('导出失败：' + (err instanceof Error ? err.message : '未知错误'), 'error');
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className="w-full py-3 rounded-xl bg-warm-accent text-white text-sm font-medium hover:bg-warm-accent/90 transition-all disabled:opacity-60"
            >
              {exporting ? '⏳ 正在导出...' : '下载文件'}
            </button>
          </div>
        </div>
      )}

      {/* ── Smart Bundle Recommendations ─────────────────────── */}
      <SmartBundleRecommend />

      {/* ── Multi-select toolbar ─────────────────────────────── */}
      {fragments.length > 0 && (
        <div className="flex items-center gap-2">
          {!selectMode ? (
            <button
              onClick={() => { setSelectMode(true); setSelectedIds(new Set()); }}
              className="px-3 py-1.5 rounded-xl border border-warm-dark/10 dark:border-dark-border text-xs text-warm-dark/50 dark:text-dark-text/50 hover:bg-warm-dark/5 transition-all"
            >
              ☑ 多选
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  if (selectedIds.size === filtered.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(filtered.map(f => f.id)));
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-warm-accent/30 text-xs text-warm-accent hover:bg-warm-accent/5 transition-all"
              >
                {selectedIds.size === filtered.length ? '◻ 取消全选' : '☑ 全选'}
              </button>
              <span className="text-xs text-warm-dark/30 dark:text-dark-text/30">已选 {selectedIds.size} 个</span>
              <button
                onClick={() => { if (selectedIds.size > 0) setShowDeleteConfirm(true); }}
                disabled={selectedIds.size === 0}
                className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-500 text-xs hover:bg-rose-100 transition-all disabled:opacity-30"
              >
                🗑 删除选中
              </button>
              <button
                onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                className="px-3 py-1.5 rounded-xl border border-warm-dark/10 dark:border-dark-border text-xs text-warm-dark/50 dark:text-dark-text/50 hover:bg-warm-dark/5 transition-all"
              >
                取消
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      {fragments.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-white/50 dark:bg-dark-surface border border-warm-dark/5 dark:border-dark-border text-xs">
          <span className="text-warm-dark/50 dark:text-dark-text/50">捡到的碎片：</span>
          <span className="font-bold text-warm-accent">{totalCount} 个</span>
        </div>
      )}

      {/* ── Filter + Search ───────────────────────────────── */}
      {fragments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {['全部', ...FRAGMENT_TYPES].map(ft => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterType === ft
                  ? 'bg-warm-accent text-white'
                  : 'bg-white/60 dark:bg-dark-surface text-warm-dark/50 dark:text-dark-text/50 hover:bg-white/80 dark:hover:bg-dark-surface'
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
              placeholder="在碎片里找找…"
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/80 border border-warm-dark/10 text-sm text-warm-dark placeholder-warm-dark/30"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-dark/30 text-sm">🔍</span>
          </div>
        </div>
      )}

      {/* ── Fragment List ─────────────────────────────────────── */}
      {filtered.length === 0 ? (
        fragments.length === 0 ? (
          <EmptyState
            icon="🧩"
            title="还没有捡到新的碎片。"
            description="不急，碎片会在你的随手记里慢慢浮现。"
            action={{ label: '试试看', onClick: () => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); } }}
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
          {filtered.map((f) => {
            const typeColor = TYPE_COLORS[f.fragment_type] || '#b8a088';
            const isSelected = selectedIds.has(f.id);
            return (
              <div
                key={f.id}
                className={`relative group p-4 rounded-2xl bg-white/90 dark:bg-dark-surface border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-warm-accent ring-2 ring-warm-accent/30 shadow-md'
                    : 'border-warm-dark/8 dark:border-dark-border hover:border-warm-dark/15 hover:shadow-sm'
                }`}
                onClick={() => {
                  if (selectMode) {
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      if (next.has(f.id)) next.delete(f.id);
                      else next.add(f.id);
                      return next;
                    });
                  } else {
                    setSelectedFragment(f);
                    setFragmentStory(null);
                  }
                }}
              >
                {/* Left color accent stripe */}
                <div
                  className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                  style={{ backgroundColor: typeColor }}
                />

                {/* Multi-select checkbox */}
                {selectMode && (
                  <div className="absolute top-3 left-4 z-10">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-warm-accent border-warm-accent' : 'border-warm-dark/20 dark:border-dark-border bg-white dark:bg-dark-surface'
                    }`}>
                      {isSelected && <span className="text-white text-xs">✓</span>}
                    </div>
                  </div>
                )}

                {/* Actions (visible on hover, hidden in select mode) */}
                {!selectMode && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(f); }} className="text-warm-dark/30 dark:text-dark-text/30 hover:text-warm-dark/60 dark:hover:text-dark-text/60 text-xs">✎</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }} className="text-warm-dark/30 dark:text-dark-text/30 hover:text-rose-500 text-xs">✕</button>
                  </div>
                )}

                {/* Type badge */}
                <div className="flex items-center gap-2 mb-2 ml-1">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                    style={{ backgroundColor: typeColor }}
                  >
                    {f.fragment_type}
                  </span>
                </div>

                {/* Content */}
                <p className="text-sm text-warm-dark/80 dark:text-dark-text/80 leading-relaxed whitespace-pre-wrap break-words ml-1">
                  {f.content}
                </p>

                {/* 场景优势 */}
                <SceneIndexHint fragmentType={f.fragment_type} />

                {/* 关联发现提示 */}
                <div className="mt-2 ml-1">
                  <FragmentRelations fragmentId={f.id} compact />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Load More ──────────────────────────────────────────── */}
      {hasMore && !loading && fragments.length > 0 && (
        <div className="flex justify-center pt-4 pb-8">
          <button
            onClick={loadMore}
            className="px-8 py-3 rounded-xl border border-warm-dark/10 dark:border-dark-border text-sm text-warm-dark/50 dark:text-dark-text/50 hover:bg-warm-dark/5 hover:text-warm-dark dark:hover:text-dark-text transition-all"
          >
            加载更多（{fragments.length}/{totalCount}）
          </button>
        </div>
      )}

      {/* ── Add/Edit Modal ───────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 p-6 rounded-3xl bg-white/90 dark:bg-dark-surface backdrop-blur-sm shadow-2xl">
            <h2 className="text-lg font-bold mb-4">{editingId ? '修改碎片' : '发现碎片'}</h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {FRAGMENT_TYPES.map(ft => (
                  <button
                    key={ft}
                    onClick={() => setForm(prev => ({ ...prev, fragment_type: ft }))}
                    className={`px-3 py-1 rounded-full text-xs transition-all ${
                      form.fragment_type === ft
                        ? 'text-white'
                        : 'bg-warm-dark/5 dark:bg-dark-bg text-warm-dark/50 dark:text-dark-text/50 hover:bg-warm-dark/10'
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
                placeholder="比如：很会安慰人 / 能记住很久以前的事 / 看到配色不对就浑身难受……"
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/80 border border-warm-dark/10 text-sm text-warm-dark placeholder-warm-dark/30 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-warm-dark/10 dark:border-dark-border text-sm text-warm-dark/60 dark:text-dark-text/60 hover:bg-warm-dark/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.content.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-warm-accent text-white text-sm font-medium hover:bg-warm-accent/90 transition-all disabled:opacity-40"
              >
                {editingId ? '保存' : '记下来'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch Import Modal ────────────────────────────────── */}
      {batchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 p-6 rounded-3xl bg-white/90 dark:bg-dark-surface backdrop-blur-sm shadow-2xl">
            <h2 className="text-lg font-bold mb-4">📦 批量导入碎片</h2>
            {batchPreview.length === 0 ? (
              <>
                <textarea
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  placeholder="贴一段文字进来，Me帮你看看里面藏着什么碎片"
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl bg-white/80 border border-warm-dark/10 text-sm text-warm-dark placeholder-warm-dark/30 resize-none"
                />
                <button
                  onClick={handleBatchAnalyze}
                  disabled={batchLoading || batchText.trim().length < 20}
                  className="mt-4 w-full px-4 py-2.5 rounded-xl bg-warm-accent text-white text-sm font-medium hover:bg-warm-accent/90 transition-all disabled:opacity-40"
                >
                  {batchLoading ? '正在看…' : '🪄 Me帮你看看'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-warm-dark/60 dark:text-dark-text/60 mb-3">找到了 {batchPreview.length} 个碎片：</p>
                <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                  {batchPreview.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-xl bg-white/60 dark:bg-dark-surface">
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
                        <p className="text-xs text-warm-dark/70 dark:text-dark-text/70 mt-1">{item.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mb-4">
                  <button onClick={selectAllBatch} className="text-xs text-warm-accent hover:underline">都收下</button>
                  <button onClick={deselectAllBatch} className="text-xs text-warm-dark/40 dark:text-dark-text/40 hover:underline">有些不是我</button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setBatchPreview([]); setBatchText(''); }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-warm-dark/10 dark:border-dark-border text-sm"
                  >
                    返回修改
                  </button>
                  <button
                    onClick={handleBatchSave}
                    disabled={batchSaving}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-warm-accent text-white text-sm font-medium hover:bg-warm-accent/90 transition-all disabled:opacity-40"
                  >
                    {batchSaving ? '记下来…' : `记下来 (${batchPreview.filter(i => i.selected).length} 个)`}
                  </button>
                </div>
              </>
            )}
            <button
              onClick={() => { setBatchOpen(false); setBatchText(''); setBatchPreview([]); }}
              className="absolute top-4 right-4 text-warm-dark/30 dark:text-dark-text/30 hover:text-warm-dark/60 dark:hover:text-dark-text/60"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Dedupe Modal ─────────────────────────────────────── */}
      {dedupeOpen && dedupeResults.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 p-6 rounded-3xl bg-white/90 dark:bg-dark-surface backdrop-blur-sm shadow-2xl">
            <h2 className="text-lg font-bold mb-2">🔍 去重结果</h2>
            <p className="text-sm text-warm-dark/60 dark:text-dark-text/60 mb-4">
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
                            : 'border-warm-dark/10 dark:border-dark-border bg-white/60 dark:bg-dark-surface hover:border-warm-dark/20'
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
                        <p className="text-xs text-warm-dark/70 dark:text-dark-text/70 ml-1">{f.content}</p>
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
                      className="flex-1 px-4 py-2.5 rounded-xl border border-warm-dark/10 dark:border-dark-border text-sm"
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
              className="w-full mt-3 px-4 py-2 rounded-xl border border-warm-dark/10 dark:border-dark-border text-sm text-warm-dark/60 dark:text-dark-text/60 hover:bg-warm-dark/5 transition-all"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 p-6 rounded-3xl bg-white shadow-2xl animate-modal-enter">
            <div className="text-center mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-lg font-bold text-warm-dark text-center mb-2">
              删了就找不回来了
            </h2>
            <p className="text-sm text-warm-dark/50 text-center mb-6">
              {selectedIds.size === filtered.length
                ? `你选择了全部 ${selectedIds.size} 个碎片。删除后不可恢复，确定要继续吗？`
                : `你选择了 ${selectedIds.size} 个碎片。删除后不可恢复，确定要继续吗？`
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-warm-dark/10 text-sm text-warm-dark/60 hover:bg-warm-dark/5 transition-all"
              >
                我再想想
              </button>
              <button
                onClick={handleDeleteSelected}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fragment Detail Modal ──────────────────────────────── */}
      {selectedFragment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => { setSelectedFragment(null); setFragmentStory(null); }}
        >
          <div
            className="w-full max-w-md mx-4 p-6 rounded-3xl bg-white/95 shadow-2xl animate-modal-enter max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => { setSelectedFragment(null); setFragmentStory(null); }}
              className="absolute top-4 right-4 text-warm-dark/30 hover:text-warm-dark/60"
            >
              ✕
            </button>

            {/* Type badge */}
            <div className="mb-3">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: TYPE_COLORS[selectedFragment.fragment_type] || '#b8a088' }}
              >
                {selectedFragment.fragment_type}
              </span>
            </div>

            {/* Content */}
            <p className="text-base text-warm-dark leading-relaxed mb-4 whitespace-pre-wrap">
              {selectedFragment.content}
            </p>

            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-warm-dark/30 mb-4">
              <span>捡到于 {new Date(selectedFragment.created_at).toLocaleDateString('zh-CN')}</span>
              {selectedFragment.journal_id && (
                <span className="px-2 py-0.5 rounded bg-warm-accent/5 text-warm-accent/60">
                  来自日记 #{selectedFragment.journal_id}
                </span>
              )}
            </div>

            {/* Story section — fetch journal entry if available */}
            {selectedFragment.journal_id && (
              <div className="mb-4 p-4 rounded-xl bg-warm-accent/5 border border-warm-accent/10">
                <h4 className="text-xs font-medium text-warm-accent/60 mb-2">
                  📖 碎片的故事
                </h4>
                {storyLoading ? (
                  <p className="text-xs text-warm-dark/30">正在找这个碎片的故事…</p>
                ) : fragmentStory ? (
                  <p className="text-sm text-warm-dark/60 leading-relaxed whitespace-pre-wrap">
                    {fragmentStory}
                  </p>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-warm-dark/30 mb-2">这个碎片是从一篇日记里来的</p>
                    <button
                      onClick={async () => {
                        setStoryLoading(true);
                        try {
                          const res = await authFetch(`/api/journal/${selectedFragment.journal_id}`);
                          if (res.ok) {
                            const data = await res.json();
                            setFragmentStory(data.content || '没有找到日记内容');
                          } else {
                            setFragmentStory('日记加载失败');
                          }
                        } catch {
                          setFragmentStory('日记加载失败');
                        } finally {
                          setStoryLoading(false);
                        }
                      }}
                      className="text-xs text-warm-accent hover:underline"
                    >
                      看看它从哪里来
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => { setSelectedFragment(null); setFragmentStory(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-warm-dark/10 text-sm text-warm-dark/60 hover:bg-warm-dark/5 transition-all"
              >
                收起
              </button>
              <button
                onClick={() => {
                  const prompt = `今天，我想强化「${selectedFragment.content.slice(0, 30)}」这个能力：`;
                  window.location.href = `/dashboard/journal?prompt=${encodeURIComponent(prompt)}`;
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-warm-accent text-white text-sm font-medium hover:bg-warm-accent/90 transition-all"
              >
                💪 强化这个能力
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── File Import Modal ─────────────────────────────── */}
      <FileImportModal
        open={fileImportOpen}
        onClose={() => setFileImportOpen(false)}
        onImported={() => fetchFragments()}
      />
    </div>
  );
}
import { authFetch   } from '@/lib/api';


function SceneIndexHint({ fragmentType }: { fragmentType: string }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<{ scenes: string[]; advantage: string } | null>(null);

  const toggle = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (!data) {
      try {
        const res = await authFetch(`/api/fragments/scene-index/${encodeURIComponent(fragmentType)}`);
        if (res.ok) setData(await res.json());
      } catch { /* silent */ }
    }
  };

  return (
    <div className="mt-2 ml-1">
      <button
        onClick={toggle}
        className="text-[10px] text-warm-dark/25 hover:text-warm-accent transition-colors"
      >
        {expanded ? '收起 ▴' : '在什么场景里有用？'}
      </button>
      {expanded && data && (
        <div className="mt-2 p-2.5 rounded-lg bg-warm-accent/5 border border-warm-accent/10">
          <div className="flex flex-wrap gap-1 mb-1.5">
            {data.scenes.map((s, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-warm-accent/10 text-warm-accent">
                {s}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-warm-dark/50 leading-relaxed">{data.advantage}</p>
        </div>
      )}
    </div>
  );
}
