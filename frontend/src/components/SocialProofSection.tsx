"use client";

import { useState } from "react";
import Link from "next/link";
import { useABTest } from "@/hooks/useABTest";

export default function SocialProofSection() {
  const { content, track } = useABTest("social");
  const [expandedCase, setExpandedCase] = useState<number | null>(0);

  const cases = [
    {
      name: "王姐",
      role: "初中语文老师",
      result: "暑假作文陪跑营，月入¥2000-4000",
      quote: "\"你早就会讲课了，只是还没学会给自己定价。\"",
      detail: "王姐教了12年语文，一直觉得'副业'跟自己没关系。用拼图融合引擎梳理后，发现自己最值钱的不是'语文知识'，而是'批改作文时一眼看出问题所在'的能力。现在她的暑假作文陪跑营，家长排队报名。",
    },
    {
      name: "小李",
      role: "外卖骑手",
      result: "外卖视角探店博主，月均多赚¥800-1500",
      quote: "\"你跑过的每一单，都是别人拍不出来的内容。\"",
      detail: "小李每天跑单经过几十家店，知道哪家真好吃、哪家是刷评。他把这些'无用'的观察录成15秒探店视频，3个月涨了2万粉，现在商家主动找他合作。",
    },
    {
      name: "阿杰",
      role: "前端程序员",
      result: "技术博客 + 付费专栏，被动收入¥3000/月",
      quote: "\"写过的每一行代码，都是教程的素材。\"",
      detail: "阿杰写了5年代码，笔记散落在10个文件夹里。用拼图融合引擎整理后，发现可以串成一套'从零学React'的系列教程。现在专栏每月被动收入够付房租。",
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
              onClick={() => setExpandedCase(expandedCase === i ? null : i)}
              className={`bg-white/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                expandedCase === i ? 'ring-2 ring-warm-accent/30' : ''
              }`}
            >
              <div className="text-sm text-warm-dark/50 mb-2">
                {c.name} · {c.role}
              </div>
              <p className="text-warm-dark font-medium mb-3">{c.result}</p>
              <p className="text-warm-dark/60 text-sm italic mb-3">{c.quote}</p>
              {expandedCase === i && (
                <div className="pt-3 border-t border-warm-dark/10">
                  <p className="text-sm text-warm-dark/70 leading-relaxed">{c.detail}</p>
                </div>
              )}
              {expandedCase !== i && (
                <p className="text-xs text-warm-accent/60 mt-2">点击查看完整故事 →</p>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
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
