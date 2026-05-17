'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const professions = [
  { id: 'waimai', icon: '🏍', name: '外卖骑手', desc: '熟悉路线、体力好、见过各种人', count: 17 },
  { id: 'programmer', icon: '💻', name: '程序员', desc: '写代码、解决问题、逻辑强', count: 17 },
  { id: 'sales', icon: '🤝', name: '销售', desc: '会说话、抗压、懂客户', count: 15 },
  { id: 'mom', icon: '👩', name: '宝妈', desc: '时间管理、多任务、有爱心', count: 16 },
  { id: 'teacher', icon: '👨‍🏫', name: '老师', desc: '会教、能讲、有耐心', count: 16 },
  { id: 'freelancer', icon: '🚀', name: '自由职业者', desc: '自驱力强、一人多职、灵活', count: 16 },
  { id: 'shopkeeper', icon: '🏪', name: '小店主', desc: '懂进货、会算账、人缘好', count: 16 },
  { id: 'worker', icon: '🔧', name: '工厂工人', desc: '体力好、守纪律、能协作', count: 17 },
  { id: 'student', icon: '📚', name: '学生', desc: '学习力强、有好奇心、关注未来', count: 17 },
];

export default function ProfessionPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleNext = () => {
    if (selectedId) {
      // 直接跳到合并后的职业+碎片确认页
      router.push(`/onboarding/setup?id=${selectedId}`);
    }
  };

  return (
    <div className="min-h-screen bg-warm-bg flex flex-col">
      {/* 顶部进度条 - Step 1/2 */}
      <div className="w-full h-1 bg-warm-dark/10">
        <div className="h-full bg-warm-accent w-1/2 transition-all duration-500" />
      </div>

      {/* 返回按钮 + 步骤指示器 */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/onboarding/vision')}
          className="text-warm-dark/60 hover:text-warm-dark transition-colors flex items-center gap-1"
        >
          ← 返回
        </button>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-warm-accent" />
          <span className="w-2 h-2 rounded-full bg-warm-dark/15" />
          <span className="w-2 h-2 rounded-full bg-warm-dark/15" />
        </div>
      </div>

      {/* 标题 */}
      <div className="px-6 pb-6 text-center">
        <h1 className="text-2xl font-bold text-warm-dark mb-2">步骤 1/2</h1>
        <p className="text-warm-dark/60">选一个最像你的身份</p>
        <p className="text-xs text-warm-dark/30 mt-1">选好后立即为你生成专属能力碎片</p>
      </div>

      {/* 职业卡片网格 */}
      <div className="flex-1 px-4 pb-24">
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
          {professions.map((prof) => (
            <button
              key={prof.id}
              onClick={() => handleSelect(prof.id)}
              className={`
                relative p-4 rounded-xl shadow-sm border-2 text-center
                transition-all duration-300 ease-out
                hover:shadow-md hover:-translate-y-1
                ${
                  selectedId === prof.id
                    ? 'border-warm-accent bg-warm-light/50'
                    : 'border-transparent bg-white hover:border-warm-accent/50'
                }
              `}
            >
              <div className="flex flex-col items-center text-center">
                <span className="text-3xl mb-1">{prof.icon}</span>
                <h3 className="font-bold text-warm-dark text-sm mb-0.5">
                  {prof.name}
                </h3>
                <p className="text-[10px] text-warm-dark/50 mb-1.5 line-clamp-2 leading-tight">
                  {prof.desc}
                </p>
                <span className="inline-block px-2 py-0.5 bg-warm-accent/10 text-warm-accent text-[9px] font-medium rounded-full">
                  {prof.count} 碎片
                </span>
              </div>

              {/* 选中指示器 */}
              {selectedId === prof.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-warm-accent rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 下一步按钮 */}
      {selectedId && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-warm-bg via-warm-bg/95 to-transparent">
          <div className="max-w-2xl mx-auto space-y-3">
            <button
              onClick={handleNext}
              className="w-full py-4 bg-warm-accent text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl hover:bg-warm-accent/90 transition-all duration-300 hover:-translate-y-0.5"
            >
              生成我的碎片 →
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 text-warm-dark/40 font-medium text-sm hover:text-warm-dark transition-colors"
            >
              跳过引导
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
