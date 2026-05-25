'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { authFetch } from '@/lib/api';

const CompletionRing = dynamic(() => import('@/components/CompletionRing'), { ssr: false });

/* ---------- 类型 ---------- */
interface TimelinePoint {
  month: string;
  fragments: number;
  fusions: number;
  journals: number;
}

interface TypeDistItem {
  type: string;
  count: number;
}

interface HeatmapPoint {
  date: string;
  count: number;
}

interface KeyMetrics {
  total_fragments: number;
  total_fusions: number;
  total_journals: number;
  total_checkins: number;
  fusion_rate: number;
  weekly_active_days: number;
  active_days_30: number;
}

interface DashboardData {
  key_metrics: KeyMetrics;
  timeline: TimelinePoint[];
  fragment_type_distribution: TypeDistItem[];
  activity_heatmap: HeatmapPoint[];
}

/* ---------- 常量 ---------- */
const TYPE_COLORS: Record<string, string> = {
  '技能': '#5a7a5a',
  '能力': '#4a7c9b',
  '爱好': '#c49a6c',
  '习惯': '#9b6c4a',
  '知识': '#b8a088',
  '经历': '#7a9b4a',
  '资源': '#4a9b9b',
  '性格': '#9b4a6c',
};

const HEAT_LEVELS = [
  { min: 0, color: 'rgba(60,58,55,0.04)' },
  { min: 1, color: 'rgba(184,160,136,0.2)' },
  { min: 2, color: 'rgba(184,160,136,0.4)' },
  { min: 3, color: 'rgba(184,160,136,0.6)' },
  { min: 5, color: 'rgba(184,160,136,0.8)' },
  { min: 8, color: 'rgba(184,160,136,1.0)' },
];

function getHeatColor(count: number): string {
  for (let i = HEAT_LEVELS.length - 1; i >= 0; i--) {
    if (count >= HEAT_LEVELS[i].min) return HEAT_LEVELS[i].color;
  }
  return HEAT_LEVELS[0].color;
}

/* ---------- 组件 ---------- */
export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'3m' | '6m' | 'all'>('6m');

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch('/api/analytics/user-dashboard');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: DashboardData = await res.json();
        setData(json);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '未知错误';
        setError(msg);
        // 生成空数据保持UI可用
        setData({
          key_metrics: { total_fragments: 0, total_fusions: 0, total_journals: 0, total_checkins: 0, fusion_rate: 0, weekly_active_days: 0, active_days_30: 0 },
          timeline: [],
          fragment_type_distribution: [],
          activity_heatmap: [],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 过滤时间线
  const filteredTimeline = useMemo(() => {
    if (!data) return [];
    if (period === 'all') return data.timeline;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - (period === '3m' ? 3 : 6));
    const cutoffStr = cutoff.toISOString().slice(0, 7);
    return data.timeline.filter(t => t.month >= cutoffStr);
  }, [data, period]);

  // 热力图数据：构建过去84天的网格
  const heatmapGrid = useMemo(() => {
    if (!data) return [];
    const dateMap = new Map(data.activity_heatmap.map(h => [h.date, h.count]));
    const grid: { date: string; count: number; dayOfWeek: number }[] = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      grid.push({ date: dateStr, count: dateMap.get(dateStr) || 0, dayOfWeek: d.getDay() });
    }
    return grid;
  }, [data]);

  // 类型分布颜色
  const typeDistWithColors = useMemo(() => {
    if (!data) return [];
    return data.fragment_type_distribution.map(t => ({
      ...t,
      color: TYPE_COLORS[t.type] || '#b8a088',
    }));
  }, [data]);

  // ── 行动建议生成 ──────────────────────────────────────────────────────────────
  const suggestions = useMemo(() => {
    if (!data) return [];
    const { key_metrics, fragment_type_distribution, activity_heatmap } = data;
    const list: { icon: string; text: string; priority: 'high' | 'medium' | 'low' }[] = [];

    // 规则1：碎片太少
    if (key_metrics.total_fragments < 10) {
      list.push({ icon: '🌱', text: '多记录几块碎片，才能看见组合的可能', priority: 'high' });
    }

    // 规则2：融合率低
    if (key_metrics.total_fragments >= 10 && key_metrics.fusion_rate < 20) {
      list.push({ icon: '🔥', text: '试试融合几块碎片，会有意外发现', priority: 'high' });
    }

    // 规则3：活跃度低
    if (key_metrics.active_days_30 < 5) {
      list.push({ icon: '📅', text: '保持记录习惯，每次3-5分钟就够了', priority: 'medium' });
    }

    // 规则4：类型分布
    if (fragment_type_distribution.length > 0) {
      const top = fragment_type_distribution[0];
      const total = fragment_type_distribution.reduce((s, t) => s + t.count, 0);
      if (total > 0 && top.count / total > 0.5) {
        list.push({ icon: '🎯', text: `你的「${top.type}」碎片很多，试试和其他类型组合`, priority: 'low' });
      }
    }

    // 规则5：最近活跃（正向反馈）
    const last7 = activity_heatmap.filter(h => {
      const d = new Date(h.date);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo && h.count > 0;
    });
    if (last7.length >= 3) {
      list.push({ icon: '✨', text: '这周很活跃，继续保持这个节奏', priority: 'low' });
    }

    // 默认兜底
    if (list.length === 0) {
      list.push({ icon: '💡', text: '数据很健康，保持记录和融合的习惯', priority: 'low' });
    }

    // 排序：high > medium > low，最多返回3条
    const order = { high: 0, medium: 1, low: 2 };
    return list.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 3);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse rounded-2xl bg-white/60 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5">
          <div className="h-6 w-48 bg-warm-dark/10 dark:bg-dark-border rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-warm-dark/5 dark:bg-dark-border rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { key_metrics } = data;

  return (
    <div className="space-y-6">
      {/* ====== 页面标题 ====== */}
      <div>
        <h1 className="text-2xl font-bold text-warm-dark dark:text-dark-text">📊 高级分析仪表盘</h1>
        <p className="text-sm text-warm-dark/40 dark:text-dark-text/40 mt-1">
          深度洞察你的知识拼图增长轨迹
        </p>
        {error && (
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ 后端连接异常（{error}），显示缓存数据
          </p>
        )}
      </div>

      {/* ====== 关键指标卡片 ====== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard emoji="🧩" label="碎片总数" value={key_metrics.total_fragments} />
        <MetricCard emoji="✨" label="融合次数" value={key_metrics.total_fusions} />
        <MetricCard emoji="🔥" label="融合率" value={`${key_metrics.fusion_rate}%`} />
        <MetricCard emoji="📅" label="30天活跃" value={`${key_metrics.active_days_30}天`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard emoji="📔" label="日记篇数" value={key_metrics.total_journals} />
        <MetricCard emoji="✅" label="打卡总数" value={key_metrics.total_checkins} />
        <MetricCard emoji="📆" label="7天活跃" value={`${key_metrics.weekly_active_days}天`} />
      </div>

      {/* ====== 增长时间线 ====== */}
      <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-warm-dark dark:text-dark-text">📈 增长趋势</h3>
          <div className="flex gap-1">
            {(['3m', '6m', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  period === p
                    ? 'bg-warm-accent/15 text-warm-accent dark:bg-dark-accent/15 dark:text-dark-accent font-medium'
                    : 'text-warm-dark/40 dark:text-dark-text/40 hover:text-warm-dark/60 dark:hover:text-dark-text/60'
                }`}
              >
                {p === '3m' ? '3月' : p === '6m' ? '6月' : '全部'}
              </button>
            ))}
          </div>
        </div>

        {filteredTimeline.length === 0 ? (
          <div className="text-center py-8 text-warm-dark/30 dark:text-dark-text/30">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm">数据积累中，持续使用后这里会显示增长曲线</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 简易柱状图：碎片+融合+日记 */}
            {filteredTimeline.map(t => {
              const maxVal = Math.max(t.fragments + t.fusions + t.journals, 1);
              const fragPct = (t.fragments / maxVal) * 100;
              const fusPct = (t.fusions / maxVal) * 100;
              const jourPct = (t.journals / maxVal) * 100;
              return (
                <div key={t.month} className="flex items-center gap-3">
                  <span className="shrink-0 w-14 text-xs text-warm-dark/40 dark:text-dark-text/40 text-right">
                    {t.month.slice(5)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex h-5 rounded-lg overflow-hidden bg-warm-dark/5 dark:bg-dark-border">
                      {fragPct > 0 && (
                        <div className="bg-[#5a7a5a] transition-all duration-500" style={{ width: `${fragPct}%` }} />
                      )}
                      {fusPct > 0 && (
                        <div className="bg-[#b8a088] transition-all duration-500" style={{ width: `${fusPct}%` }} />
                      )}
                      {jourPct > 0 && (
                        <div className="bg-[#4a7c9b] transition-all duration-500" style={{ width: `${jourPct}%` }} />
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 w-10 text-xs text-warm-dark/30 dark:text-dark-text/30 text-right">
                    {t.fragments + t.fusions + t.journals}
                  </span>
                </div>
              );
            })}

            {/* 图例 */}
            <div className="flex items-center gap-4 pt-2 text-xs text-warm-dark/40 dark:text-dark-text/40">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#5a7a5a]" /> 碎片</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#b8a088]" /> 融合</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#4a7c9b]" /> 日记</span>
            </div>
          </div>
        )}
      </div>

      {/* ====== 碎片类型分布 ====== */}
      {typeDistWithColors.length > 0 && (
        <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5">
          <h3 className="font-semibold text-warm-dark dark:text-dark-text mb-4">🧩 碎片类型分布</h3>
          <div className="space-y-3">
            {typeDistWithColors.map(t => {
              const maxCount = typeDistWithColors[0]?.count || 1;
              const pct = (t.count / maxCount) * 100;
              const totalPct = key_metrics.total_fragments > 0
                ? Math.round((t.count / key_metrics.total_fragments) * 100)
                : 0;
              return (
                <div key={t.type} className="flex items-center gap-3">
                  <span
                    className="shrink-0 text-xs px-2 py-0.5 rounded-full text-white min-w-[40px] text-center"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="h-5 rounded-lg overflow-hidden bg-warm-dark/5 dark:bg-dark-border">
                      <div
                        className="h-full rounded-lg transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: t.color, opacity: 0.75 }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-warm-dark/50 dark:text-dark-text/50 w-12 text-right">
                    {t.count} ({totalPct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====== 活跃热力图 ====== */}
      <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-warm-dark dark:text-dark-text">🗓️ 活跃热力图</h3>
          <span className="text-xs text-warm-dark/30 dark:text-dark-text/30">过去84天</span>
        </div>

        <div className="flex flex-wrap gap-[3px]">
          {heatmapGrid.map(h => (
            <div
              key={h.date}
              className="w-[10px] h-[10px] rounded-sm transition-colors"
              style={{ backgroundColor: getHeatColor(h.count) }}
              title={`${h.date}: ${h.count}次活动`}
            />
          ))}
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-warm-dark/30 dark:text-dark-text/30">
          <span>少</span>
          {HEAT_LEVELS.map((level, i) => (
            <div
              key={i}
              className="w-[10px] h-[10px] rounded-sm"
              style={{ backgroundColor: level.color }}
            />
          ))}
          <span>多</span>
        </div>

        {heatmapGrid.every(h => h.count === 0) && (
          <p className="text-xs text-warm-dark/30 dark:text-dark-text/30 mt-2 text-center">
            持续使用后，这里会显示你的活跃分布 🌱
          </p>
        )}
      </div>

      {/* ====== 融合率圆环 ====== */}
      <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5 flex flex-col items-center">
        <h3 className="text-sm font-semibold text-warm-dark/60 dark:text-dark-text/60 mb-4">✨ 融合率</h3>
        <CompletionRing
          percentage={key_metrics.fusion_rate}
          connectedCount={key_metrics.total_fusions}
          totalCount={key_metrics.total_fragments}
          size={130}
          strokeWidth={11}
        />
        <p className="text-xs text-warm-dark/30 dark:text-dark-text/30 mt-3 text-center max-w-[240px]">
          融合率 = 融合次数 ÷ 碎片总数。越高说明你的碎片组合越活跃。
        </p>
      </div>

      {/* ====== 本周建议 ====== */}
      <div className="rounded-2xl bg-gradient-to-r from-warm-accent/10 to-warm-accent/5 dark:from-warm-accent/5 dark:to-dark-surface border border-warm-accent/15 dark:border-dark-border p-5">
        <h3 className="text-sm font-semibold text-warm-dark dark:text-dark-text mb-3">🎯 本周建议</h3>
        <ul className="space-y-2.5">
          {suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-warm-dark/70 dark:text-dark-text/70">
              <span className="shrink-0 text-base">{s.icon}</span>
              <span>{s.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- 子组件 ---------- */
function MetricCard({ emoji, label, value }: { emoji: string; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-4">
      <div className="text-xs text-warm-dark/40 dark:text-dark-text/40 mb-1">{emoji} {label}</div>
      <div className="text-2xl font-bold text-warm-dark dark:text-dark-text">{value}</div>
    </div>
  );
}
