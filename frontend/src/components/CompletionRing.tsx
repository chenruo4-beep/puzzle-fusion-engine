'use client';

/* ═══════════════════════════════════════════════════════
   完成度圆环组件 (W1-6)
   SVG 圆环显示"拼图片连接率"，带渐变色和动画
   ═══════════════════════════════════════════════════════ */

interface CompletionRingProps {
  /** 0–100 的连接率百分比 */
  percentage: number;
  /** 连接的拼图片数 */
  connectedCount: number;
  /** 总拼图片数 */
  totalCount: number;
  /** 圆环外径（px），默认 120 */
  size?: number;
  /** 圆环宽度（px），默认 10 */
  strokeWidth?: number;
}

export default function CompletionRing({
  percentage,
  connectedCount,
  totalCount,
  size = 120,
  strokeWidth = 10,
}: CompletionRingProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  // 渐变色定义（id 按 size 区分避免多实例冲突）
  const gradientId = `ring-gradient-${size}`;

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* SVG 圆环 */}
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--warm-orange)" />
            <stop offset="50%" stopColor="#e8a860" />
            <stop offset="100%" stopColor="#f0c878" />
          </linearGradient>
        </defs>

        {/* 背景轨道 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(60, 58, 55, 0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* 进度弧 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>

      {/* 中心文字 */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span
          className="text-2xl font-extrabold"
          style={{
            background: 'linear-gradient(135deg, var(--warm-orange), #e8a860)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {clamped}%
        </span>
        <span className="text-[10px] text-warm-dark/40 mt-0.5">连接率</span>
      </div>

      {/* 底部说明 */}
      <div className="mt-2 text-center">
        <p className="text-xs text-warm-dark/50">
          <span className="font-semibold text-warm-accent">{connectedCount}</span>
          <span className="text-warm-dark/30"> / {totalCount} 拼图片已连接</span>
        </p>
      </div>
    </div>
  );
}