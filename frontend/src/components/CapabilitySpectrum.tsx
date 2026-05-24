'use client';

/** 8 维能力标签光谱图 — 展示用户碎片的能力分布 */

const ALL_TAGS = ['内容创作', '人际沟通', '逻辑分析', '执行落地', '创意审美', '共情关怀', '资源整合', '个人特质'];

const TAG_EMOJIS: Record<string, string> = {
  '内容创作': '✍️',
  '人际沟通': '💬',
  '逻辑分析': '🔍',
  '执行落地': '✅',
  '创意审美': '🎨',
  '共情关怀': '💝',
  '资源整合': '🔗',
  '个人特质': '⭐',
};

interface CapabilitySpectrumProps {
  /** 匹配到的能力标签（来自引擎结果） */
  activeTags?: string[];
  /** 能力签名，如 "内容创作×执行落地的跨界者" */
  signature?: string;
}

export default function CapabilitySpectrum({ activeTags = [], signature }: CapabilitySpectrumProps) {
  if (activeTags.length === 0 && !signature) return null;

  return (
    <div className="p-5 rounded-2xl bg-white/60 border border-warm-dark/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-warm-dark/50">🎯 能力光谱</h3>
        {signature && (
          <span className="text-xs px-2.5 py-1 bg-warm-accent/10 text-warm-accent rounded-full font-medium max-w-[200px] truncate">
            {signature}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {ALL_TAGS.map((tag) => {
          const isActive = activeTags.includes(tag);
          // 计算活跃度：匹配到的标签满格，未匹配的显示低亮度
          const fillPercent = isActive ? 100 : 15;

          return (
            <div key={tag} className="flex items-center gap-3">
              <span className="w-6 text-center shrink-0 text-sm">{TAG_EMOJIS[tag] || '🧩'}</span>
              <span className={`w-16 text-xs shrink-0 transition-colors ${isActive ? 'text-warm-dark font-medium' : 'text-warm-dark/30'}`}>
                {tag}
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-warm-dark/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isActive
                      ? 'bg-gradient-to-r from-warm-accent/60 to-warm-accent'
                      : 'bg-warm-dark/10'
                  }`}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
              <span className={`w-5 text-right text-xs font-mono transition-colors ${isActive ? 'text-warm-accent font-bold' : 'text-warm-dark/20'}`}>
                {isActive ? '●' : '○'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
