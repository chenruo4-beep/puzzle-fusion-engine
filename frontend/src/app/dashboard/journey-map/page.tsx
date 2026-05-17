'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import JourneyMap from '@/components/JourneyMap';
import { useToast } from '@/components/Toast';

const API_BASE = 'http://localhost:8000';

interface JourneyMapItem {
  id: number;
  title: string;
  subtitle: string | null;
  difficulty: string | null;
  time_to_result: string | null;
  status: string;
  progress: number;
  created_at: string;
}

export default function JourneyMapListPage() {
  const [maps, setMaps] = useState<JourneyMapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMap, setSelectedMap] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchMaps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/journey-maps/`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setMaps(data);
    } catch {
      toast('加载地图列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const deleteMap = async (mapId: number) => {
    if (!confirm('确定要删除这张地图吗？')) return;
    try {
      const res = await fetch(`${API_BASE}/api/journey-maps/${mapId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('删除失败');
      toast('地图已删除', 'success');
      fetchMaps();
    } catch {
      toast('删除失败', 'error');
    }
  };

  if (selectedMap) {
    return (
      <div className="p-4">
        <button
          onClick={() => setSelectedMap(null)}
          className="mb-4 flex items-center gap-2 text-sm text-warm-dark/60 hover:text-warm-dark"
        >
          ← 返回地图列表
        </button>
        <JourneyMap mapId={selectedMap} />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-warm-dark">我的行进地图</h1>
          <p className="text-sm text-warm-dark/50 mt-1">每张地图都是一个融合方向的可视化路线</p>
        </div>
        <Link
          href="/dashboard/fusion"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          + 新建地图
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-warm-dark/50">加载中...</div>
      ) : maps.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="text-lg font-medium text-warm-dark mb-2">还没有地图</h3>
          <p className="text-sm text-warm-dark/50 mb-4">去融合页面生成你的第一张行进地图</p>
          <Link
            href="/dashboard/fusion"
            className="inline-flex px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            开始融合
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {maps.map((map) => (
            <div
              key={map.id}
              className="bg-white rounded-xl border-2 border-warm-border p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedMap(map.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-warm-dark">{map.title}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMap(map.id);
                  }}
                  className="text-warm-dark/30 hover:text-red-500 text-sm"
                >
                  🗑️
                </button>
              </div>

              {map.subtitle && (
                <p className="text-xs text-warm-dark/50 mb-3 line-clamp-2">{map.subtitle}</p>
              )}

              <div className="flex items-center gap-2 mb-3">
                {map.difficulty && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-warm-border/50">
                    难度: {map.difficulty}
                  </span>
                )}
                {map.time_to_result && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-warm-border/50">
                    ⏱️ {map.time_to_result}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-warm-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${map.progress}%` }}
                  />
                </div>
                <span className="text-xs text-amber-600 font-medium">{map.progress}%</span>
              </div>

              <div className="mt-3 flex gap-2">
                <Link
                  href={`/dashboard/journey-map/${map.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-center py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-medium transition-colors"
                >
                  🗺️ 地图视图
                </Link>
                <Link
                  href={`/dashboard/journey-map/${map.id}?text=1`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-center py-2 bg-warm-bg hover:bg-warm-border/50 text-warm-dark rounded-lg text-xs font-medium transition-colors"
                >
                  📝 文字版
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
