"use client";

import Link from "next/link";
import { useABTest } from "@/hooks/useABTest";

export default function PainSection() {
  const { content, track } = useABTest("pain");

  const pains = [
    { emoji: "📚", title: "学了一堆东西", desc: "Python/写作/剪辑...但不知道能做什么" },
    { emoji: "📝", title: "存了很多笔记", desc: "Obsidian/flomo/微信收藏...但从来没翻过第二次" },
    { emoji: "💡", title: "想做副业", desc: "但觉得自己没什么可卖的" },
    { emoji: "🔒", title: "有稳定工作", desc: "但觉得\"这辈子就这样了\"，看不到突破的可能" },
  ];

  return (
    <section className="py-20 px-6 bg-white/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-warm-dark mb-4">
          {content.title}
        </h2>
        <p className="text-center text-warm-dark/60 mb-12 max-w-2xl mx-auto">
          {content.subtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pains.map((pain, i) => (
            <div
              key={i}
              className="bg-warm-light/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-4">{pain.emoji}</div>
              <h3 className="text-lg font-semibold text-warm-dark mb-2">{pain.title}</h3>
              <p className="text-warm-dark/70">{pain.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/onboarding/vision"
            onClick={() => track("cta_click")}
            className="inline-flex items-center gap-2 px-8 py-4 bg-warm-accent text-warm-light rounded-2xl text-lg font-semibold hover:bg-warm-accent/90 transition-all active:scale-[0.98]"
          >
            {content.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
