"use client";

import Link from "next/link";
import { useABTest } from "@/hooks/useABTest";

export default function HeroSection() {
  const { content, version, track } = useABTest();

  // 渲染标题（支持换行符 \n）
  const renderTitle = (title: string) => {
    return title.split('\n').map((line, index) => (
      <span key={index}>
        {index > 0 && <br />}
        {line}
      </span>
    ));
  };

  return (
    <section className="pt-32 pb-20 px-6 bg-warm-bg min-h-screen flex items-center">
      <div className="max-w-4xl mx-auto text-center">
        {/* 版本标识（开发环境可见） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-6">
            A/B Test Version: {version}
          </div>
        )}

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-warm-dark mb-6 leading-tight">
          {renderTitle(content.title)}
        </h1>

        <p className="text-lg sm:text-xl text-warm-dark/70 mb-10 max-w-2xl mx-auto leading-relaxed">
          {content.subtitle}
        </p>

        <Link
          href="/onboarding/vision"
          onClick={() => track('cta_click')}
          className="inline-flex items-center gap-2 px-10 py-5 bg-warm-accent text-warm-light rounded-2xl text-xl font-semibold hover:bg-warm-accent/90 hover:shadow-lg hover:shadow-warm-accent/20 transition-all active:scale-[0.98]"
        >
          {content.cta}
        </Link>

        <p className="text-warm-dark/40 text-sm mt-4">
          不需要信用卡，选择你的职业，2分钟完成入门
        </p>
      </div>
    </section>
  );
}
