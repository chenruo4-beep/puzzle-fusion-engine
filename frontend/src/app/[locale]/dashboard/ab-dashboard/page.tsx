'use client';

import { useState, useEffect } from 'react';
import { SkeletonHeader, SkeletonCard } from '@/components/Skeleton';

/* ---------- 类型 ---------- */
interface VersionStats {
  page_views: number;
  cta_clicks: number;
  conversion_rate: number;
  lift_vs_a: number | null;
}

interface ABStatsResponse {
  total_events: number;
  stats: Record<string, VersionStats>;
  versions: string[];
}

/* ---------- 常量 ---------- */

const VERSION_COLORS: Record<string, { bar: string; bg: string; text: string }> = {
  A: { bar: '#7a9b4a', bg: '#f7f9f2', text: '#4a6a2a' },
  B: { bar: '#4a7c9b', bg: '#f2f5f9', text: '#2a5a7a' },
  C: { bar: '#b8a088', bg: '#faf7f4', text: '#886048' },
  D: { bar: '#9b6c4a', bg: '#faf5f2', text: '#6a3a2a' },
};
const FALLBACK_COLOR = { bar: '#b8a088', bg: '#faf7f4', text: '#886048' };

/* ---------- 占位数据生成 ---------- */
function generateMockData(): ABStatsResponse {
  return {
    total_events: 0,
    stats: {
      A: { page_views: 0, cta_clicks: 0, conversion_rate: 0, lift_vs_a: 0 },
      B: { page_views: 0, cta_clicks: 0, conversion_rate: 0, lift_vs_a: 0 },
    },
    versions: ['A', 'B'],
  };
}

/* ---------- 柱状图组件 ---------- */
function BarChart({
  stats,
  versions,
}: {
  stats: Record<string, VersionStats>;
  versions: string[];
}) {
  // 找到最大 page_view 值作为满刻度基准
  const maxPageViews = Math.max(
    ...versions.map((v) => stats[v]?.page_views ?? 0),
    1
  );

  return (
    <div className="space-y-6">
      {/* ====== 页面浏览量 ====== */}
      <div>
        <h4 className="text-xs font-semibold text-warm-dark/50 mb-3 tracking-wide uppercase">
          📄 页面浏览量 (Page Views)
        </h4>
        <div className="space-y-3">
          {versions.map((v) => {
            const pageViews = stats[v]?.page_views ?? 0;
            const pct = Math.round((pageViews / maxPageViews) * 100);
            const colors = VERSION_COLORS[v] ?? FALLBACK_COLOR;

            return (
              <div key={`pv-${v}`} className="flex items-center gap-3">
                {/* 版本标签 */}
                <span
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: colors.bar }}
                >
                  {v}
                </span>
                {/* 柱子 */}
                <div className="flex-1 min-w-0">
                  <div className="relative h-7 rounded-lg overflow-hidden" style={{ backgroundColor: colors.bg }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700 ease-out"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: colors.bar,
                        opacity: 0.85,
                      }}
                    />
                    <span
                      className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold"
                      style={{ color: pct > 30 ? '#fff' : colors.text }}
                    >
                      {pageViews}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ====== CTA 点击数 ====== */}
      <div>
        <h4 className="text-xs font-semibold text-warm-dark/50 mb-3 tracking-wide uppercase">
          🖱️ CTA 点击 (CTA Clicks)
        </h4>
        <div className="space-y-3">
          {versions.map((v) => {
            const ctaClicks = stats[v]?.cta_clicks ?? 0;
            const maxClicks = Math.max(
              ...versions.map((x) => stats[x]?.cta_clicks ?? 0),
              1
            );
            const pct = Math.round((ctaClicks / maxClicks) * 100);
            const colors = VERSION_COLORS[v] ?? FALLBACK_COLOR;

            return (
              <div key={`cta-${v}`} className="flex items-center gap-3">
                <span
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: colors.bar }}
                >
                  {v}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="relative h-7 rounded-lg overflow-hidden" style={{ backgroundColor: colors.bg }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700 ease-out"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: colors.bar,
                        opacity: 0.85,
                      }}
                    />
                    <span
                      className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold"
                      style={{ color: pct > 30 ? '#fff' : colors.text }}
                    >
                      {ctaClicks}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- 主页面 ---------- */
export default function ABDashboardPage() {
  const [data, setData] = useState<ABStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch('/api/analytics/stats');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ABStatsResponse = await res.json();
        setData(json);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '未知错误';
        setError(msg);
        // 后端不可用时用 mock 数据展示 UI
        setData(generateMockData());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ---- 加载态 ---- */
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

  if (!data) return null;

  const { stats, versions, total_events } = data;

  return (
    <div className="space-y-6">
      {/* ====== 页面标题 ====== */}
      <div>
        <h1 className="text-2xl font-bold text-warm-dark">📊 A/B 测试数据看板</h1>
        <p className="text-sm text-warm-dark/40 mt-1">
          实时对比不同版本的转化表现，数据驱动决策
        </p>
        {error && (
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ 后端连接异常（{error}），显示缓存数据
          </p>
        )}
      </div>

      {/* ====== 总览卡片 ====== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-4">
          <div className="text-xs text-warm-dark/40 mb-1">📡 总事件</div>
          <div className="text-2xl font-bold text-warm-dark">{total_events}</div>
        </div>
        <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-4">
          <div className="text-xs text-warm-dark/40 mb-1">🧪 测试版本</div>
          <div className="text-2xl font-bold text-warm-dark">{versions.length}</div>
        </div>
        <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-4">
          <div className="text-xs text-warm-dark/40 mb-1">👀 总浏览</div>
          <div className="text-2xl font-bold text-warm-dark">
            {versions.reduce((sum, v) => sum + (stats[v]?.page_views ?? 0), 0)}
          </div>
        </div>
        <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-4">
          <div className="text-xs text-warm-dark/40 mb-1">🖱️ 总点击</div>
          <div className="text-2xl font-bold text-warm-dark">
            {versions.reduce((sum, v) => sum + (stats[v]?.cta_clicks ?? 0), 0)}
          </div>
        </div>
      </div>

      {/* ====== 转化率对比卡片 ====== */}
      <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-5">
        <h3 className="font-semibold text-warm-dark mb-4">📈 转化率对比</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {versions.map((v) => {
            const s = stats[v];
            if (!s) return null;
            const colors = VERSION_COLORS[v] ?? FALLBACK_COLOR;
            const isWinner =
              s.conversion_rate > 0 &&
              versions.every(
                (other) =>
                  other === v || s.conversion_rate >= (stats[other]?.conversion_rate ?? 0)
              );

            return (
              <div
                key={`card-${v}`}
                className="rounded-xl border p-4 relative overflow-hidden"
                style={{ borderColor: colors.bar + '30', backgroundColor: colors.bg }}
              >
                {/* 冠军标记 */}
                {isWinner && versions.length > 1 && (
                  <div className="absolute -top-1 -right-1 w-12 h-12 flex items-start justify-end">
                    <span className="text-lg transform rotate-12">🏆</span>
                  </div>
                )}

                {/* 版本名 */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: colors.bar }}
                  >
                    {v}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: colors.text }}>
                    版本 {v}
                  </span>
                </div>

                {/* 转化率数字 */}
                <div className="mb-3">
                  <div className="text-3xl font-bold" style={{ color: colors.bar }}>
                    {s.conversion_rate}%
                  </div>
                  <div className="text-xs text-warm-dark/40 mt-0.5">转化率</div>
                </div>

                {/* 子指标 */}
                <div className="flex gap-4 text-xs text-warm-dark/50">
                  <span>
                    {s.page_views} 浏览
                  </span>
                  <span className="w-px bg-warm-dark/15" />
                  <span>
                    {s.cta_clicks} 点击
                  </span>
                </div>

                {/* 提升幅度 */}
                {v !== 'A' && s.lift_vs_a !== null && s.lift_vs_a !== 0 && (
                  <div
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                    style={{
                      backgroundColor:
                        s.lift_vs_a > 0
                          ? '#dcfce7'
                          : '#fee2e2',
                      color:
                        s.lift_vs_a > 0
                          ? '#166534'
                          : '#991b1b',
                    }}
                  >
                    {s.lift_vs_a > 0 ? '📈' : '📉'}
                    相对版本A {s.lift_vs_a > 0 ? '+' : ''}{s.lift_vs_a}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ====== 柱状图 ====== */}
      <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-5">
        <h3 className="font-semibold text-warm-dark mb-4">📊 可视化分布</h3>
        <BarChart stats={stats} versions={versions} />
      </div>

      {/* ====== 数据表 ====== */}
      <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-5 overflow-x-auto">
        <h3 className="font-semibold text-warm-dark mb-3">📋 详细数据</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-warm-dark/10 text-left text-warm-dark/50 text-xs uppercase tracking-wide">
              <th className="py-2 pr-4 font-medium">版本</th>
              <th className="py-2 pr-4 font-medium">页面浏览</th>
              <th className="py-2 pr-4 font-medium">CTA 点击</th>
              <th className="py-2 pr-4 font-medium">转化率</th>
              <th className="py-2 font-medium">vs 版本A</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => {
              const s = stats[v];
              if (!s) return null;
              const colors = VERSION_COLORS[v] ?? FALLBACK_COLOR;

              return (
                <tr key={`row-${v}`} className="border-b border-warm-dark/5 last:border-0">
                  <td className="py-2.5 pr-4">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: colors.bar }}
                    >
                      {v}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-semibold text-warm-dark">
                    {s.page_views}
                  </td>
                  <td className="py-2.5 pr-4 font-semibold text-warm-dark">
                    {s.cta_clicks}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.bar,
                      }}
                    >
                      {s.conversion_rate}%
                    </span>
                  </td>
                  <td className="py-2.5">
                    {v === 'A' ? (
                      <span className="text-xs text-warm-dark/25">— 基准 —</span>
                    ) : s.lift_vs_a === null ? (
                      <span className="text-xs text-warm-dark/25">N/A</span>
                    ) : (
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: s.lift_vs_a > 0 ? '#166534' : s.lift_vs_a < 0 ? '#991b1b' : '#666',
                        }}
                      >
                        {s.lift_vs_a > 0 ? '+' : ''}{s.lift_vs_a}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ====== 空态引导 ====== */}
      {total_events === 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-warm-accent/5 to-warm-light border border-warm-accent/10 p-6 text-center">
          <div className="text-4xl mb-3">📡</div>
          <p className="text-warm-dark/60 font-medium mb-1">
            还没有埋点数据
          </p>
          <p className="text-sm text-warm-dark/35">
            当用户访问你的页面时，page_view 和 cta_click 事件会自动流入这里。
            <br />
            你可以在控制台运行以下命令模拟一条测试数据：
          </p>
          <div className="mt-3 inline-block bg-warm-dark/5 rounded-lg px-4 py-2 text-xs font-mono text-warm-dark/60 select-all">
            {`curl -X POST apiUrl('/api/analytics/event') \\\n  -H 'Content-Type: application/json' \\\n  -d '{"version":"A","event_type":"page_view","user_id":"test-1"}'`}
          </div>
        </div>
      )}

      {/* ====== 底部提示 ====== */}
      <div className="rounded-2xl bg-gradient-to-r from-warm-accent/10 to-warm-accent/5 border border-warm-accent/15 p-4 text-center">
        <p className="text-sm text-warm-dark/60">
          💡 A/B 测试的核心不是选赢家，而是理解用户为什么选择
        </p>
      </div>
    </div>
  );
}
import { authFetch  } from '@/lib/api';