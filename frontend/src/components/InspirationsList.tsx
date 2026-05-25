'use client';

import { useState } from 'react';
import { LightbulbIcon } from '@/components/AppIcons';

/* ---------- 类型 ---------- */
export interface InspirationDirection {
  title: string;
  description: string;
}

export interface Inspiration {
  id: string;
  title: string;
  insight: string;
  action: string;
  directions?: InspirationDirection[];
  spark?: string;
  fragment_count: number;
  saved_at: string;
}

interface Props {
  inspirations: Inspiration[];
  onDelete: (id: string) => void;
  onConvertToFragment?: (insp: Inspiration) => void;
  onUseForFusion?: (insp: Inspiration) => void;
}

/* ---------- 工具函数 ---------- */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} 小时前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

/* ---------- 组件 ---------- */
export default function InspirationsList({ inspirations, onDelete, onConvertToFragment, onUseForFusion }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  if (inspirations.length === 0) {
    return (
      <div className="text-center py-16 text-warm-dark/40">
        <div className="mb-3 text-warm-accent/30"><LightbulbIcon size={40} /></div>
        <p className="text-base font-medium mb-2">还没有灵感火花</p>
        <p className="text-sm max-w-xs mx-auto">
          每次融合后，点击&quot;存入灵感集&quot;按钮，你的关键洞察就会出现在这里
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {inspirations.map((insp) => (
        <div
          key={insp.id}
          className="rounded-2xl bg-white/80 border border-warm-dark/10 p-5 hover:border-warm-accent/30 hover:shadow-sm transition-all group"
        >
          {/* 标题行 */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-base font-bold text-warm-dark leading-snug flex-1">
              ✨ {insp.title || '灵感火花'}
            </h3>
            <span className="shrink-0 text-xs text-warm-dark/30 whitespace-nowrap">
              {formatDate(insp.saved_at)}
            </span>
          </div>

          {/* 洞察 */}
          {insp.insight && (
            <p className="text-sm text-warm-dark/70 leading-relaxed mb-3">
              {insp.insight}
            </p>
          )}

          {/* 火花金句 */}
          {insp.spark && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-warm-accent/5 border border-warm-accent/10">
              <span className="text-xs text-warm-accent/60">💬 金句：</span>
              <span className="text-sm text-warm-accent/80 italic">{insp.spark}</span>
            </div>
          )}

          {/* 行动项 */}
          {insp.action && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-green-50 border border-green-100">
              <span className="text-xs text-green-600">🎯 下一步行动：</span>
              <span className="text-sm text-green-700">{insp.action}</span>
            </div>
          )}

          {/* 方向列表 */}
          {insp.directions && insp.directions.length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-warm-dark/40 mb-1.5 block">
                🧭 可选方向（{insp.directions.length}）
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {insp.directions.map((d, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-warm-dark/3 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-warm-dark/70">{d.title}</span>
                    <span className="text-warm-dark/40 ml-2">{d.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 底部信息 + 操作 */}
          <div className="flex items-center justify-between text-xs text-warm-dark/30">
            <span>🧩 {insp.fragment_count} 块拼图片</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const text = [
                    insp.title,
                    insp.insight,
                    insp.spark,
                    insp.action,
                    insp.directions?.map(d => `- ${d.title}: ${d.description}`).join('\n'),
                  ]
                    .filter(Boolean)
                    .join('\n\n');
                  handleCopy(text, insp.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-warm-accent hover:underline"
              >
                {copiedId === insp.id ? '✅ 已复制' : '📋 复制'}
              </button>
              {onConvertToFragment && (
                <button
                  onClick={() => onConvertToFragment(insp)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-green-500 hover:underline"
                >
                  🧩 转碎片
                </button>
              )}
              {onUseForFusion && (
                <button
                  onClick={() => onUseForFusion(insp)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:underline"
                >
                  🔥 去融合
                </button>
              )}
              <button
                onClick={() => onDelete(insp.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
              >
                🗑️ 删除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}