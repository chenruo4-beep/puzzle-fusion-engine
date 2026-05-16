'use client';

import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

interface BundleFragment {
  id: number;
  content: string;
  fragment_type: string;
  color: string;
}

interface FusionExample {
  fusion_id: number;
  title: string;
  created_at: string;
}

interface Bundle {
  id: string;
  name: string;
  description: string;
  support: number;
  confidence: number;
  lift: number;
  score: number;
  examples: FusionExample[];
  fragments: BundleFragment[];
  theme_color: string;
}

interface BundleResponse {
  bundles: Bundle[];
  total_fusions: number;
  total_pairs_found: number;
  message: string;
}

export default function SmartBundleRecommend() {
  const [data, setData] = useState<BundleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);

  useEffect(() => {
    fetchBundles();
  }, []);

  const fetchBundles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/cooccurrence/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: BundleResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/60 border border-warm-dark/8 p-5 animate-pulse">
        <div className="h-5 bg-warm-dark/10 rounded w-1/3 mb-3" />
        <div className="h-20 bg-warm-dark/5 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 text-sm text-rose-600">
        <p>⚠️ 智能组块加载失败：{error}</p>
        <button onClick={fetchBundles} className="mt-2 text-rose-500 hover:underline">重试</button>
      </div>
    );
  }

  if (!data || data.bundles.length === 0) {
    return (
      <div className="rounded-2xl bg-white/60 border border-warm-dark/8 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📦</span>
          <h3 className="font-bold text-warm-dark">智能组块推荐</h3>
        </div>
        <p className="text-sm text-warm-dark/50">
          {data?.message || '多融合几次，AI 会帮你发现哪些碎片经常一起出现'}
        </p>
        {data && data.total_fusions > 0 && (
          <p className="text-xs text-warm-dark/30 mt-1">
            已记录 {data.total_fusions} 次融合，{data.total_pairs_found} 对组合
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/60 border border-warm-dark/8 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📦</span>
          <h3 className="font-bold text-warm-dark">智能组块推荐</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-warm-accent/10 text-warm-accent font-medium">
            {data.bundles.length} 个
          </span>
        </div>
        <button
          onClick={fetchBundles}
          className="text-xs text-warm-dark/40 hover:text-warm-accent transition-colors"
          title="刷新"
        >
          🔄
        </button>
      </div>

      <p className="text-xs text-warm-dark/40 mb-4">
        基于 {data.total_fusions} 次融合历史，发现 {data.total_pairs_found} 对高频组合
      </p>

      <div className="space-y-3">
        {data.bundles.map((bundle) => (
          <div
            key={bundle.id}
            className="rounded-xl border border-warm-dark/8 overflow-hidden transition-all hover:shadow-md"
            style={{ borderLeftWidth: '3px', borderLeftColor: bundle.theme_color }}
          >
            {/* Bundle Header */}
            <div
              className="p-3 cursor-pointer bg-white/40 hover:bg-white/60 transition-colors"
              onClick={() => setExpandedBundle(expandedBundle === bundle.id ? null : bundle.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🧩</span>
                  <span className="font-bold text-sm text-warm-dark">{bundle.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-warm-dark/5 text-warm-dark/50">
                    共现 {bundle.support} 次
                  </span>
                  <span className="text-xs text-warm-dark/30">
                    {expandedBundle === bundle.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-warm-dark/50 mt-1">{bundle.description}</p>
            </div>

            {/* Expanded Content */}
            {expandedBundle === bundle.id && (
              <div className="px-3 pb-3 space-y-3">
                {/* Fragments */}
                <div className="space-y-2">
                  {bundle.fragments.map((frag) => (
                    <div
                      key={frag.id}
                      className="flex items-start gap-2 p-2.5 rounded-lg bg-white/60 border border-warm-dark/5"
                    >
                      <span
                        className="px-2 py-0.5 rounded-full text-xs text-white shrink-0"
                        style={{ backgroundColor: frag.color }}
                      >
                        {frag.fragment_type}
                      </span>
                      <p className="text-xs text-warm-dark/70 leading-relaxed">{frag.content}</p>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-warm-dark/40">
                  <span title="支持度：共同出现次数">
                    📊 支持度: {bundle.support}
                  </span>
                  <span title="置信度：平均条件概率">
                    🎯 置信度: {(bundle.confidence * 100).toFixed(0)}%
                  </span>
                  <span title="提升度：相关性指标">
                    📈 提升度: {bundle.lift.toFixed(2)}
                  </span>
                </div>

                {/* Fusion Examples */}
                {bundle.examples.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-warm-dark/40 font-medium">最近一起出现：</p>
                    {bundle.examples.map((ex) => (
                      <div
                        key={ex.fusion_id}
                        className="flex items-center gap-2 text-xs text-warm-dark/50 px-2 py-1 rounded bg-warm-dark/3"
                      >
                        <span>🔗</span>
                        <span className="truncate">{ex.title}</span>
                        <span className="text-warm-dark/30 ml-auto shrink-0">
                          {ex.created_at ? new Date(ex.created_at).toLocaleDateString('zh-CN') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action */}
                <div className="pt-1">
                  <button
                    onClick={() => {
                      // Dispatch event for PuzzleBoard to listen
                      window.dispatchEvent(new CustomEvent('puzzle:select-bundle', {
                        detail: { fragmentIds: bundle.fragments.map(f => f.id) }
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: bundle.theme_color }}
                  >
                    🚀 用这组碎片开始融合
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
