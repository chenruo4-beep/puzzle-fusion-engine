'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';

const API_BASE = 'http://localhost:8000';

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
  position_x: number;
  position_y: number;
}

interface JourneyMapData {
  id: number;
  title: string;
  subtitle: string | null;
  difficulty: string | null;
  time_to_result: string | null;
  status: string;
  progress: number;
}

interface JourneyMapProps {
  mapId?: number;
  compact?: boolean;
  onSelectMap?: (mapId: number) => void;
}

// 地图布局配置 — 3x3 网格
const GRID_SIZE = 3;
const STEP_POSITIONS = [
  { x: 0, y: 2 }, // 起点：左下角
  { x: 1, y: 2 }, // 第二步
  { x: 2, y: 2 }, // 第三步
  { x: 2, y: 1 }, // 第四步
  { x: 1, y: 1 }, // 第五步（中心）
  { x: 0, y: 1 }, // 第六步
  { x: 0, y: 0 }, // 第七步
  { x: 1, y: 0 }, // 第八步
  { x: 2, y: 0 }, // 终点：右上角
];

const STATUS_COLORS: Record<string, string> = {
  locked: '#d4d0c8',
  active: '#c8965e',
  completed: '#5a7a5a',
};

const STATUS_LABELS: Record<string, string> = {
  locked: '未解锁',
  active: '进行中',
  completed: '已完成',
};

export default function JourneyMap({ mapId, compact = false, onSelectMap }: JourneyMapProps) {
  const [mapData, setMapData] = useState<JourneyMapData | null>(null);
  const [steps, setSteps] = useState<MapStep[]>([]);
  const [, setLoading] = useState(false);
  const [selectedStep, setSelectedStep] = useState<MapStep | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const { toast } = useToast();

  const fetchMapData = useCallback(async () => {
    if (!mapId) return;
    setLoading(true);
    try {
      const [mapRes, stepsRes] = await Promise.all([
        fetch(`${API_BASE}/api/journey-maps/${mapId}`),
        fetch(`${API_BASE}/api/journey-maps/${mapId}/steps`),
      ]);
      if (!mapRes.ok || !stepsRes.ok) throw new Error('加载失败');
      const map = await mapRes.json();
      const stepsData = await stepsRes.json();
      setMapData(map);
      setSteps(stepsData);
    } catch {
      toast('加载地图失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [mapId, toast]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  const updateStepProgress = async (stepId: number, newStatus: string, percent: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/journey-maps/${mapId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_number: stepId,
          step_status: newStatus,
          completion_percent: percent,
        }),
      });
      if (!res.ok) throw new Error('更新失败');
      toast('进度已更新', 'success');
      fetchMapData();
    } catch {
      toast('更新失败', 'error');
    }
  };

  // 紧凑模式：只显示地图缩略图
  if (compact) {
    return (
      <div
        className="bg-white rounded-xl border-2 border-warm-border p-4 cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => onSelectMap?.(mapId!)}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-warm-dark">{mapData?.title || '行进地图'}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
            {mapData?.progress || 0}%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {STEP_POSITIONS.map((pos, i) => {
            const step = steps.find(s => s.step_number === i + 1);
            const status = step?.status || 'locked';
            return (
              <div
                key={i}
                className="aspect-square rounded flex items-center justify-center text-xs"
                style={{ backgroundColor: STATUS_COLORS[status] + '40' }}
              >
                {step?.landmark_icon || '·'}
              </div>
            );
          })}
        </div>
        <div className="mt-2 h-1.5 bg-warm-border rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all"
            style={{ width: `${mapData?.progress || 0}%` }}
          />
        </div>
      </div>
    );
  }

  // 完整模式
  return (
    <div className="bg-white rounded-2xl border-2 border-warm-border p-6">
      {/* 地图标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-warm-dark">{mapData?.title}</h2>
          {mapData?.subtitle && (
            <p className="text-sm text-warm-dark/60 mt-1">{mapData.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {mapData?.difficulty && (
            <span className="text-xs px-2 py-1 rounded-full bg-warm-border/50">
              难度: {mapData.difficulty}
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-600">
            进度: {mapData?.progress || 0}%
          </span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="mb-6 h-2 bg-warm-border rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${mapData?.progress || 0}%` }}
        />
      </div>

      {/* 正方形地图 */}
      <div className="relative aspect-square max-w-lg mx-auto">
        {/* 背景网格 */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-warm-bg/30 rounded-lg" />
          ))}
        </div>

        {/* 路径线 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {STEP_POSITIONS.map((pos, i) => {
            if (i === STEP_POSITIONS.length - 1) return null;
            const next = STEP_POSITIONS[i + 1];
            const x1 = (pos.x / (GRID_SIZE - 1)) * 100 + 16.67;
            const y1 = ((GRID_SIZE - 1 - pos.y) / (GRID_SIZE - 1)) * 100 + 16.67;
            const x2 = (next.x / (GRID_SIZE - 1)) * 100 + 16.67;
            const y2 = ((GRID_SIZE - 1 - next.y) / (GRID_SIZE - 1)) * 100 + 16.67;
            return (
              <line
                key={i}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="#c8965e"
                strokeWidth="2"
                strokeDasharray="4 2"
                opacity="0.5"
              />
            );
          })}
        </svg>

        {/* 步骤节点 */}
        {STEP_POSITIONS.map((pos, i) => {
          const step = steps.find(s => s.step_number === i + 1);
          if (!step) return null;

          const isCompleted = step.status === 'completed';
          const isActive = step.status === 'active';
          {/* isLocked unused */}

          return (
            <div
              key={step.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-110 ${
                isActive ? 'animate-pulse' : ''
              }`}
              style={{
                left: `${(pos.x / (GRID_SIZE - 1)) * 100}%`,
                top: `${((GRID_SIZE - 1 - pos.y) / (GRID_SIZE - 1)) * 100}%`,
              }}
              onClick={() => {
                setSelectedStep(step);
                setShowDetail(true);
              }}
            >
              {/* 拼图块 */}
              <div
                className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                  isCompleted
                    ? 'bg-green-50 border-green-300'
                    : isActive
                    ? 'bg-amber-50 border-amber-400 shadow-lg'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="text-2xl">{step.landmark_icon}</span>
                <span className="text-[10px] text-center leading-tight mt-0.5 px-1">
                  {step.landmark}
                </span>
              </div>

              {/* 步骤编号 */}
              <div
                className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                  isCompleted ? 'bg-green-500' : isActive ? 'bg-amber-500' : 'bg-gray-400'
                }`}
              >
                {step.step_number}
              </div>

              {/* 3D小人（在当前步骤） */}
              {isActive && (
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 text-xl animate-bounce">
                  🚶
                </div>
              )}
            </div>
          );
        })}

        {/* 起点标记 */}
        <div className="absolute bottom-2 left-2 text-xs text-warm-dark/40">起点 🏁</div>
        {/* 终点标记 */}
        <div className="absolute top-2 right-2 text-xs text-warm-dark/40">终点 🏆</div>
      </div>

      {/* 步骤详情弹窗 */}
      {showDetail && selectedStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-modal-enter">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedStep.landmark_icon}</span>
                <div>
                  <h3 className="font-bold text-warm-dark">{selectedStep.landmark}</h3>
                  <p className="text-xs text-warm-dark/50">步骤 {selectedStep.step_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="text-warm-dark/40 hover:text-warm-dark"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-warm-dark mb-1">{selectedStep.title}</h4>
                <p className="text-sm text-warm-dark/70">{selectedStep.description}</p>
              </div>

              {selectedStep.action && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-amber-700 mb-1">具体行动</h4>
                  <p className="text-sm text-amber-800">{selectedStep.action}</p>
                </div>
              )}

              {selectedStep.time_estimate && (
                <div className="flex items-center gap-2 text-xs text-warm-dark/50">
                  <span>⏱️</span>
                  <span>预计时间: {selectedStep.time_estimate}</span>
                </div>
              )}

              {/* 进度控制 */}
              {selectedStep.status !== 'locked' && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs text-warm-dark/50">进度:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedStep.completion_percent}
                    onChange={(e) => {
                      const percent = parseInt(e.target.value);
                      const newStatus = percent === 100 ? 'completed' : percent > 0 ? 'active' : 'active';
                      updateStepProgress(selectedStep.step_number, newStatus, percent);
                    }}
                    className="flex-1 h-2 bg-warm-border rounded-full appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono w-10 text-right">{selectedStep.completion_percent}%</span>
                </div>
              )}

              {/* 状态标签 */}
              <div className="flex justify-center">
                <span
                  className="text-xs px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: STATUS_COLORS[selectedStep.status] + '20',
                    color: STATUS_COLORS[selectedStep.status],
                  }}
                >
                  {STATUS_LABELS[selectedStep.status]}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
