"use client";

import Link from "next/link";
import { useABTest } from "@/hooks/useABTest";

export default function PricingSection() {
  const { content, track } = useABTest("pricing");

  return (
    <section className="py-20 px-6 bg-white/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-warm-dark mb-4">
          {content.title}
        </h2>
        <p className="text-center text-warm-dark/60 mb-12 max-w-2xl mx-auto">
          {content.subtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="bg-warm-light/80 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-warm-dark mb-6">免费版</h3>
            <p className="text-sm text-warm-dark/50 mb-6">试一试，不需要决定什么。</p>
            <ul className="space-y-3 text-warm-dark/70 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-warm-success">✓</span>
                <span>50块碎片 — 够拼出一两个方向</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-warm-success">✓</span>
                <span>25次融合/月 — 够用了</span>
              </li>
            </ul>
            <div className="text-center">
              <span className="text-3xl font-bold text-warm-dark">免费</span>
            </div>
          </div>

          <div className="bg-warm-accent/15 rounded-2xl p-6 shadow-sm border-2 border-warm-accent/30">
            <h3 className="text-xl font-bold text-warm-dark mb-6">专业版</h3>
            <p className="text-sm text-warm-dark/50 mb-6">碎片多了、想深入了，再升级。</p>
            <ul className="space-y-3 text-warm-dark/70 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-warm-success">✓</span>
                <span>无限碎片 + 无限融合</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-warm-success">✓</span>
                <span>输出卡片定制</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-warm-success">✓</span>
                <span>AI调教偏好保存</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-warm-success">✓</span>
                <span>优先体验新功能</span>
              </li>
            </ul>
            <div className="text-center">
              <span className="text-3xl font-bold text-warm-dark">¥18/月</span>
              <span className="text-warm-dark/50 ml-2">或 ¥180/年</span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-3">
          <Link
            href="/onboarding/vision"
            onClick={() => track("cta_click")}
            className="inline-flex items-center gap-2 px-10 py-5 bg-warm-accent text-warm-light rounded-2xl text-xl font-semibold hover:bg-warm-accent/90 transition-all active:scale-[0.98]"
          >
            {content.cta}
          </Link>
          <p className="text-xs text-warm-dark/40">
            免费开始，随时可取消
          </p>
        </div>
      </div>
    </section>
  );
}
