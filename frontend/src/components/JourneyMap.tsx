'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { authFetch  } from '@/lib/api';


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

// P2.4: 人格隐喻区域
const PERSONALITY_ZONES = [
  {
    label: '被低估的品质',
    steps: [1, 2, 3],
    left: '8%', top: '8%', width: '84%', height: '38%',
    color: '#d4a050', lockedColor: '#d4d0c8',
  },
  {
    label: '本能的天赋',
    steps: [4, 5],
    left: '54%', top: '42%', width: '38%', height: '50%',
    color: '#5a9a7a', lockedColor: '#d4d0c8',
  },
  {
    label: '恐惧的另一面',
    steps: [6, 7],
    left: '8%', top: '42%', width: '38%', height: '50%',
    color: '#8a7aaa', lockedColor: '#d4d0c8',
  },
  {
    label: '未打开的抽屉',
    steps: [8, 9],
    left: '8%', top: '76%', width: '84%', height: '20%',
    color: '#5a8aaa', lockedColor: '#d4d0c8',
  },
];


export default function JourneyMap({ mapId, compact = false, onSelectMap }: JourneyMapProps) {
  const [mapData, setMapData] = useState<JourneyMapData | null>(null);
  const [steps, setSteps] = useState<MapStep[]>([]);
  const [, setLoading] = useState(false);
  const [selectedStep, setSelectedStep] = useState<MapStep | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [narrativeMode, setNarrativeMode] = useState<'epic' | 'experiment'>('experiment');
  const [showReview, setShowReview] = useState(false);
  interface ReviewData {
    narrative: string;
    origin_fragments?: { type: string; content: string }[];
    gains?: string[];
  }
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const { toast } = useToast();

  const fetchMapData = useCallback(async () => {
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
    } catch {
      toast('加载地图失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [mapId, toast]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  useEffect(() => {
    if (!mapId || !mapData) return;
    authFetch(`/api/journey-maps/${mapId}/chapter-narrative?mode=${narrativeMode}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.narrative) setNarrative(d.narrative); })
      .catch(() => {});
  }, [mapId, mapData, narrativeMode]);

  const fetchReview = async () => {
    if (!mapId) return;
    try {
      const res = await authFetch(`/api/journey-maps/${mapId}/journey-review`);
      if (res.ok) { setReviewData(await res.json()); setShowReview(true); }
    } catch { /* silent */ }
  };

  const updateStepProgress = async (stepId: number, newStatus: string, percent: number) => {
    try {
      const res = await authFetch(`/api/journey-maps/${mapId}/progress`, {
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
      {/* 地图标题 — 人格隐喻版 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-warm-dark">{mapData?.title}</h2>
          {mapData?.subtitle && (
            <p className="text-sm text-warm-dark/60 mt-1">{mapData.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {mapData?.difficulty && (
            <span className="text-xs px-2 py-1 rounded-full bg-warm-border/50">
              {mapData.difficulty}
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-600">
            已看清 {mapData?.progress || 0}%
          </span>
        </div>
      </div>

      {/* 解锁进度 — 隐喻式 */}
      <div className="mb-4 h-1.5 bg-warm-border/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${mapData?.progress || 0}%`,
            background: `linear-gradient(90deg, #b8a088, #c8965e, #5a7a5a)`,
          }}
        />
      </div>
      <div className="mb-6 text-center text-xs text-warm-dark/35">
        {mapData?.progress === 100
          ? '我终于看清了自己是谁。'
          : mapData?.progress && mapData.progress > 50
          ? '过半了——你对自己的了解，比大多数人都深。'
          : mapData?.progress && mapData.progress > 0
          ? '每拼上一块，这里就会亮起来。'
          : '这块有点难拼？不急，Me等你。'}
      </div>

      {/* 正方形地图 — 重新设计的可视化旅程 */}
      <div className="relative aspect-square max-w-xl mx-auto">
        {/* 背景 — 柔和地形纹理 */}
        <div className="absolute inset-[10%] rounded-3xl bg-gradient-to-br from-warm-light/80 via-white/40 to-warm-light/60 border border-warm-dark/5" />

        {/* P2.4: 人格隐喻区域 — 被低估的品质 / 本能的天赋 / 恐惧的另一面 / 未打开的抽屉 */}
        {PERSONALITY_ZONES.map((zone) => {
          const active = zone.steps.some(
            s => steps.find(step => step.step_number === s)?.status === 'completed'
          );
          return (
            <div
              key={zone.label}
              className="absolute rounded-2xl transition-all duration-700 pointer-events-none"
              style={{
                left: zone.left, top: zone.top, width: zone.width, height: zone.height,
                background: active
                  ? `radial-gradient(ellipse at center, ${zone.color}22 0%, ${zone.color}08 70%, transparent 100%)`
                  : 'transparent',
                border: active ? `1px solid ${zone.color}30` : '1px solid transparent',
                opacity: active ? 1 : 0,
              }}
            >
              <span
                className="absolute text-xs font-medium tracking-wider transition-all duration-700"
                style={{
                  color: active ? zone.color : 'transparent',
                  opacity: active ? 0.7 : 0,
                  ...(zone.label === '被低估的品质' ? { left: '50%', top: '75%', transform: 'translateX(-50%)' }
                    : zone.label === '本能的天赋' ? { left: '25%', top: '50%', transform: 'translateY(-50%)' }
                    : zone.label === '恐惧的另一面' ? { left: '75%', top: '50%', transform: 'translateY(-50%)' }
                    : { left: '50%', top: '25%', transform: 'translateX(-50%)' }),
                }}
              >
                {zone.label}
              </span>
            </div>
          );
        })}

        {/* SVG 路径层 — 路线箭头 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
          <defs>
            <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#c8965e" />
            </marker>
            <marker id="arrowhead-done" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#5a7a5a" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* 路径连线 */}
          {STEP_POSITIONS.map((pos, i) => {
            if (i === STEP_POSITIONS.length - 1) return null;
            const next = STEP_POSITIONS[i + 1];
            const stepA = steps.find(s => s.step_number === i + 1);
            const stepB = steps.find(s => s.step_number === i + 2);
            const x1 = 40 + (pos.x / (GRID_SIZE - 1)) * 320;
            const y1 = 360 - (pos.y / (GRID_SIZE - 1)) * 320;
            const x2 = 40 + (next.x / (GRID_SIZE - 1)) * 320;
            const y2 = 360 - (next.y / (GRID_SIZE - 1)) * 320;
            const isSegmentDone = stepA?.status === 'completed' && stepB?.status !== 'locked';
            const isSegmentActive = stepA?.status !== 'locked' && stepB?.status === 'active';
            const segmentColor = isSegmentDone ? '#5a7a5a' : isSegmentActive ? '#c8965e' : '#d4d0c8';
            const segmentWidth = (isSegmentDone || isSegmentActive) ? 3 : 1.5;
            const dashArray = isSegmentDone ? 'none' : isSegmentActive ? '6 3' : '3 3';

            // 计算中点偏移以制造曲线感
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const perpX = -dy * 0.08;
            const perpY = dx * 0.08;

            return (
              <g key={i}>
                <path
                  d={`M ${x1} ${y1} Q ${mx + perpX} ${my + perpY} ${x2} ${y2}`}
                  fill="none"
                  stroke={segmentColor}
                  strokeWidth={segmentWidth}
                  strokeDasharray={dashArray}
                  strokeLinecap="round"
                  opacity={isSegmentDone ? 0.8 : 0.4}
                />
                {(isSegmentDone || isSegmentActive) && (
                  <path
                    d={`M ${x2 - 6} ${y2 - 6} L ${x2} ${y2}`}
                    stroke={segmentColor}
                    strokeWidth={segmentWidth}
                    strokeLinecap="round"
                    opacity={0.8}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* 步数提示 */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-warm-dark/20 tracking-widest">
          一步一步
        </div>

        {/* 步骤节点 */}
        {STEP_POSITIONS.map((pos, i) => {
          const step = steps.find(s => s.step_number === i + 1);
          if (!step) return null;

          const isCompleted = step.status === 'completed';
          const isActive = step.status === 'active';

          return (
            <div
              key={step.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${8 + (pos.x / (GRID_SIZE - 1)) * 84}%`,
                top: `${92 - (pos.y / (GRID_SIZE - 1)) * 84}%`,
              }}
            >
              <div
                className={`cursor-pointer transition-all duration-300 hover:scale-110 ${
                  isActive ? 'animate-soft-pulse' : ''
                }`}
                onClick={() => {
                  setSelectedStep(step);
                  setShowDetail(true);
                }}
              >
                {/* 主节点 — 菱形瓦片 */}
                <div
                  className={`relative w-20 h-20 flex flex-col items-center justify-center transition-all duration-500 ${
                    isCompleted
                      ? 'bg-emerald-50/90 border-emerald-300 shadow-lg shadow-emerald-100/50'
                      : isActive
                      ? 'bg-amber-50/90 border-amber-400 shadow-xl shadow-amber-200/60'
                      : 'bg-gray-50/70 border-gray-200'
                  } border-2`}
                  style={{
                    clipPath: 'polygon(50% 3%, 93% 25%, 93% 75%, 50% 97%, 7% 75%, 7% 25%)',
                  }}
                >
                  <span className="text-2xl relative z-10">{step.landmark_icon}</span>
                  <span className="text-[9px] text-center leading-tight mt-0.5 px-2 relative z-10 font-medium text-warm-dark/70">
                    {step.landmark}
                  </span>
                </div>

                {/* 步骤编号徽章 */}
                <div
                  className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md transition-all ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : isActive
                      ? 'bg-amber-500 animate-soft-pulse'
                      : 'bg-gray-400'
                  }`}
                >
                  {isCompleted ? '✓' : step.step_number}
                </div>

                {/* 当前步骤指示器 */}
                {isActive && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping opacity-40" />
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-amber-500" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* 起点/终点标签 */}
        <div className="absolute bottom-1 left-3 text-[10px] text-warm-dark/20 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-warm-dark/20" />
          从这儿开始
        </div>
        <div className="absolute top-1 right-3 text-[10px] text-warm-dark/20 flex items-center gap-1">
          我终于看清了
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-warm-accent/40" />
        </div>
      </div>

{/* 章节叙事 */}
      {narrative && (
        <div className="mt-6 p-4 rounded-2xl bg-warm-light/60 border border-warm-dark/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-warm-dark/40 font-medium">📖 章节叙事</span>
            <div className="flex gap-1">
              <button
                onClick={() => setNarrativeMode('experiment')}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                  narrativeMode === 'experiment' ? 'bg-warm-accent/15 text-warm-accent' : 'text-warm-dark/30'
                }`}
              >
                试验
              </button>
              <button
                onClick={() => setNarrativeMode('epic')}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                  narrativeMode === 'epic' ? 'bg-warm-accent/15 text-warm-accent' : 'text-warm-dark/30'
                }`}
              >
                史诗
              </button>
            </div>
          </div>
          <div className="text-sm text-warm-dark/70 leading-relaxed whitespace-pre-line">
            {narrative}
          </div>
          {mapData?.progress === 100 && (
            <button
              onClick={fetchReview}
              className="mt-3 w-full py-2 rounded-xl bg-warm-accent/10 text-warm-accent text-xs font-medium hover:bg-warm-accent/20 transition-colors"
            >
              🏆 查看完整旅程回顾
            </button>
          )}
        </div>
      )}

      {/* 旅程回顾弹窗 */}
      {showReview && reviewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto animate-modal-enter">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-warm-dark">🏆 旅程回顾</h3>
              <button onClick={() => setShowReview(false)} className="text-warm-dark/40 hover:text-warm-dark">✕</button>
            </div>

            <div className="text-sm text-warm-dark/70 whitespace-pre-line leading-relaxed mb-4">
              {reviewData.narrative}
            </div>

            {reviewData.origin_fragments && reviewData.origin_fragments.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-warm-dark/40 mb-2">出发时的碎片</div>
                <div className="space-y-1">
                  {reviewData.origin_fragments.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-warm-dark/50">
                      <span className="px-1.5 py-0.5 rounded bg-warm-accent/10 text-warm-accent text-[10px]">{f.type}</span>
                      {f.content}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewData.gains && reviewData.gains.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="text-xs text-emerald-700 font-medium mb-1">这一路的收获</div>
                {reviewData.gains.map((g: string, i: number) => (
                  <div key={i} className="text-xs text-emerald-600">· {g}</div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowReview(false)}
                className="flex-1 py-2 rounded-xl border border-warm-dark/10 text-warm-dark text-sm"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 步骤详情弹窗 — 反思视角 */}
      {showDetail && selectedStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-modal-enter">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedStep.landmark_icon}</span>
                <div>
                  <h3 className="font-bold text-warm-dark">{selectedStep.landmark}</h3>
                  <p className="text-xs text-warm-dark/40">
                    {selectedStep.status === 'completed'
                      ? '你已经走过这里了'
                      : selectedStep.status === 'active'
                      ? '正在经过这里'
                      : '还没走到这里'}
                  </p>
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
                  <h4 className="text-xs font-semibold text-amber-700 mb-1">可以试试</h4>
                  <p className="text-sm text-amber-800">{selectedStep.action}</p>
                </div>
              )}

              {selectedStep.time_estimate && (
                <div className="flex items-center gap-2 text-xs text-warm-dark/40">
                  <span>⏱️</span>
                  <span>大概需要 {selectedStep.time_estimate}</span>
                </div>
              )}

              {/* 进度控制 */}
              {selectedStep.status !== 'locked' && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs text-warm-dark/40">走到了</span>
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

              {/* 完成时显示反思提示 */}
              {selectedStep.status === 'completed' && (
                <div className="bg-warm-light/60 rounded-lg p-3 text-center">
                  <p className="text-xs text-warm-dark/50">
                    这一步走完的时候，关于你自己，你知道了什么？
                  </p>
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
                  {selectedStep.status === 'completed'
                    ? '这块Me，拼上了。'
                    : selectedStep.status === 'active'
                    ? '正在拼'
                    : '还没点亮'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}