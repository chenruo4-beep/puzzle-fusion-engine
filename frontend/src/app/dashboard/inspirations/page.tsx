'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import InspirationsList from '@/components/InspirationsList';
import { SkeletonHeader, SkeletonCard } from '@/components/Skeleton';
import type { Inspiration } from '@/components/InspirationsList';
import { LightbulbIcon } from '@/components/AppIcons';

const API_BASE = '/api/inspirations';

export default function InspirationsPage() {
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // 从 API 加载灵感集
  const fetchInspirations = useCallback(async () => {
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // API 返回 id 为 number，转为 string 匹配组件期望
      setInspirations(
        (Array.isArray(data) ? data : []).map((item: Record<string, unknown>) => ({
          ...item,
          id: String(item.id),
        })) as Inspiration[]
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchInspirations();
  }, [fetchInspirations]);

  // 删除灵感（调 API）
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setInspirations((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      alert('删除失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  // 清空全部（逐个调 API）
  const handleClearAll = async () => {
    if (!confirm('确定要清空所有灵感吗？此操作不可恢复。')) return;
    try {
      await Promise.all(
        inspirations.map((i) =>
          fetch(`${API_BASE}/${i.id}`, { method: 'DELETE' })
        )
      );
      setInspirations([]);
    } catch (err) {
      alert('清空失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  if (!mounted) {
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

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-dark flex items-center gap-2"><LightbulbIcon size={24} className="text-warm-accent" /> 灵感集</h1>
          <p className="text-sm text-warm-dark/40 mt-1">
            你的每一个关键洞察，都像一块拼图等待被拼上
          </p>
        </div>
        {!loading && inspirations.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-warm-dark/30 hover:text-red-500 transition-colors"
          >
            清空全部
          </button>
        )}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="space-y-6">
          <SkeletonHeader />
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-center">
          <p className="text-sm text-red-600">加载失败：{error}</p>
          <button
            onClick={fetchInspirations}
            className="mt-2 text-sm text-red-500 hover:underline"
          >
            重试
          </button>
        </div>
      )}

      {/* 统计条 */}
      {!loading && !error && inspirations.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-warm-dark/40">
          <span>共 {inspirations.length} 条灵感</span>
          <span className="w-px h-3 bg-warm-dark/10" />
          <span>
            最近保存：
            {inspirations[0]?.saved_at
              ? new Date(inspirations[0].saved_at).toLocaleDateString('zh-CN')
              : '无'}
          </span>
        </div>
      )}

      {/* 灵感列表 */}
      {!loading && !error && (
        <InspirationsList
          inspirations={inspirations}
          onDelete={handleDelete}
        />
      )}

      {/* 底部引导 */}
      {!loading && (
        <div className="rounded-2xl bg-gradient-to-r from-warm-accent/5 to-transparent border border-warm-accent/10 p-4 text-center">
          <p className="text-sm text-warm-dark/50">
            💡 灵感不会孤立存在——把它们放一起，就能拼出更大的图景
          </p>
          <Link
            href="/dashboard/fusion"
            className="mt-2 inline-block text-sm text-warm-accent hover:underline"
          >
            去融合新灵感 →
          </Link>
        </div>
      )}
    </div>
  );
}
