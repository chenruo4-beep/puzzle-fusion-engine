'use client';

import { useRouter } from 'next/navigation';

export default function VisionPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-warm-bg flex flex-col items-center justify-center px-6">
      {/* 进度条 - 0% */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-warm-dark/10">
        <div className="h-full bg-warm-accent w-[10%] transition-all duration-500" />
      </div>

      {/* 主体内容 */}
      <div className="max-w-sm w-full text-center space-y-6 -mt-8">
        {/* Logo / Icon */}
        <div className="space-y-3">
          <div className="text-7xl">🧩</div>
          <h1 className="text-3xl font-bold text-warm-dark">拼图融合引擎</h1>
        </div>

        {/* 产品理念 */}
        <div className="space-y-5">
          <p className="text-lg text-warm-dark/80 leading-relaxed">
            你身上的每一块碎片，<br/>
            都是你走过路的最强证据
          </p>

          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/60">
              <span className="text-2xl shrink-0 mt-0.5">🏍</span>
              <div>
                <p className="text-sm font-medium text-warm-dark">跑过外卖？</p>
                <p className="text-xs text-warm-dark/50 mt-0.5">那是路线规划 + 客户服务 + 时间管理</p>
              </div>
            </div>

            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/60">
              <span className="text-2xl shrink-0 mt-0.5">👩</span>
              <div>
                <p className="text-sm font-medium text-warm-dark">带过娃？</p>
                <p className="text-xs text-warm-dark/50 mt-0.5">那是多任务处理 + 资源整合 + 情绪管理</p>
              </div>
            </div>

            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/60">
              <span className="text-2xl shrink-0 mt-0.5">🏪</span>
              <div>
                <p className="text-sm font-medium text-warm-dark">开过店？</p>
                <p className="text-xs text-warm-dark/50 mt-0.5">那是供应链 + 财务 + 社群运营</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-warm-accent/5 border border-warm-accent/10">
            <p className="text-sm text-warm-dark/70 leading-relaxed">
              <strong className="text-warm-accent">只需3步：</strong><br/>
              ① 选职业 → ② 确认碎片 → ③ 看融合结果
            </p>
          </div>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="fixed top-16 left-0 right-0 flex justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-warm-accent" />
        <span className="w-2 h-2 rounded-full bg-warm-dark/15" />
        <span className="w-2 h-2 rounded-full bg-warm-dark/15" />
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-warm-bg via-warm-bg/95 to-transparent">
        <div className="max-w-sm mx-auto space-y-3">
          <button
            onClick={() => router.push('/onboarding/profession')}
            className="w-full py-4 bg-warm-accent text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl hover:bg-warm-accent/90 transition-all duration-300 hover:-translate-y-0.5"
          >
            开始拼图 →
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 text-warm-dark/40 font-medium text-sm hover:text-warm-dark/60 transition-colors"
          >
            跳过引导
          </button>
        </div>
      </div>
    </div>
  );
}
