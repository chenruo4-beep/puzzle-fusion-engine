'use client';

import { useEffect, useState } from 'react';

interface Direction {
  title: string;
  description: string;
  [key: string]: unknown;
}

interface FusionResult {
  title?: string;
  spark?: string;
  insight?: string;
  action?: string;
  directions?: Direction[];
  [key: string]: unknown;
}

interface FusionModalProps {
  show: boolean;
  loading: boolean;
  saving: boolean;
  result: FusionResult | null;
  engagedCount: number;
  onClose: () => void;
  onSave: () => void;
  onSaveToInspiration?: () => void;
}

const SPARKLE_PHASES = [
  '扫描拼图片...',
  '发现交叉点...',
  '生成洞察...',
  '整理行动...',
  '即将完成...',
];

export default function FusionModal({
  show,
  loading,
  saving,
  result,
  engagedCount,
  onClose,
  onSave,
  onSaveToInspiration,
}: FusionModalProps) {
  const [sparklePhase, setSparklePhase] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setSparklePhase(prev => (prev + 1) % SPARKLE_PHASES.length);
    }, 800);
    return () => clearInterval(interval);
  }, [loading]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="modal-enter w-full max-w-md mx-4 rounded-2xl bg-white/96 backdrop-blur-sm shadow-2xl overflow-hidden border border-warm-accent/10"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-dark/5 bg-gradient-to-r from-warm-accent/8 to-transparent">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <h2 className="text-base font-bold text-warm-dark">灵感火花</h2>
              <p className="text-xs text-warm-dark/40">{engagedCount} 块拼图片融合</p>
            </div>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-warm-dark/10 text-warm-dark/40 hover:text-warm-dark/70 transition-all"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {loading ? (
            /* ─── Loading State ─── */
            <div className="flex flex-col items-center py-8 space-y-6">
              {/* Spark particles */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-warm-accent/10 animate-ping" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-0 rounded-full bg-warm-accent/15 animate-pulse" style={{ animationDuration: '2s' }} />
                <span className="relative text-4xl animate-pulse">⚡</span>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs space-y-2">
                <div className="h-1.5 bg-warm-dark/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-warm-accent via-amber-400 to-warm-accent animate-shimmer"
                    style={{
                      backgroundSize: '200% 100%',
                      animation: 'progress-fill 4s ease-out forwards, shimmer 1.5s ease-in-out infinite',
                    }}
                  />
                </div>
                <p className="text-center text-sm text-warm-dark/60 font-medium transition-all duration-300">
                  {SPARKLE_PHASES[sparklePhase]}
                </p>
              </div>

              {/* Engaged fragments preview */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {Array.from({ length: engagedCount }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-warm-accent/40"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : result ? (
            /* ─── Result State ─── */
            <div className="space-y-4">
              {/* Insight card */}
              {result.insight && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-warm-accent/8 to-amber-50 border border-warm-accent/15">
                  <p className="text-sm text-warm-dark/50 mb-1 font-medium uppercase tracking-wide">核 心 洞 察</p>
                  <p className="text-lg font-bold text-warm-dark leading-snug">{result.insight}</p>
                </div>
              )}

              {/* Directions */}
              {result.directions && result.directions.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs text-warm-dark/40 font-semibold uppercase tracking-wide">拓展方向</p>
                  {result.directions.map((dir, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-warm-light/60 border border-warm-dark/5 hover:border-warm-accent/20 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-warm-accent/15 text-warm-accent flex items-center justify-center text-xs font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-warm-dark mb-1">{dir.title}</h4>
                          <p className="text-xs text-warm-dark/60 leading-relaxed">{dir.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action card */}
              {result.action && (
                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-100">
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">👉</span>
                    <div>
                      <p className="text-xs text-emerald-600 font-semibold mb-1">今天就可以做</p>
                      <p className="text-sm text-emerald-800 font-medium">{result.action}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Spark text */}
              {result.spark && (
                <p className="text-xs text-warm-dark/40 italic text-center leading-relaxed">
                  {result.spark}
                </p>
              )}
            </div>
          ) : (
            /* ─── Error / Empty State ─── */
            <div className="text-center py-8">
              <div className="text-4xl mb-3">😶‍🌫️</div>
              <p className="text-sm text-warm-dark/50">灵感没有碰撞出火花</p>
              <p className="text-xs text-warm-dark/30 mt-1">换个组合再试一次</p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        {!loading && result && (
          <div className="px-5 py-4 border-t border-warm-dark/5 bg-warm-light/30">
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2.5 rounded-xl border border-warm-dark/10 text-sm text-warm-dark/50 hover:bg-warm-dark/5 transition-all"
              >
                关闭
              </button>
              {onSaveToInspiration && (
                <button
                  onClick={onSaveToInspiration}
                  className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 font-medium hover:bg-amber-100 transition-all flex items-center gap-1.5"
                >
                  <span>💫</span> 灵感集
                </button>
              )}
              <button
                onClick={onSave}
                disabled={saving}
                className="flex-1 px-3 py-2.5 rounded-xl bg-warm-accent text-white text-sm font-medium hover:bg-warm-accent/90 transition-all disabled:opacity-40 shadow-md shadow-warm-accent/10"
              >
                {saving ? '保存中...' : '💾 保存结果'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}