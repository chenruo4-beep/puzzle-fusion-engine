'use client';

import { useState, useEffect, useCallback } from 'react';
import { playFusionSound } from '@/hooks/useSound';

interface Fragment {
  id: string;
  content: string;
  type: string;
  color: string;
}

interface PuzzleFusionAnimationProps {
  fragments: Fragment[];
  onComplete?: () => void;
  duration?: number; // 总动画时长(ms)
}

/**
 * W5-4: 拼图融合可视化 — 碎片飞向中心→拼合成完整拼图→光晕爆发
 * 
 * 动画阶段：
 * 1. 碎片从原位置级联飞出 (0-800ms)
 * 2. 碎片在中心拼合成完整拼图形状 (800-1400ms)
 * 3. 拼图整体旋转+发光 (1400-1800ms)
 * 4. 光晕爆发+火花粒子散射 (1800-2500ms)
 * 5. 完成回调
 */
export default function PuzzleFusionAnimation({
  fragments,
  onComplete,
  duration = 2500,
}: PuzzleFusionAnimationProps) {
  const [phase, setPhase] = useState<'idle' | 'flying' | 'assembling' | 'glowing' | 'bursting' | 'done'>('idle');
  const [assembledPieces, setAssembledPieces] = useState<Array<{
    id: string;
    content: string;
    type: string;
    color: string;
    angle: number;
    distance: number;
    delay: number;
  }>>([]);
  const [sparkles, setSparkles] = useState<Array<{
    id: number;
    angle: number;
    distance: number;
    color: string;
    size: number;
    delay: number;
  }>>([]);

  const startAnimation = useCallback(() => {
    if (phase !== 'idle') return;
    
    setPhase('flying');
    playFusionSound();

    // 计算每个碎片在拼图中的位置（圆形分布）
    const pieces = fragments.map((frag, i) => {
      const total = fragments.length;
      const angle = (360 / total) * i + (Math.random() - 0.5) * 10; //  slight randomness
      const distance = 40 + Math.random() * 20; // 40-60px from center
      return {
        ...frag,
        angle,
        distance,
        delay: i * 0.08,
      };
    });
    setAssembledPieces(pieces);

    // 生成火花粒子
    const sparkColors = ['#d97746', '#e8a860', '#f0c078', '#ffd700', '#ffaa55', '#ff6b35', '#ffa500'];
    const sparks = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      angle: (360 / 24) * i + Math.random() * 10,
      distance: 80 + Math.random() * 120,
      color: sparkColors[i % sparkColors.length],
      size: 4 + Math.random() * 6,
      delay: 1.6 + Math.random() * 0.4,
    }));
    setSparkles(sparks);

    // 阶段转换
    setTimeout(() => setPhase('assembling'), 700);
    setTimeout(() => setPhase('glowing'), 1300);
    setTimeout(() => setPhase('bursting'), 1700);
    setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, duration);
  }, [fragments, phase, duration, onComplete]);

  // 自动开始
  useEffect(() => {
    const timer = setTimeout(startAnimation, 100);
    return () => clearTimeout(timer);
  }, [startAnimation]);

  if (phase === 'idle' || phase === 'done') return null;

  const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
  const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;

  return (
    <div className="puzzle-fusion-animation-container">
      {/* 背景遮罩 */}
      <div className={`fusion-backdrop ${phase}`} />

      {/* 中心拼图组装区 */}
      <div
        className="puzzle-assembly-center"
        style={{
          left: centerX,
          top: centerY,
        }}
      >
        {/* 拼图底板 */}
        <div className={`puzzle-base-plate ${phase}`}>
          {/* 拼图凹槽指示 */}
          {assembledPieces.map((piece) => {
            const rad = (piece.angle * Math.PI) / 180;
            const x = Math.cos(rad) * piece.distance;
            const y = Math.sin(rad) * piece.distance;
            return (
              <div
                key={`slot-${piece.id}`}
                className={`puzzle-slot ${phase}`}
                style={{
                  transform: `translate(${x}px, ${y}px) rotate(${piece.angle + 90}deg)`,
                  animationDelay: `${piece.delay}s`,
                }}
              />
            );
          })}
        </div>

        {/* 飞入的碎片 → 拼合后的碎片 */}
        {assembledPieces.map((piece) => {
          const rad = (piece.angle * Math.PI) / 180;
          const x = Math.cos(rad) * piece.distance;
          const y = Math.sin(rad) * piece.distance;

          return (
            <div
              key={piece.id}
              className={`puzzle-assembly-piece ${phase}`}
              style={{
                '--piece-color': piece.color,
                '--target-x': `${x}px`,
                '--target-y': `${y}px`,
                '--target-angle': `${piece.angle + 90}deg`,
                animationDelay: `${piece.delay}s`,
              } as React.CSSProperties}
            >
              <div className="piece-inner" style={{ backgroundColor: piece.color }}>
                <span className="piece-type">{piece.type}</span>
                <span className="piece-content">{piece.content.slice(0, 12)}</span>
              </div>
              {/* 拼图凸起/凹陷装饰 */}
              <div className="piece-tab piece-tab-top" />
              <div className="piece-tab piece-tab-right" />
            </div>
          );
        })}

        {/* 中心核心光球 */}
        <div className={`fusion-core ${phase}`} />

        {/* 旋转光环 */}
        <div className={`fusion-ring ${phase}`} />
        <div className={`fusion-ring-outer ${phase}`} />

        {/* 火花粒子爆发 */}
        {phase === 'bursting' && sparkles.map((spark) => {
          const rad = (spark.angle * Math.PI) / 180;
          const x = Math.cos(rad) * spark.distance;
          const y = Math.sin(rad) * spark.distance;
          return (
            <div
              key={spark.id}
              className="fusion-spark"
              style={{
                '--spark-x': `${x}px`,
                '--spark-y': `${y}px`,
                '--spark-color': spark.color,
                '--spark-size': `${spark.size}px`,
                animationDelay: `${spark.delay}s`,
              } as React.CSSProperties}
            />
          );
        })}

        {/* 完成文字 */}
        <div className={`fusion-complete-text ${phase}`}>
          <span className="complete-icon">🧩</span>
          <span className="complete-label">融合完成</span>
        </div>
      </div>

      {/* 阶段提示文字 */}
      <div className={`fusion-phase-hint ${phase}`}>
        {phase === 'flying' && '碎片正在汇聚...'}
        {phase === 'assembling' && '拼合中...'}
        {phase === 'glowing' && '能量凝聚...'}
        {phase === 'bursting' && '✨ 融合成功！'}
      </div>
    </div>
  );
}

