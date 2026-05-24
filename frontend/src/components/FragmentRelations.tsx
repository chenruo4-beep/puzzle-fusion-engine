'use client';

import { useState, useEffect, useCallback } from 'react';


interface RelationItem {
  id: number;
  content: string;
  fragment_type: string;
  quality_score: number;
  similarity: number;
  relation_score: number;
}

interface RelationData {
  fragment_id: number;
  fragment_content: string;
  fragment_type: string;
  relation_count: number;
  relation_labels: string[];
  relations: RelationItem[];
  message: string;
}

const TYPE_COLORS: Record<string, string> = {
  '技能': '#4a7c9b',
  '经历': '#5a7a5a',
  '习惯': '#c49a6c',
  '知识': '#7a6a9b',
  '资源': '#7a9b4a',
  '能力': '#b8a088',
};

interface FragmentRelationsProps {
  fragmentId: number;
  compact?: boolean; // 紧凑模式：只显示数量徽章
}

export default function FragmentRelations({ fragmentId, compact = false }: FragmentRelationsProps) {
  const [data, setData] = useState<RelationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRelations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/fragments/${fragmentId}/relations`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result: RelationData = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [fragmentId]);

  // 首次加载
  useEffect(() => {
    fetchRelations();
  }, [fetchRelations]);

  // 紧凑模式：只显示关联数量徽章
  if (compact) {
    if (!data || data.relation_count === 0) return null;
    return (
      <button
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
        title={data.message}
      >
        🔗 {data.relation_count}
      </button>
    );
  }

  return (
    <div className="mt-2">
      {/* 关联提示条 */}
      {data && data.relation_count > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50">
            🔗 {data.relation_count} 个关联
          </span>
          {data.relation_labels.length > 0 && (
            <span className="text-warm-dark/40">
              {data.relation_labels.join(' · ')}
            </span>
          )}
          <span className="text-warm-dark/30">
            {expanded ? '▲' : '▼'}
          </span>
        </button>
      )}

      {/* 展开的关联列表 */}
      {expanded && data && (
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-indigo-100">
          {data.relations.map((rel) => {
            const typeColor = TYPE_COLORS[rel.fragment_type] || '#b8a088';
            return (
              <div
                key={rel.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-white/40 hover:bg-white/60 transition-colors"
              >
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] text-white shrink-0"
                  style={{ backgroundColor: typeColor }}
                >
                  {rel.fragment_type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-warm-dark/70 truncate">
                    {rel.content}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-warm-dark/30">
                      相似度 {Math.round(rel.similarity * 100)}%
                    </span>
                    {rel.quality_score > 0 && (
                      <span className="text-[10px] text-amber-500">
                        {'★'.repeat(rel.quality_score)}{'☆'.repeat(5 - rel.quality_score)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 无关联提示 */}
      {data && data.relation_count === 0 && !loading && (
        <span className="text-[10px] text-warm-dark/25">
          暂无关联碎片
        </span>
      )}

      {/* 加载中 */}
      {loading && (
        <span className="text-[10px] text-warm-dark/30 animate-pulse">
          分析关联中…
        </span>
      )}

      {/* 错误 */}
      {error && (
        <span className="text-[10px] text-rose-400">
          关联分析失败
        </span>
      )}
    </div>
  );
}
import { authFetch  } from '@/lib/api';
