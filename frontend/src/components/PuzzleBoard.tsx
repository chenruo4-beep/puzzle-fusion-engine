'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
// import { SkeletonCard } from '@/components/Skeleton';
import FusionModal from '@/components/FusionModal';
import { useMobilePuzzle } from '@/hooks/useMobilePuzzle';
import { playClickSound, playFusionSparkSound } from '@/hooks/useSound';

interface Fragment {
  id: string;
  fragment_type: string;
  content: string;
  tags?: string;
}

interface PieceState {
  id: string;
  x: number;
  y: number;
  zIndex: number;
}

interface FusionResult {
  directions: Array<{
    title: string;
    description: string;
    [key: string]: unknown;
  }>;
  insight: string;
  [key: string]: unknown;
}

const TYPE_COLORS: Record<string, string> = {
  '技能': '#4a7c9b',
  '能力': '#5a7a5a',
  '爱好': '#c49a6c',
  '习惯': '#c49a6c',
  '知识': '#b8a088',
  '经历': '#b8a088',
  '资源': '#7a9b4a',
  '性格': '#9b6c4a',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 咬合距离阈值（像素）
const SNAP_DISTANCE = 60;
const PROXIMITY_DISTANCE = 100;

// 在棋盘范围内随机分布
function scatterPosition(index: number, total: number, boardW: number, boardH: number) {
  const cols = Math.ceil(Math.sqrt(total * (boardW / boardH)));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const cellW = boardW / cols;
  const cellH = Math.min(140, boardH / Math.ceil(total / cols));
  const jitterX = (Math.random() - 0.5) * cellW * 0.6;
  const jitterY = (Math.random() - 0.5) * cellH * 0.5;
  const x = Math.max(20, Math.min(boardW - 140, col * cellW + cellW * 0.15 + jitterX));
  const y = Math.max(20, Math.min(boardH - 100, row * cellH + cellH * 0.1 + jitterY));
  return { x: Math.round(x), y: Math.round(y) };
}

// 计算两个拼图片中心的距离
function pieceDistance(a: PieceState, b: PieceState): number {
  const ax = a.x + 65;
  const ay = a.y + 35;
  const bx = b.x + 65;
  const by = b.y + 35;
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// 计算两个拼图片中心点之间的连线角度和中点
function pieceConnection(a: PieceState, b: PieceState) {
  const ax = a.x + 65;
  const ay = a.y + 35;
  const bx = b.x + 65;
  const by = b.y + 35;
  const midX = (ax + bx) / 2;
  const midY = (ay + by) / 2;
  const len = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
  const angle = Math.atan2(by - ay, bx - ax) * (180 / Math.PI);
  return { midX, midY, len, angle };
}

export default function PuzzleBoard() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [pieces, setPieces] = useState<PieceState[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardSize, setBoardSize] = useState({ w: 800, h: 500 });

  // 咬合状态
  const [engagedPieces, setEngagedPieces] = useState<Set<string>>(new Set());
  const [snapAnimPieces, setSnapAnimPieces] = useState<Set<string>>(new Set());
  const [attractTargetId, setAttractTargetId] = useState<string | null>(null);

  // 融合相关
  const [showFusionModal, setShowFusionModal] = useState(false);
  const [fusionResult, setFusionResult] = useState<FusionResult | null>(null);
  const [fusionLoading, setFusionLoading] = useState(false);
  const [fusionSaving, setFusionSaving] = useState(false);

  // 职业信息（从融合历史或localStorage读取）
  const [profession, setProfession] = useState('');

  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pieceId: string | null;
    startX: number;
    startY: number;
    pieceStartX: number;
    pieceStartY: number;
    isDragging: boolean;
  }>({ pieceId: null, startX: 0, startY: 0, pieceStartX: 0, pieceStartY: 0, isDragging: false });
  const maxZRef = useRef(10);

  // ===== 移动端触摸选中→点击投放区→咬合 =====
  const mobilePuzzle = useMobilePuzzle((fragmentId: string) => {
    const selectedPiece = pieces.find(p => p.id === fragmentId);
    if (!selectedPiece) return;
    let nearestId: string | null = null;
    let nearestDist = Infinity;
    for (const p of pieces) {
      if (p.id === fragmentId) continue;
      const dist = pieceDistance(selectedPiece, p);
      if (dist < nearestDist) { nearestDist = dist; nearestId = p.id; }
    }
    if (nearestId) {
      const target = pieces.find(p => p.id === nearestId)!;
      const angle = Math.atan2(target.y + 35 - selectedPiece.y - 35, target.x + 65 - selectedPiece.x - 65);
      maxZRef.current += 1;
      setPieces(prev => prev.map(p => {
        if (p.id !== fragmentId) return p;
        return {
          ...p,
          x: target.x + 65 - (SNAP_DISTANCE * 0.8) * Math.cos(angle) - 65,
          y: target.y + 35 - (SNAP_DISTANCE * 0.8) * Math.sin(angle) - 35,
          zIndex: maxZRef.current,
        };
      }));
    }
  });

  // 加载碎片
  useEffect(() => {
    fetch(`${API_BASE}/api/fragments/`)
      .then(r => r.json())
      .then((data: Fragment[]) => {
        setFragments(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // 读取职业信息：先从localStorage，再从融合历史API
    try {
      const fusionData = localStorage.getItem('fusionData');
      if (fusionData) {
        const parsed = JSON.parse(fusionData);
        if (parsed.profession) setProfession(parsed.profession);
      } else {
        // 从融合历史API获取最近使用的职业
        fetch(`${API_BASE}/api/fusions/`)
          .then(r => r.json())
          .then((history: Record<string, unknown>[]) => {
            if (Array.isArray(history) && history.length > 0 && history[0].profession) {
              setProfession(String(history[0].profession));
            }
          })
          .catch(() => {});
      }
    } catch { /* no profession data */ }
  }, []);

  // 计算棋盘尺寸
  useEffect(() => {
    function updateSize() {
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        setBoardSize({ w: Math.max(400, rect.width - 32), h: Math.max(300, Math.min(600, rect.width * 0.6)) });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 初始化拼图片位置
  useEffect(() => {
    if (fragments.length === 0 || pieces.length > 0) return;
    const initial: PieceState[] = fragments.map((f, i) => {
      const { x, y } = scatterPosition(i, fragments.length, boardSize.w, boardSize.h);
      return { id: f.id, x, y, zIndex: 1 };
    });
    setPieces(initial);
    maxZRef.current = fragments.length + 5;
  }, [fragments, boardSize]);

  // 计算咬合的拼图片 + 触发粒子动画
  useEffect(() => {
    const engaged = new Set<string>();
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const dist = pieceDistance(pieces[i], pieces[j]);
        if (dist < SNAP_DISTANCE) {
          engaged.add(pieces[i].id);
          engaged.add(pieces[j].id);
        }
      }
    }
    // 检测新咬合的拼图片
    const justSnapped = new Set<string>();
    engaged.forEach(id => {
      if (!engagedPieces.has(id)) justSnapped.add(id);
    });
    if (justSnapped.size > 0) {
      playClickSound();
      setSnapAnimPieces(justSnapped);
      setTimeout(() => setSnapAnimPieces(new Set()), 700);
    }
    setEngagedPieces(engaged);
  }, [pieces]);

  const getFragment = (id: string) => fragments.find(f => f.id === id);

  // 拖拽开始
  const handlePointerDown = useCallback((e: React.PointerEvent, pieceId: string) => {
    e.preventDefault();
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece) return;
    maxZRef.current += 1;
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, zIndex: maxZRef.current } : p));
    dragRef.current = {
      pieceId,
      startX: e.clientX,
      startY: e.clientY,
      pieceStartX: piece.x,
      pieceStartY: piece.y,
      isDragging: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pieces]);

  // 拖拽移动（含磁吸效果）
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.pieceId) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.isDragging = true;
    }
    if (!dragRef.current.isDragging) return;
    setPieces(prev => {
      const dragged = prev.find(p => p.id === dragRef.current.pieceId);
      if (!dragged) return prev;
      let rawX = dragRef.current.pieceStartX + dx;
      let rawY = dragRef.current.pieceStartY + dy;
      const dcx = rawX + 65, dcy = rawY + 35;
      // 找最近的非拖动拼图片
      let nearestId: string | null = null;
      let nearestDist = Infinity;
      for (const p of prev) {
        if (p.id === dragRef.current.pieceId) continue;
        const dist = Math.sqrt((dcx - (p.x + 65)) ** 2 + (dcy - (p.y + 35)) ** 2);
        if (dist < nearestDist) { nearestDist = dist; nearestId = p.id; }
      }
      // 磁吸力：越近越大
      if (nearestId && nearestDist < PROXIMITY_DISTANCE) {
        const target = prev.find(p => p.id === nearestId)!;
        const tcx = target.x + 65, tcy = target.y + 35;
        const pull = (1 - nearestDist / PROXIMITY_DISTANCE) * 0.4;
        rawX += (tcx - dcx) * pull;
        rawY += (tcy - dcy) * pull;
        setAttractTargetId(nearestId);
      } else {
        setAttractTargetId(null);
      }
      return prev.map(p => {
        if (p.id !== dragRef.current.pieceId) return p;
        return {
          ...p,
          x: Math.max(0, Math.min(boardSize.w - 130, rawX)),
          y: Math.max(0, Math.min(boardSize.h - 90, rawY)),
        };
      });
    });
  }, [boardSize]);

  // 拖拽结束
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = { pieceId: null, startX: 0, startY: 0, pieceStartX: 0, pieceStartY: 0, isDragging: false };
    setAttractTargetId(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // 融合API调用
  const handleFusion = async () => {
    if (engagedPieces.size < 2) return;
    playFusionSparkSound();
    setFusionLoading(true);
    setShowFusionModal(true);
    try {
      const engagedIds = Array.from(engagedPieces);
      const engagedFrags = fragments.filter(f => engagedIds.includes(f.id));
      const res = await fetch(`${API_BASE}/api/fusions/spark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profession: profession || '',
          fragments: engagedFrags.map(f => ({ type: f.fragment_type, content: f.content })),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `灵感碰撞失败 (${res.status})`);
      }
      const data = await res.json();
      setFusionResult(data.data || data);
    } catch (err) {
      alert('灵感碰撞失败：' + (err instanceof Error ? err.message : '未知错误'));
      setShowFusionModal(false);
    } finally {
      setFusionLoading(false);
    }
  };

  // 保存融合结果
  const handleSaveFusion = async () => {
    if (!fusionResult) return;
    setFusionSaving(true);
    try {
      const engagedIds = Array.from(engagedPieces).map(id => parseInt(id));
      const title = fusionResult.directions?.[0]?.title || '未命名融合';
      const res = await fetch(`${API_BASE}/api/fusions/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profession: profession || '未知职业',
          title,
          fragment_ids: engagedIds,
          result: fusionResult,
        }),
      });
      if (!res.ok) throw new Error(`保存失败 (${res.status})`);
      setShowFusionModal(false);
      setFusionResult(null);
      alert('融合结果已保存！');
    } catch (err) {
      alert('保存失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setFusionSaving(false);
    }
  };

  // 保存到灵感集（localStorage）
  const handleSaveToInspiration = () => {
    if (!fusionResult) return;
    try {
      const inspirations = JSON.parse(localStorage.getItem('inspirations') || '[]');
      inspirations.unshift({
        id: Date.now().toString(),
        title: fusionResult.insight || fusionResult.directions?.[0]?.title || '灵感火花',
        insight: fusionResult.insight,
        action: fusionResult.action,
        directions: fusionResult.directions,
        spark: fusionResult.spark,
        fragment_count: engagedPieces.size,
        saved_at: new Date().toISOString(),
      });
      if (inspirations.length > 50) inspirations.length = 50;
      localStorage.setItem('inspirations', JSON.stringify(inspirations));
      alert('✨ 已存入灵感集！可在灵感集页面查看');
    } catch {
      alert('保存失败，请重试');
    }
  };

  const typeCounts: Record<string, number> = {};
  fragments.forEach(f => {
    const t = f.fragment_type || '其他';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  // 接近连接线（始终显示）
  const proximityPairs: { a: PieceState; b: PieceState; dist: number; snap: boolean }[] = [];
  if (pieces.length >= 2) {
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const dist = pieceDistance(pieces[i], pieces[j]);
        if (dist < PROXIMITY_DISTANCE) {
          proximityPairs.push({
            a: pieces[i],
            b: pieces[j],
            dist,
            snap: dist < SNAP_DISTANCE,
          });
        }
      }
    }
  }

  // ===== Loading / Empty / Main Render =====
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="puzzle-spinner">🧩</div>
        <p className="text-sm text-warm-dark/50 font-medium">拼图板加载中...</p>
        <div className="w-48 loading-progress-bar" />
      </div>
    );
  }

  if (fragments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">🧩</div>
        <h3 className="text-lg font-bold text-warm-dark mb-2">拼图板还是空的</h3>
        <p className="text-sm text-warm-dark/50 mb-4">先去收集一些拼图片，再回来拼合它们</p>
        <a href="/dashboard/fragments" className="px-5 py-2.5 bg-warm-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 transition-colors">
          → 去收集拼图片
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-xs text-warm-dark/40">拼图板：</span>
        {Object.entries(typeCounts).map(([type, count]) => (
          <span
            key={type}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: TYPE_COLORS[type] || '#b8a088' }}
          >
            {type} ×{count}
          </span>
        ))}
        <span className="text-xs text-warm-dark/30 ml-auto mr-2">
          {mobilePuzzle.isMobile ? '💡 长按选中碎片，点击其他碎片咬合' : '💡 拖拽拼图片到一起，咬合后可融合'}
        </span>
      </div>

      {/* 拼图板 */}
      <div
        ref={boardRef}
        className="puzzle-board relative overflow-hidden select-none"
        style={{ height: boardSize.h }}
        onPointerMove={mobilePuzzle.isMobile ? undefined : handlePointerMove}
        onPointerUp={mobilePuzzle.isMobile ? undefined : handlePointerUp}
        onClick={() => { if (mobilePuzzle.isMobile) mobilePuzzle.cancelSelection(); }}
      >
        {/* 木质纹理背景 */}
        <div className="puzzle-board-texture" />

        {/* 网格辅助线 */}
        <div className="puzzle-board-grid" style={{
          backgroundImage: `
            linear-gradient(rgba(60,58,55,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(60,58,55,0.04) 1px, transparent 1px)
          `,
          backgroundSize: `${boardSize.w / 8}px ${boardSize.h / 5}px`,
        }} />

        {/* 接近连接线 */}
        {proximityPairs.map((pair, idx) => {
          const conn = pieceConnection(pair.a, pair.b);
          return (
            <div key={`prox-${idx}`}>
              <div
                className={`puzzle-proximity-link${pair.snap ? ' puzzle-guide-snap-zone' : ''}`}
                style={{
                  left: conn.midX - conn.len / 2,
                  top: conn.midY,
                  width: conn.len,
                  transform: `rotate(${conn.angle}deg)`,
                  transformOrigin: 'center center',
                }}
              />
              {pair.snap && (
                <div
                  className="puzzle-guide-hint"
                  style={{
                    left: conn.midX - 14,
                    top: conn.midY - 20,
                  }}
                >
                  已咬合！
                </div>
              )}
            </div>
          );
        })}

        {/* 拼图片 */}
        {pieces.map((piece, idx) => {
          const frag = getFragment(piece.id);
          if (!frag) return null;
          const typeColor = TYPE_COLORS[frag.fragment_type] || '#b8a088';
          const isDragging = dragRef.current.isDragging && dragRef.current.pieceId === piece.id;
          const isEngaged = engagedPieces.has(piece.id);
          const isMobileSelected = mobilePuzzle.snap.phase === 'selected' && mobilePuzzle.snap.fragment?.id === piece.id;
          const isMobileTarget = mobilePuzzle.snap.phase === 'selected' && mobilePuzzle.snap.fragment?.id !== piece.id;
          const shapes = ['tab-top', 'tab-bottom', 'tab-left', 'tab-right'];
          const shape = shapes[idx % 4];

          return (
            <div
              key={piece.id}
              data-shape={shape}
              className={`puzzle-board-piece puzzle-card${isDragging ? ' dragging' : ''}${isEngaged ? ' engaged' : ''}${isMobileSelected ? ' mobile-card-selected' : ''}${isMobileTarget ? ' mobile-drop-zone' : ''}`}
              style={{
                position: 'absolute',
                left: piece.x,
                top: piece.y,
                width: 130,
                minHeight: 70,
                zIndex: isMobileSelected ? 100 : piece.zIndex,
                backgroundColor: 'rgba(255,252,247,0.94)',
                borderLeft: `4px solid ${typeColor}`,
                cursor: mobilePuzzle.isMobile ? 'pointer' : 'grab',
                touchAction: 'none',
                transition: dragRef.current.pieceId === piece.id ? 'none' : 'box-shadow 0.2s, transform 0.2s',
                boxShadow: isEngaged ? '0 0 20px rgba(217, 119, 70, 0.6), 0 0 40px rgba(217, 119, 70, 0.3)' : undefined,
                animation: snapAnimPieces.has(piece.id) ? 'snap-glow 0.6s ease-out forwards' : attractTargetId === piece.id ? 'drop-zone-breathe 1s ease-in-out infinite' : undefined,
              }}
              onPointerDown={(e) => {
                if (mobilePuzzle.isMobile) {
                  // 移动端：长按选中 → 点击其他碎片→咬合
                  if (mobilePuzzle.snap.phase === 'selected' && mobilePuzzle.snap.fragment?.id !== piece.id) {
                    // 已有碎片被选中，点击其他碎片 → 移动被选中的碎片到当前碎片旁
                    const selectedId = mobilePuzzle.snap.fragment!.id;
                    const selectedPiece = pieces.find(p => p.id === selectedId);
                    if (selectedPiece) {
                      const angle = Math.atan2(piece.y + 35 - selectedPiece.y - 35, piece.x + 65 - selectedPiece.x - 65);
                      maxZRef.current += 1;
                      setPieces(prev => prev.map(p => {
                        if (p.id !== selectedId) return p;
                        return {
                          ...p,
                          x: piece.x + 65 - (SNAP_DISTANCE * 0.8) * Math.cos(angle) - 65,
                          y: piece.y + 35 - (SNAP_DISTANCE * 0.8) * Math.sin(angle) - 35,
                          zIndex: maxZRef.current,
                        };
                      }));
                    }
                    mobilePuzzle.cancelSelection();
                    return;
                  }
                  if (mobilePuzzle.snap.phase === 'selected' && mobilePuzzle.snap.fragment?.id === piece.id) {
                    // 点击已选中的碎片 → 取消选择
                    mobilePuzzle.cancelSelection();
                    return;
                  }
                  // 正常长按检测
                  mobilePuzzle.onPointerDown(e, { id: piece.id, fragment_type: frag.fragment_type, content: frag.content });
                } else {
                  handlePointerDown(e, piece.id);
                }
              }}
              onPointerMove={() => {
                if (mobilePuzzle.isMobile) {
                  mobilePuzzle.onPointerMove();
                }
              }}
              onPointerUp={() => {
                if (mobilePuzzle.isMobile) {
                  mobilePuzzle.onPointerUp();
                }
              }}
            >
              <div className="puzzle-tab puzzle-tab-top" style={{ backgroundColor: typeColor }} />
              <div className="puzzle-tab puzzle-tab-right" style={{ backgroundColor: typeColor }} />
              <div className="puzzle-tab puzzle-tab-bottom" style={{ backgroundColor: typeColor }} />

              {isMobileTarget && mobilePuzzle.dropBounce && (
                <div className="absolute inset-0 rounded-lg pointer-events-none mobile-drop-bounce" />
              )}

              <div className="p-2.5">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold text-white mb-1.5 puzzle-type-badge"
                  style={{ backgroundColor: typeColor, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                >
                  {frag.fragment_type}
                </span>
                <p
                  className="text-xs text-warm-dark/80 leading-relaxed line-clamp-2"
                  style={{
                    wordBreak: 'break-word',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {frag.content}
                </p>
              </div>
            </div>
          );
        })}

        {/* 阴影渐变边 */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 2px 16px rgba(60,58,55,0.06), inset 0 -4px 12px rgba(60,58,55,0.04)',
          }}
        />
      </div>

      {/* 底部融合按钮 */}
      {engagedPieces.size >= 2 && (
        <div className="flex items-center justify-center">
          <button
            onClick={handleFusion}
            className={`px-6 py-3 rounded-xl bg-warm-accent text-white text-sm font-medium hover:bg-warm-accent/90 transition-all shadow-lg${mobilePuzzle.snap.phase === 'selected' ? ' mobile-drop-zone' : ''}`}
          >
            🧩 融合这 {engagedPieces.size} 块
          </button>
        </div>
      )}

      {/* 移动端选中碎片时的融合提示按钮 */}
      {mobilePuzzle.isMobile && mobilePuzzle.snap.phase === 'selected' && engagedPieces.size < 2 && (
        <div className="flex items-center justify-center">
          <button
            onClick={() => mobilePuzzle.triggerSnap()}
            className="px-6 py-3 rounded-xl bg-warm-accent/80 text-white text-sm font-medium hover:bg-warm-accent transition-all shadow-lg mobile-drop-zone"
          >
            📍 将碎片放入拼图板
          </button>
        </div>
      )}

      {/* 底部状态提示 */}
      <div className="flex items-center justify-center">
        <span className="text-xs text-warm-dark/40">
          {mobilePuzzle.snap.phase === 'selected' 
            ? '👆 点击其他碎片可将选中的碎片移动到旁边咬合'
            : mobilePuzzle.isMobile 
              ? '💡 长按选中碎片，点击其他碎片咬合'
              : '💡 拖拽拼图片到一起，咬合后可融合'
          }
        </span>
      </div>

      {/* 灵感火花弹窗 */}
      <FusionModal
        show={showFusionModal}
        loading={fusionLoading}
        saving={fusionSaving}
        result={fusionResult}
        engagedCount={engagedPieces.size}
        onClose={() => { setShowFusionModal(false); setFusionResult(null); }}
        onSave={handleSaveFusion}
        onSaveToInspiration={handleSaveToInspiration}
      />
    </div>
  );
}
