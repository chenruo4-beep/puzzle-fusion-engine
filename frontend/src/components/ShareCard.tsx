'use client';

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';

interface ShareCardProps {
  goldenSentence: string;
  profession: string;
  confidence?: number;
  directions: Array<{
    title: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    next_action: string;
  }>;
  insight: string;
  userName?: string;
}

export default function ShareCard({ 
  goldenSentence, 
  profession, 
  confidence, 
  directions, 
  insight,
  userName = '我'
}: ShareCardProps) {
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#FDF8F3',
        scale: 3,
        useCORS: true,
        logging: false,
      });
      
      // 下载图片
      const link = document.createElement('a');
      link.download = `拼图融合_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // 复制分享文案到剪贴板
      const shareText = generateShareText();
      await navigator.clipboard.writeText(shareText);
      
      alert('图片已保存，分享文案已复制到剪贴板！');
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const generateShareText = () => {
    const dirText = directions.slice(0, 2).map((d, i) => 
      `${i + 1}. ${d.title}（${d.difficulty === 'easy' ? '上手快' : d.difficulty === 'hard' ? '有挑战' : '中等难度'}）`
    ).join('\n');
    
    return `🧩 我的拼图融合报告

"${goldenSentence}"

💡 发现了${directions.length}个可能的方向：
${dirText}

🎯 下一步：${directions[0]?.next_action || '开始行动'}

——来自「拼图融合引擎」
你也来试试：localhost:3000`;
  };

  const difficultyEmoji = {
    easy: '🟢',
    medium: '🟡',
    hard: '🔴'
  };

  return (
    <div className="space-y-4">
      {/* 预览卡片 */}
      <div 
        ref={cardRef}
        className="bg-gradient-to-br from-[#FDF8F3] via-[#F5EDE4] to-[#EDE4D8] p-8 rounded-2xl border-2 border-[#D4A574]/30 shadow-lg"
        style={{ width: 375, minHeight: 500 }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧩</span>
            <span className="text-sm font-bold text-[#8B7355]">拼图融合引擎</span>
          </div>
          <span className="text-xs text-[#8B7355]/60">
            {new Date().toLocaleDateString('zh-CN')}
          </span>
        </div>

        {/* 用户信息 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4A574] to-[#C8956C] flex items-center justify-center text-white font-bold text-lg">
            {userName[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-[#5C4A3A]">{userName}</p>
            <p className="text-xs text-[#8B7355]">{profession}</p>
          </div>
        </div>

        {/* 金句 */}
        <div className="bg-white/60 rounded-xl p-5 mb-5 border border-[#D4A574]/20">
          <p className="text-lg font-bold text-[#5C4A3A] leading-relaxed text-center">
            &ldquo;{goldenSentence}&rdquo;
          </p>
        </div>

        {/* 置信度 */}
        {confidence && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-2 w-32 bg-[#E8DDD0] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#D4A574] to-[#C8956C] rounded-full transition-all"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="text-xs text-[#8B7355]">置信度 {confidence}%</span>
          </div>
        )}

        {/* 方向 */}
        <div className="space-y-3 mb-5">
          <p className="text-xs font-medium text-[#8B7355] uppercase tracking-wider">发现的方向</p>
          {directions.slice(0, 3).map((dir, i) => (
            <div key={i} className="flex items-start gap-2 bg-white/40 rounded-lg p-3">
              <span className="text-lg">{difficultyEmoji[dir.difficulty || 'medium']}</span>
              <div>
                <p className="text-sm font-medium text-[#5C4A3A]">{dir.title}</p>
                <p className="text-xs text-[#8B7355] mt-0.5">{dir.next_action}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 洞察 */}
        <div className="bg-[#D4A574]/10 rounded-lg p-3 mb-5">
          <p className="text-xs text-[#8B7355] leading-relaxed">💡 {insight}</p>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between pt-4 border-t border-[#D4A574]/20">
          <p className="text-xs text-[#8B7355]/60">拼图融合引擎 · 发现你的可能性</p>
          <span className="text-xl">🧩</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex-1 py-3 bg-gradient-to-r from-[#D4A574] to-[#C8956C] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {exporting ? '⏳ 生成中...' : '📸 保存分享卡片'}
        </button>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(generateShareText());
              alert('分享文案已复制！');
            } catch {
              alert('复制失败');
            }
          }}
          className="px-5 py-3 bg-[#F5EDE4] text-[#8B7355] rounded-xl text-sm font-medium hover:bg-[#EDE4D8] transition-colors"
        >
          📋 复制文案
        </button>
      </div>

      {/* 分享提示 */}
      <p className="text-xs text-center text-[#8B7355]/60">
        💡 保存图片后可直接发朋友圈，文案已针对微信优化
      </p>
    </div>
  );
}
