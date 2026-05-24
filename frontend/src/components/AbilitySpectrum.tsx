'use client';

import { useState, useEffect } from 'react';
import { authFetch  } from '@/lib/api';

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

const TYPE_ORDER = ['技能', '能力', '爱好', '习惯', '知识', '经历', '资源', '性格'];

interface TypeStat {
  count: number;
  last_activated: string | null;
}

interface StatsData {
  types: Record<string, TypeStat>;
}

function diffDays(isoStr: string | null): number {
  if (!isoStr) return Infinity;
  return (Date.now() - new Date(isoStr).getTime()) / 86400000;
}

function getOpacity(lastActivated: string | null): number {
  const d = diffDays(lastActivated);
  if (d <= 3) return 1.0;
  if (d <= 7) return 0.7;
  if (d <= 30) return 0.5;
  return 0.4;
}

function isActive(lastActivated: string | null): boolean {
  return diffDays(lastActivated) <= 3;
}

function getSize(count: number): number {
  return Math.min(48, 24 + (count - 1) * 6);
}

function formatDate(isoStr: string | null): string {
  if (!isoStr) return '暂无记录';
  return new Date(isoStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

export default function AbilitySpectrum() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await authFetch('/api/fragments/stats', {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setStats(data);
      } catch {
        /* silent fail */
      }
    }
    load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedType) return;
    function dismiss(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-spectrum-dot]')) {
        setSelectedType(null);
      }
    }
    document.addEventListener('click', dismiss);
    return () => document.removeEventListener('click', dismiss);
  }, [selectedType]);

  if (!stats?.types) return null;

  const activeTypes = TYPE_ORDER.filter(
    (t) => stats.types[t] && stats.types[t].count > 0
  );
  if (activeTypes.length === 0) return null;

  const radius = 110;
  const cx = 160;
  const cy = 145;
  const containerW = 320;
  const containerH = 300;

  const dotPositions: Record<string, { x: number; y: number }> = {};
  activeTypes.forEach((type, i) => {
    const angle = (i / activeTypes.length) * Math.PI * 2 - Math.PI / 2;
    dotPositions[type] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  return (
    <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-5">
      <h3 className="text-sm font-semibold text-warm-dark/60 mb-1 text-center">
        你的能力光谱
      </h3>

      <div
        className="relative mx-auto"
        style={{ width: containerW, height: containerH }}
      >
        <style>{`
          @keyframes spectrum-pulse {
            0%, 100% { box-shadow: 0 0 var(--gs,6px) var(--gc); }
            50% { box-shadow: 0 0 var(--gl,20px) var(--gc); }
          }
        `}</style>

        {activeTypes.map((type) => {
          const stat = stats.types[type];
          const color = TYPE_COLORS[type] || '#b8a088';
          const size = getSize(stat.count);
          const opacity = getOpacity(stat.last_activated);
          const active = isActive(stat.last_activated);
          const pos = dotPositions[type];
          const glowColor = color + '66';
          const glowSmall = Math.round(size * 0.3);
          const glowLarge = Math.round(size * 0.8);

          return (
            <div
              key={type}
              className="absolute flex flex-col items-center"
              style={{
                left: pos.x - size / 2,
                top: pos.y - size / 2,
              }}
            >
              <button
                data-spectrum-dot={type}
                className="rounded-full cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                style={{
                  width: size,
                  height: size,
                  backgroundColor: color,
                  opacity,
                  boxShadow: `0 0 ${glowSmall}px ${glowColor}`,
                  ...(active
                    ? ({
                        animation: 'spectrum-pulse 2.5s ease-in-out infinite',
                        '--gc': glowColor,
                        '--gs': `${glowSmall}px`,
                        '--gl': `${glowLarge}px`,
                      } as React.CSSProperties)
                    : {}),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedType(selectedType === type ? null : type);
                }}
              />
              <span
                className="text-xs mt-1.5 font-medium whitespace-nowrap"
                style={{ color, opacity: 0.85 }}
              >
                {type}({stat.count})
              </span>
            </div>
          );
        })}

        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            left: cx - 70,
            top: cy - 10,
            width: 140,
            height: 20,
          }}
        >
          <span className="text-[11px] text-warm-dark/20">
            最近的记录让这些碎片更亮了
          </span>
        </div>

        {selectedType &&
          dotPositions[selectedType] &&
          stats.types[selectedType] && (() => {
            const pos = dotPositions[selectedType];
            const stat = stats.types[selectedType];
            const dotSize = getSize(stat.count);
            const showAbove = pos.y - dotSize / 2 > 40;
            return (
              <div
                className="absolute z-20 bg-white/95 border border-warm-dark/10 rounded-lg px-3 py-2 shadow-md pointer-events-none whitespace-nowrap"
                style={
                  showAbove
                    ? {
                        left: pos.x,
                        top: pos.y - dotSize / 2 - 6,
                        transform: 'translate(-50%, -100%)',
                      }
                    : {
                        left: pos.x,
                        top: pos.y + dotSize / 2 + 18,
                        transform: 'translate(-50%, 0)',
                      }
                }
              >
                <p className="text-xs text-warm-dark">
                  {selectedType} · {stat.count}个碎片 · 最近激活:{' '}
                  {formatDate(stat.last_activated)}
                </p>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
