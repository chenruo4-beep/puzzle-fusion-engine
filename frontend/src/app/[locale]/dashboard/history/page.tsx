'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { SkeletonCard, SkeletonHeader } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';

// ====== Replay Types ======
interface ReplayFragment {
  id: number;
  type: string;
  content: string;
}

interface ReplayEvent {
  event_id: number;
  event_type: string;
  title: string;
  fragments_involved: ReplayFragment[];
  fragment_count: number;
  created_at: string | null;
  result_summary: string;
}

// ====== Types ======

interface FusionRecord {
  id: number;
  user_id: number;
  profession: string;
  title: string;
  fragment_ids: number[];
  result: string;
  iteration: number;
  created_at: string;
}

interface RoadmapStep {
  step: number;
  time: string;
  action: string;
}

interface FusionDirection {
  title: string;
  why_this_works?: string;
  description?: string;
  market_hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  time_to_first_result?: string;
  roadmap?: RoadmapStep[];
  used_fragments: string[];
  next_action: string;
}

interface ParsedResult {
  golden_sentence: string;
  profile_tag?: string;
  confidence?: number;
  directions: FusionDirection[];
  insight: string;
  skill_gaps?: string[];
}

// ====== Config ======


const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  easy: { label: '上手快', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  medium: { label: '中等难度', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  hard: { label: '有挑战', color: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400' },
};

// ====== Helpers ======

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

function safeParseResult(raw: string): ParsedResult | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function previewText(raw: string, maxLen = 80): string {
  const parsed = safeParseResult(raw);
  if (!parsed) return raw.slice(0, maxLen) + (raw.length > maxLen ? '...' : '');
  const base = parsed.golden_sentence || parsed.directions?.[0]?.title || '';
  return base.length > maxLen ? base.slice(0, maxLen) + '...' : base;
}

function resultToText(record: FusionRecord): string {
  const parsed = safeParseResult(record.result);
  const lines: string[] = [];
  lines.push(`=== 拼拼看Me · 方向探索 ===`);
  lines.push(`方向: ${record.title}`);
  lines.push(`职业: ${record.profession}`);
  lines.push(`时间: ${formatDate(record.created_at)}`);
  lines.push('');
  if (parsed) {
    if (parsed.golden_sentence) {
      lines.push(`💬 金句`);
      lines.push(`"${parsed.golden_sentence}"`);
      lines.push('');
    }
    if (parsed.directions.length > 0) {
      lines.push(`🎯 这几个方向 (${parsed.directions.length}个)`);
      parsed.directions.forEach((dir, i) => {
        lines.push('');
        lines.push(`方向${i + 1}: ${dir.title}`);
        const diffLabel = DIFFICULTY_CONFIG[dir.difficulty || 'medium']?.label || '中等难度';
        lines.push(`  难度: ${diffLabel}`);
        if (dir.why_this_works) lines.push(`  为什么可行: ${dir.why_this_works}`);
        if (dir.market_hint) lines.push(`  市场提示: ${dir.market_hint}`);
        if (dir.used_fragments.length > 0) lines.push(`  使用碎片: ${dir.used_fragments.join('、')}`);
        if (dir.roadmap && dir.roadmap.length > 0) {
          lines.push(`  可能路线:`);
          dir.roadmap.forEach(s => lines.push(`    Step ${s.step} (${s.time}): ${s.action}`));
        }
        if (dir.next_action) lines.push(`  📌 下一步: ${dir.next_action}`);
      });
      lines.push('');
    }
    if (parsed.insight) {
      lines.push(`💡 整体洞察`);
      lines.push(parsed.insight);
      lines.push('');
    }
    if (parsed.skill_gaps && parsed.skill_gaps.length > 0) {
      lines.push(`🔧 还差的碎片`);
      parsed.skill_gaps.forEach(g => lines.push(`  🧩 ${g}`));
    }
  } else {
    lines.push(record.result);
  }
  lines.push('');
  lines.push(`— 由拼拼看Me生成`);
  return lines.join('\n');
}

// ====== Component ======

export default function HistoryPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<FusionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exportingRecordId, setExportingRecordId] = useState<number | null>(null);
  const [textCopied, setTextCopied] = useState<number | null>(null);
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayEvents, setReplayEvents] = useState<ReplayEvent[]>([]);
  const [replayStep, setReplayStep] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const contentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter records by search term
  const filteredRecords = records.filter(r => {
    const term = searchTerm.toLowerCase();
    return !term || r.title.toLowerCase().includes(term) || r.profession.toLowerCase().includes(term);
  });

  const [hasMoreFusions, setHasMoreFusions] = useState(false);
  const [fusionPage, setFusionPage] = useState(1);

  useEffect(() => {
    authFetch(`/api/fusions/?page=${fusionPage}&page_size=20`)
      .then(res => {
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then(data => {
        const items: FusionRecord[] = data?.data?.items ?? [];
        const pagination = data?.data?.pagination ?? {};
        if (fusionPage > 1) {
          setRecords(prev => [...prev, ...items]);
        } else {
          setRecords(items);
        }
        setHasMoreFusions((pagination.pages ?? 1) > fusionPage);
      })
      .catch(err => console.error('加载历史记录失败:', err))
      .finally(() => setLoading(false));
  }, [fusionPage]);

  const handleExportText = async (record: FusionRecord) => {
    const text = resultToText(record);
    try {
      await navigator.clipboard.writeText(text);
      setTextCopied(record.id);
      setTimeout(() => setTextCopied(null), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setTextCopied(record.id);
      setTimeout(() => setTextCopied(null), 2000);
    }
  };

  const handleExportImage = async (record: FusionRecord) => {
    const wrapper = contentRefs.current.get(record.id);
    if (!wrapper) return;
    setExportingRecordId(record.id);
    try {
      // Temporarily expand the card's display for full capture
      // const previouslyCollapsed = wrapper.querySelector('[data-detail="true"]') as HTMLElement | null;
      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#faf8f5',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      const safeTitle = record.title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 30);
      link.download = `拼拼看Me_${safeTitle}_${formatDate(record.created_at).replace(/[: ]/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('导出图片失败:', err);
      toast('导出图片失败，请重试', 'error');
    } finally {
      setExportingRecordId(null);
    }
  };

  // ====== Loading ======
  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // ====== Empty State ======
  if (records.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">你走过的路</h1>
        <EmptyState
          icon="📋"
          title="还没有拼过方向"
          description="你在认识自己的路上。这条路不用快，每一步都算。Me不着急。"
          action={{ label: '→ 去拼个方向', onClick: () => window.location.href = '/dashboard/fusion' }}
        />
      </div>
    );
  }

  // ====== Main View ======
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">你走过的路</h1>
          <span className="px-3 py-1 bg-warm-accent/10 text-warm-accent text-sm font-medium rounded-full">
            {filteredRecords.length} 段记忆
          </span>
        </div>
        {/* Replay Button + Search Input */}
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await authFetch('/api/fusions/replay');
                const data = await res.json();
                if (data.success && data.events.length > 0) {
                  setReplayEvents(data.events);
                  setReplayStep(0);
                  setReplayOpen(true);
                  setReplayPlaying(false);
                } else {
                  toast('还没有记录可以回看', 'info');
                }
              } catch {
                toast('加载回看数据失败', 'error');
              }
            }}
            className="px-3 py-2 bg-warm-accent/10 text-warm-accent text-sm font-medium rounded-xl hover:bg-warm-accent/20 transition-colors"
          >
            🎬 回看旅程
          </button>
          <input
            type="text"
            placeholder="翻翻看..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-white border border-warm-dark/10 rounded-xl text-sm focus:outline-none focus:border-warm-accent/50 w-40"
          />
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {filteredRecords.map(record => {
          const parsed = safeParseResult(record.result);
          const isOpen = expandedId === record.id;
          const isExporting = exportingRecordId === record.id;
          const justCopied = textCopied === record.id;

          return (
            <div
              key={record.id}
              className="rounded-2xl bg-white/80 shadow-sm border border-warm-dark/10 overflow-hidden transition-all hover:shadow-md"
            >
              {/* Card Header — always visible, click to expand */}
              <button
                onClick={() => setExpandedId(isOpen ? null : record.id)}
                className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-warm-accent/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-warm-dark truncate">{record.title}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warm-accent/10 text-warm-accent text-xs rounded-full">
                      🎯 {record.profession}
                    </span>
                    <span className="text-xs text-warm-dark/40">
                      {formatDate(record.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-warm-dark/50 mt-2 leading-relaxed line-clamp-2">
                    {previewText(record.result)}
                  </p>
                </div>
                <span
                  className={`text-warm-dark/30 mt-1 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                >
                  ▼
                </span>
              </button>

              {/* Expanded Detail */}
              {isOpen && parsed && (
                <div
                  ref={(el) => {
                    if (el) contentRefs.current.set(record.id, el);
                    else contentRefs.current.delete(record.id);
                  }}
                  className="px-5 pb-5 space-y-5 border-t border-warm-dark/5 pt-4"
                >
                  {/* Golden Sentence */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-warm-accent/10 via-warm-accent/5 to-transparent border border-warm-accent/10">
                    <p className="text-sm font-medium text-warm-dark/80 leading-relaxed">
                      &ldquo; {parsed.golden_sentence} &rdquo;
                    </p>
                  </div>

                  {/* Directions */}
                  {parsed.directions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-warm-dark/40 tracking-wide">
                        这些碎片，指向这几个方向。
                      </h4>
                      {parsed.directions.map((dir, i) => {
                        const diff = DIFFICULTY_CONFIG[dir.difficulty || 'medium'] || DIFFICULTY_CONFIG.medium;
                        return (
                          <div
                            key={i}
                            className="p-4 rounded-xl border border-warm-dark/10 bg-white/60"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-warm-dark">{dir.title}</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${diff.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                                {diff.label}
                              </span>
                            </div>

                            {(dir.why_this_works || dir.description) && (
                              <p className="text-sm text-warm-dark/70 leading-relaxed mb-3">
                                {dir.why_this_works || dir.description}
                              </p>
                            )}

                            {/* Roadmap */}
                            {dir.roadmap && dir.roadmap.length > 0 && (
                              <div className="space-y-2 mt-3">
                                <span className="text-xs text-warm-dark/40">一条可能的路线</span>
                                <div className="space-y-1.5">
                                  {dir.roadmap.map(s => (
                                    <div
                                      key={s.step}
                                      className="flex gap-2 items-start"
                                    >
                                      <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                                        s.step === 1
                                          ? 'bg-warm-accent text-white font-bold shadow-sm shadow-warm-accent/20'
                                          : 'bg-warm-accent/15 text-warm-accent'
                                      }`}>
                                        {s.step}
                                      </span>
                                      <div>
                                        {s.step === 1 && (
                                          <span className="text-xs text-warm-accent font-medium">🌟 今天就能做</span>
                                        )}
                                        <span className="text-xs text-warm-dark/40 ml-1">{s.time}</span>
                                        <p className={`text-sm ${s.step === 1 ? 'text-warm-dark font-medium' : 'text-warm-dark/70'}`}>
                                          {s.action}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Next Action */}
                            <div className="mt-3 p-3 rounded-lg bg-warm-accent/5 border border-warm-accent/10">
                              <span className="text-xs text-warm-accent font-medium">📌 下一步：</span>
                              <p className="text-sm text-warm-dark mt-0.5">{dir.next_action}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Insight */}
                  {parsed.insight && (
                    <div className="p-4 rounded-xl bg-warm-light/60 border border-warm-dark/5">
                      <h4 className="text-xs font-medium text-warm-dark/40 mb-1">💡 整体洞察</h4>
                      <p className="text-sm text-warm-dark/80 leading-relaxed">{parsed.insight}</p>
                    </div>
                  )}

                  {/* Skill Gaps */}
                  {parsed.skill_gaps && parsed.skill_gaps.length > 0 && (
                    <div className="p-4 rounded-xl bg-white/60 border border-warm-dark/10">
                      <h4 className="text-xs font-medium text-warm-dark/40 mb-2">🔧 还差这几块碎片</h4>
                      <div className="space-y-1.5">
                        {parsed.skill_gaps.map((gap, j) => (
                          <div key={j} className="flex items-center gap-2 text-sm text-warm-dark/70">
                            <span className="text-warm-dark/30">🧩</span>
                            <span>{gap}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Export Actions ──────────────────────────────────── */}
                  <div className="flex items-center gap-2 pt-2 border-t border-warm-dark/5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExportText(record); }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                        justCopied
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'border border-warm-dark/15 text-warm-dark/60 hover:border-warm-dark/25 hover:text-warm-dark/80 hover:bg-white'
                      }`}
                    >
                      {justCopied ? '✅ 已复制' : '📋 复制文本'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExportImage(record); }}
                      disabled={isExporting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-warm-dark/15 text-warm-dark/60 hover:border-warm-dark/25 hover:text-warm-dark/80 hover:bg-white transition-all disabled:opacity-50"
                    >
                      {isExporting ? '⏳ 导出中...' : '🖼️ 导出图片'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Load More ──────────────────────────────────────────── */}
      {hasMoreFusions && (
        <div className="flex justify-center pt-2 pb-8">
          <button
            onClick={() => setFusionPage(p => p + 1)}
            className="px-8 py-3 rounded-xl border border-warm-dark/10 text-sm text-warm-dark/50 hover:bg-warm-dark/5 hover:text-warm-dark transition-all"
          >
            加载更多
          </button>
        </div>
      )}

      {/* ====== Replay Modal ====== */}
      {replayOpen && replayEvents.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => { setReplayOpen(false); if (replayTimerRef.current) clearInterval(replayTimerRef.current); setReplayPlaying(false); }}
        >
          <div
            className="bg-warm-light rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-warm-dark">🎬 回看融合旅程</h2>
              <button
                onClick={() => { setReplayOpen(false); if (replayTimerRef.current) clearInterval(replayTimerRef.current); setReplayPlaying(false); }}
                className="text-warm-dark/40 hover:text-warm-dark text-xl"
              >✕</button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-warm-dark/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-warm-accent rounded-full transition-all duration-500"
                  style={{ width: `${((replayStep + 1) / replayEvents.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-warm-dark/40">{replayStep + 1}/{replayEvents.length}</span>
            </div>

            {/* Current event display */}
            {replayEvents.slice(0, replayStep + 1).map((evt, idx) => (
              <div
                key={evt.event_id}
                className={`p-4 rounded-xl border transition-all duration-700 ${
                  idx === replayStep
                    ? 'bg-warm-accent/10 border-warm-accent/30 shadow-sm scale-[1.02]'
                    : 'bg-white/60 border-warm-dark/5 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-warm-accent font-bold text-sm">第 {evt.event_id} 次探索</span>
                  <span className="text-xs text-warm-dark/40">{evt.created_at ? formatDate(evt.created_at) : ''}</span>
                </div>
                <h3 className="font-semibold text-warm-dark mb-2">{evt.title}</h3>
                {evt.fragments_involved.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {evt.fragments_involved.map(f => (
                      <span
                        key={f.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-warm-accent/10 text-warm-accent"
                      >
                        🧩 {f.content.length > 12 ? f.content.slice(0, 12) + '...' : f.content}
                      </span>
                    ))}
                  </div>
                )}
                {evt.result_summary && (
                  <p className="text-sm text-warm-dark/60 italic">&ldquo;{evt.result_summary}&rdquo;</p>
                )}
              </div>
            ))}

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setReplayStep(s => Math.max(0, s - 1))}
                disabled={replayStep === 0}
                className="px-4 py-2 rounded-xl border border-warm-dark/15 text-warm-dark/60 hover:bg-white transition disabled:opacity-30"
              >◀ 上一步</button>
              <button
                onClick={() => {
                  if (replayPlaying) {
                    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
                    setReplayPlaying(false);
                  } else {
                    setReplayPlaying(true);
                    replayTimerRef.current = setInterval(() => {
                      setReplayStep(s => {
                        if (s >= replayEvents.length - 1) {
                          if (replayTimerRef.current) clearInterval(replayTimerRef.current);
                          setReplayPlaying(false);
                          return s;
                        }
                        return s + 1;
                      });
                    }, 2000);
                  }
                }}
                className="px-6 py-2 rounded-xl bg-warm-accent text-white font-medium hover:bg-warm-accent/90 transition"
              >
                {replayPlaying ? '⏸ 暂停' : '▶ 自动播放'}
              </button>
              <button
                onClick={() => setReplayStep(s => Math.min(replayEvents.length - 1, s + 1))}
                disabled={replayStep >= replayEvents.length - 1}
                className="px-4 py-2 rounded-xl border border-warm-dark/15 text-warm-dark/60 hover:bg-white transition disabled:opacity-30"
              >下一步 ▶</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { authFetch   } from '@/lib/api';