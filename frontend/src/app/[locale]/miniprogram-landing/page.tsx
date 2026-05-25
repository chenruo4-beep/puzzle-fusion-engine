'use client';

import Link from 'next/link';

const FAQS = [
  { q: '这跟 ChatGPT 有什么区别？', a: 'ChatGPT 每次都要重新说一遍自己。Me 会记住你的碎片，越拼越准。而且不用反复追问，Me 自己会主动拼。' },
  { q: '我没什么特别的技能，也能用吗？', a: '来 Me 的人大多都这么说。你身上那些「这没什么」的小事——会安慰人、能记住很久以前的事——可能就是你自己没当真的碎片。' },
  { q: '要花很多时间吗？', a: '不用。每次 2 分钟就能完成一次记录或融合。Me 不催你，按你的节奏来就好。' },
  { q: '真的能找到方向吗？', a: '不是 Me 帮你找方向，是你自己的碎片会告诉你方向。Me 只是帮你把它们拼在一起，让你自己看见。' },
];

const STEPS = [
  { icon: '📝', title: '随手记', desc: '想到什么记什么——你今天擅长的事、别人夸你的话、做起来很爽的小事。' },
  { icon: '🧩', title: '自动拼', desc: 'Me 把你的碎片自动归类、连接、融合。当你攒够了，就拼一次，看看能出来什么。' },
  { icon: '🚶', title: '试一试', desc: '每个方向都有具体的第一步，打开手机就能做。走两步，不合适就换，不亏。' },
];

const FRAGMENT_EXAMPLES = [
  '很会安慰人',
  '能记住很久以前的事',
  '看到配色不对就浑身难受',
  '朋友遇到事总爱跟我说',
];

const FRAGMENT_TYPES = ['能力', '特质', '习惯', '技能'];

export default function MiniProgramLanding() {
  return (
    <main className="min-h-screen bg-warm-light text-warm-dark font-sans">

      {/* ====== 第一屏：首屏大标题 + 开始拼按钮 ====== */}
      <section className="min-h-screen flex flex-col justify-center px-6 py-16 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-10 right-10 text-8xl opacity-5 select-none">🧩</div>
        <div className="absolute bottom-20 left-5 text-6xl opacity-5 select-none">🧩</div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-warm-accent/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-md mx-auto w-full">
          <p className="text-warm-accent text-sm font-medium mb-4 tracking-wider">拼拼看Me</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
            你本来就有的东西，
            <br />
            <span className="text-warm-accent">拼出一个自己</span>
          </h1>
          <p className="text-warm-dark/60 text-base leading-relaxed mb-8">
            你身上散落着很多碎片——
            <br />
            你的经验、直觉、被夸过但自己没当真的小事。
            <br />
            Me 帮你把它们捡起来，拼拼看。
          </p>
          <Link
            href="/onboarding/profession"
            className="inline-flex items-center justify-center w-full px-8 py-4 bg-warm-accent text-white rounded-2xl text-lg font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-warm-accent/20"
          >
            开始拼
          </Link>
          <p className="text-center text-xs text-warm-dark/40 mt-3">2 分钟完成入门，不需要注册</p>
        </div>
      </section>

      {/* ====== 第二屏：这是什么 ====== */}
      <section className="min-h-screen flex flex-col justify-center px-6 py-16 bg-white/40">
        <div className="max-w-md mx-auto w-full">
          <p className="text-warm-accent text-sm font-medium mb-2 tracking-wider">这是什么</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-10">
            Me 是你的碎片拼图师
          </h2>

          <div className="space-y-8">
            {/* 帧 1 */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-warm-accent/15 flex items-center justify-center text-xl flex-shrink-0">📥</div>
              <div>
                <h3 className="font-semibold mb-1">存进去</h3>
                <p className="text-sm text-warm-dark/60 leading-relaxed">
                  把你会的、喜欢的、做过的、被夸过的——不管大小，先存进去。
                </p>
              </div>
            </div>
            {/* 帧 2 */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-warm-accent/15 flex items-center justify-center text-xl flex-shrink-0">🔄</div>
              <div>
                <h3 className="font-semibold mb-1">拼起来</h3>
                <p className="text-sm text-warm-dark/60 leading-relaxed">
                  Me 会自动扫描你的碎片，找到它们之间的隐藏连接，拼成一个方向。
                </p>
              </div>
            </div>
            {/* 帧 3 */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-warm-accent/15 flex items-center justify-center text-xl flex-shrink-0">🚶</div>
              <div>
                <h3 className="font-semibold mb-1">走出去</h3>
                <p className="text-sm text-warm-dark/60 leading-relaxed">
                  每个方向都有具体的第一步——打开手机备忘录就能做的那种。走两步就知道对不对。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 第三屏：怎么玩（三步卡片） ====== */}
      <section className="min-h-screen flex flex-col justify-center px-6 py-16">
        <div className="max-w-md mx-auto w-full">
          <p className="text-warm-accent text-sm font-medium mb-2 tracking-wider">怎么玩</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-10">
            三件事，不用想太多
          </h2>

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={i} className="bg-white/70 rounded-2xl p-5 border border-warm-accent/10">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{step.icon}</span>
                  <div>
                    <span className="text-xs text-warm-accent font-medium">STEP {i + 1}</span>
                    <h3 className="font-semibold text-warm-dark">{step.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-warm-dark/60 leading-relaxed ml-11">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== 第四屏：真实碎片示例（手机模拟框） ====== */}
      <section className="min-h-screen flex flex-col justify-center px-6 py-16 bg-white/40">
        <div className="max-w-md mx-auto w-full">
          <p className="text-warm-accent text-sm font-medium mb-2 tracking-wider">真实的样子</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">
            这些碎片，也是别人的
          </h2>
          <p className="text-sm text-warm-dark/50 mb-8">
            来 Me 的人最开始写的碎片，往往都是这种「这没什么吧」的小事——
          </p>

          {/* 手机模拟框 */}
          <div className="bg-warm-dark rounded-3xl p-4 shadow-xl mx-auto max-w-[280px]">
            {/* 状态栏 */}
            <div className="flex items-center justify-between text-white/60 text-xs px-2 pb-3">
              <span>9:41</span>
              <span className="text-white/40 text-[10px]">拼拼看Me</span>
            </div>
            {/* 内容区 */}
            <div className="bg-warm-light rounded-2xl p-4 min-h-[320px]">
              <p className="text-xs text-warm-accent font-medium mb-3">我的碎片 · 4 块</p>
              <div className="space-y-2">
                {FRAGMENT_EXAMPLES.map((f, i) => (
                  <div key={i} className="bg-white rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-sm">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-warm-accent/10 text-warm-accent flex-shrink-0">
                      {FRAGMENT_TYPES[i]}
                    </span>
                    <span className="text-sm text-warm-dark">{f}</span>
                  </div>
                ))}
              </div>
              {/* 融合按钮 */}
              <div className="mt-4 bg-warm-accent text-white text-center py-2.5 rounded-xl text-sm font-medium">
                拼拼看能做什么
              </div>
            </div>
            {/* Home indicator */}
            <div className="flex justify-center pt-3">
              <div className="w-24 h-1 bg-white/30 rounded-full" />
            </div>
          </div>

          <p className="text-center text-xs text-warm-dark/40 mt-6 italic">
            「原来这些也算碎片啊？」
          </p>
        </div>
      </section>

      {/* ====== 第五屏：为什么叫 Me ====== */}
      <section className="min-h-screen flex flex-col justify-center px-6 py-16">
        <div className="max-w-md mx-auto w-full text-center">
          <div className="text-6xl mb-6 opacity-80">🧩</div>
          <p className="text-warm-accent text-sm font-medium mb-2 tracking-wider">为什么叫 Me</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">
            拼出来的，是你自己
          </h2>
          <div className="text-left space-y-4 text-sm text-warm-dark/70 leading-relaxed">
            <p>
              <strong className="text-warm-dark">Me</strong> 不是「我帮你找答案」，而是「你拼出来的自己」。
            </p>
            <p>
              那些碎片本来就是你的一部分。Me 只是帮你把它们摆在一起，让你看见那些被你忽略的、习以为常的、但却是独一无二的东西。
            </p>
            <p>
              所以叫 Me——因为你本来就有答案，只是还没拼出来。
            </p>
          </div>

          {/* 品牌调性 */}
          <div className="mt-8 grid grid-cols-2 gap-2 text-center">
            {['不哄你', '不催你', '不打鸡血', '靠得住'].map((tag, i) => (
              <span key={i} className="px-3 py-2 bg-warm-accent/10 rounded-xl text-xs text-warm-accent font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====== 第六屏：轻量 FAQ（4问） ====== */}
      <section className="min-h-screen flex flex-col justify-center px-6 py-16 bg-white/40">
        <div className="max-w-md mx-auto w-full">
          <p className="text-warm-accent text-sm font-medium mb-2 tracking-wider">你可能想问</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-8">
            几个常见的问题
          </h2>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="bg-white/70 rounded-2xl border border-warm-accent/10 overflow-hidden group">
                <summary className="px-5 py-4 font-medium text-sm cursor-pointer list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-warm-accent text-lg transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-warm-dark/60 leading-relaxed border-t border-warm-accent/5 pt-3">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ====== 第七屏：收尾行动号召 ====== */}
      <section className="min-h-screen flex flex-col justify-center px-6 py-16 relative overflow-hidden">
        <div className="absolute bottom-10 right-10 text-8xl opacity-5 select-none">🧩</div>
        <div className="absolute top-20 left-5 text-6xl opacity-5 select-none">🧩</div>

        <div className="max-w-md mx-auto w-full text-center relative z-10">
          <div className="text-7xl mb-8">🧩</div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
            你的碎片，值得被拼起来
          </h2>
          <p className="text-warm-dark/60 text-base leading-relaxed mb-8">
            不需要准备什么。选一个职业，看看你身上已经有什么。
            <br />
            也许拼出来的第一个方向，就是你想了很久但没迈出的那一步。
          </p>
          <Link
            href="/onboarding/profession"
            className="inline-flex items-center justify-center w-full px-8 py-4 bg-warm-accent text-white rounded-2xl text-lg font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-warm-accent/20"
          >
            开始拼
          </Link>
          <p className="text-xs text-warm-dark/40 mt-3">2 分钟完成入门，不需要注册</p>

          <div className="mt-12 text-xs text-warm-dark/30">
            <p>© 2026 拼拼看Me</p>
            <p className="mt-1">把你本来就有的东西，拼出一个自己</p>
          </div>
        </div>
      </section>

    </main>
  );
}
