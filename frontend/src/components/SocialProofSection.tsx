"use client";

import { useABTest } from "@/hooks/useABTest";

export default function SocialProofSection() {
  const { content, track } = useABTest("social");

  const cases = [
    {
      name: "王姐",
      role: "初中语文老师",
      result: "暑假作文陪跑营，月入¥2000-4000",
      quote: "\"你早就会讲课了，只是还没学会给自己定价。\"",
    },
    {
      name: "小李",
      role: "外卖骑手",
      result: "外卖视角探店博主，月均多赚¥800-1500",
      quote: "\"你跑过的每一单，都是别人拍不出来的内容。\"",
    },
    {
      name: "阿杰",
      role: "前端程序员",
      result: "技术博客 + 付费专栏，被动收入¥3000/月",
      quote: "\"写过的每一行代码，都是教程的素材。\"",
    },
  ];

  return (
    <section className="py-20 px-6 bg-warm-accent/5">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-warm-dark mb-4">
          {content.title}
        </h2>
        <p className="text-center text-warm-dark/60 mb-12 max-w-2xl mx-auto">
          {content.subtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {cases.map((c, i) => (
            <div
              key={i}
              className="bg-white/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-sm text-warm-dark/50 mb-2">
                {c.name} · {c.role}
              </div>
              <p className="text-warm-dark font-medium mb-3">{c.result}</p>
              <p className="text-warm-dark/60 text-sm italic">{c.quote}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => track("cta_click")}
            className="inline-flex items-center gap-2 px-8 py-4 bg-warm-accent text-warm-light rounded-2xl text-lg font-semibold hover:bg-warm-accent/90 transition-all active:scale-[0.98]"
          >
            {content.cta}
          </button>
        </div>
      </div>
    </section>
  );
}
