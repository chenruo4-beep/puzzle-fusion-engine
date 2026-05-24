'use client';

import { useState, useEffect, useCallback } from 'react';


interface MapStep {
  id: number;
  step_number: number;
  title: string;
  description: string | null;
  landmark: string | null;
  landmark_icon: string | null;
  time_estimate: string | null;
  action: string | null;
  status: string;
  completion_percent: number;
}

interface JourneyMapData {
  id: number;
  title: string;
  subtitle: string | null;
  difficulty: string | null;
  time_to_result: string | null;
  progress: number;
}

interface JourneyMapTextProps {
  mapId?: number;
}

export default function JourneyMapText({ mapId }: JourneyMapTextProps) {
  const [mapData, setMapData] = useState<JourneyMapData | null>(null);
  const [steps, setSteps] = useState<MapStep[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!mapId) return;
    setLoading(true);
    try {
      const [mapRes, stepsRes] = await Promise.all([
        authFetch(`/api/journey-maps/${mapId}`),
        authFetch(`/api/journey-maps/${mapId}/steps`),
      ]);
      if (!mapRes.ok || !stepsRes.ok) throw new Error('加载失败');
      const map = await mapRes.json();
      const stepsData = await stepsRes.json();
      setMapData(map);
      setSteps(stepsData);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [mapId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="text-sm text-warm-dark/50">加载中...</div>;
  }

  if (!mapData) {
    return <div className="text-sm text-warm-dark/50">暂无地图</div>;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'active': return '▶️';
      default: return '⬜';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-warm-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-warm-dark">{mapData.title}</h3>
        <span className="text-xs text-amber-600">{mapData.progress}%</span>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-start gap-3 p-3 rounded-lg ${
              step.status === 'active' ? 'bg-amber-50 border border-amber-200' : 'bg-warm-bg/30'
            }`}
          >
            <span className="text-lg shrink-0">{getStatusIcon(step.status)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-warm-dark">{step.title}</span>
                {step.landmark_icon && (
                  <span className="text-xs">{step.landmark_icon}</span>
                )}
              </div>
              {step.description && (
                <p className="text-xs text-warm-dark/60 mt-1">{step.description}</p>
              )}
              {step.action && (
                <p className="text-xs text-amber-700 mt-1">→ {step.action}</p>
              )}
              {step.time_estimate && (
                <p className="text-[10px] text-warm-dark/40 mt-1">⏱️ {step.time_estimate}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 进度条 */}
      <div className="mt-4 h-1.5 bg-warm-border rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all"
          style={{ width: `${mapData.progress}%` }}
        />
      </div>
    </div>
  );
}
import { authFetch  } from '@/lib/api';
