"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import HeroSection from "@/components/HeroSection";
import SmartLogInput from "@/components/SmartLogInput";
import FusionDemo from "@/components/FusionDemo";
import LangSwitch from "@/components/LangSwitch";

// 懒加载非首屏组件，减少初始bundle
const PainSection = dynamic(() => import("@/components/PainSection"));
const SocialProofSection = dynamic(() => import("@/components/SocialProofSection"));
const PricingSection = dynamic(() => import("@/components/PricingSection"));


export default function Home() {
  const t = useTranslations("landing");
  const mapFeatures = t.raw("map.features");
  const teacherEvidence = t.raw("case.teacher.evidence");
  const teacherActions = t.raw("case.teacher.actions");
  const teacherResults = t.raw("case.teacher.results");
  const teacherFragments = t.raw("case.teacher.fragments");
  const [showMoreCases, setShowMoreCases] = useState(false);
  const [fragmentCount, setFragmentCount] = useState<number | null>(null);
  const [hasActiveCoCreation, setHasActiveCoCreation] = useState(false);

  useEffect(() => {
    // 静默获取用户状态，用于渐进式展示
    authFetch('/api/fragments/')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setFragmentCount(data.length); })
      .catch(() => {});
    authFetch('/api/co-creation/')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setHasActiveCoCreation(true); })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-warm-light to-warm-bg">
      <HeroSection />
      <LangSwitch />

      {/* Section 1.5: 统一输入流 */}
      <SmartLogInput />

      {/* Section 1.8: 体验融合Demo（无需登录） */}
      <FusionDemo />

      {/* Section 2: 痛点共鸣区（A/B测试） */}
      <PainSection />

      {/* Section 3: 你的旅途 — 聚焦个人成长，合拍作为渐进入口 */}
      <section className="py-20 px-6 bg-white/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-warm-dark mb-4">
              {t("journey.title")}
            </h2>
            <p className="text-warm-dark/60 max-w-xl mx-auto">
              {t("journey.subtitle")}
            </p>
          </div>

          {/* 主入口：我的旅途 */}
          <div className="bg-gradient-to-br from-warm-light/80 to-warm-bg/80 rounded-2xl p-8 border border-warm-accent/10 mb-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <div className="text-3xl mb-3">🧩</div>
                <h3 className="font-semibold text-warm-dark mb-2 text-xl">{t("journey.selfTitle")}</h3>
                <p className="text-sm text-warm-dark/70 mb-4 max-w-md">
                  {t("journey.selfDesc")}
                </p>
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className="text-xs px-3 py-1.5 bg-warm-accent/10 text-warm-accent rounded-full">🧩 {t('journey.tags.fragment')}</span>
                  <span className="text-xs px-3 py-1.5 bg-warm-accent/10 text-warm-accent rounded-full">🔄 {t('journey.tags.fusion')}</span>
                  <span className="text-xs px-3 py-1.5 bg-warm-accent/10 text-warm-accent rounded-full">🌱 {t('journey.tags.action')}</span>
                </div>
                {fragmentCount !== null && (
                  <p className="text-xs text-warm-dark/40 mb-4">
                    已有 {fragmentCount} 个碎片{fragmentCount >= 5 ? t("fragmentMessages.enough") : t("fragmentMessages.keepCollecting")}
                  </p>
                )}
                <Link href="/onboarding/profession">
                  <button className="px-6 py-2.5 bg-warm-accent text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
                    {t("journey.selfCta")}
                  </button>
                </Link>
              </div>
              <div className="hidden sm:block text-7xl opacity-20">🧩</div>
            </div>
          </div>

          {/* 合拍入口（轻量展示，不喧宾夺主） */}
          {fragmentCount !== null && fragmentCount >= 3 && (
            <div className={`bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-2xl p-6 border border-indigo-200/30 transition-all ${fragmentCount < 3 ? 'opacity-50' : 'hover:opacity-100'}`}>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <div className="text-3xl mb-3">🤝</div>
                  <div className="text-sm text-warm-dark/70">
                    <p className="mb-2">
                      {fragmentCount >= 8
                        ? t('journey.coCreateReady1')
                        : fragmentCount >= 5
                          ? t('journey.coCreateReady2')
                          : t('journey.coCreateReady3')
                      }
                    </p>
                    <Link href="/dashboard/co-creation" className="text-indigo-500 hover:text-indigo-600 font-medium text-sm">
                      {hasActiveCoCreation ? t('fragmentMessages.coAction') : t('fragmentMessages.exploreAction')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 4: 社会证明区（A/B测试） */}
      <SocialProofSection />

      {/* Section 3.5: 过程价值 */}
      <section className="py-16 px-6 bg-warm-accent/5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-6">🧩</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-warm-dark mb-6">
            {t("processValue.title")}
          </h2>
          <p className="text-lg text-warm-dark/70 leading-relaxed max-w-2xl mx-auto">
            {t('processValue.desc')}
          </p>
          <p className="text-sm text-warm-dark/50 mt-4 italic">
            {t('processValue.quote')}
          </p>
        </div>
      </section>

      {/* Section 4: 为什么拼拼看Me不同 */}
      <section className="py-20 px-6 bg-warm-bg">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-warm-dark mb-4">
            {t("different.title")}
          </h2>
          <p className="text-center text-warm-dark/50 mb-12 max-w-2xl mx-auto">
            {t("different.subtitle")}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full bg-white/80 rounded-2xl shadow-sm overflow-hidden">
              <thead className="bg-warm-accent/20">
                <tr>
                  <th className="px-6 py-4 text-left text-warm-dark font-semibold">{t("different.compareItem")}</th>
                  <th className="px-6 py-4 text-center text-warm-dark font-semibold">{t('different.compareChatgpt')}</th>
                  <th className="px-6 py-4 text-center text-warm-dark font-semibold">{t("different.compareMe")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-dark/10">
                <tr className="hover:bg-warm-light/50 transition-colors">
                  <td className="px-6 py-4 text-warm-dark font-medium">{t("different.compareFragments")}</td>
                  <td className="px-6 py-4 text-center">❌ {t("different.compareFragmentsChatgpt")}</td>
                  <td className="px-6 py-4 text-center text-warm-success font-medium">✅ {t("different.compareFragmentsMe")}</td>
                </tr>
                <tr className="hover:bg-warm-light/50 transition-colors">
                  <td className="px-6 py-4 text-warm-dark font-medium">{t("different.compareHistory")}</td>
                  <td className="px-6 py-4 text-center">❌ {t("different.compareHistoryChatgpt")}</td>
                  <td className="px-6 py-4 text-center text-warm-success font-medium">✅ {t("different.compareHistoryMe")}</td>
                </tr>
                <tr className="hover:bg-warm-light/50 transition-colors">
                  <td className="px-6 py-4 text-warm-dark font-medium">{t("different.compareLoop")}</td>
                  <td className="px-6 py-4 text-center">❌ {t("different.compareLoopChatgpt")}</td>
                  <td className="px-6 py-4 text-center text-warm-success font-medium">✅ {t("different.compareLoopMe")}</td>
                </tr>
                <tr className="hover:bg-warm-light/50 transition-colors">
                  <td className="px-6 py-4 text-warm-dark font-medium">{t("different.compareStartup")}</td>
                  <td className="px-6 py-4 text-center">❌ {t("different.compareStartupChatgpt")}</td>
                  <td className="px-6 py-4 text-center text-warm-success font-medium">✅ {t("different.compareStartupMe")}</td>
                </tr>
                <tr className="hover:bg-warm-light/50 transition-colors">
                  <td className="px-6 py-4 text-warm-dark font-medium">{t("different.comparePrice")}</td>
                  <td className="px-6 py-4 text-center">❌ {t("different.comparePriceChatgpt")}</td>
                  <td className="px-6 py-4 text-center text-warm-success font-medium">✅ {t("different.comparePriceMe")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 5: 真实案例：老师王姐（主案例） */}
      <section className="py-20 px-6 bg-white/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-warm-dark mb-4">
            {t('case.teacher.title')}
          </h2>
          <p className="text-center text-warm-dark/50 mb-12 max-w-2xl mx-auto">
            {t('case.teacher.subtitle')}
          </p>

          {/* 用户画像 */}
          <div className="bg-warm-light/60 rounded-2xl p-6 mb-8 border-l-4 border-warm-accent">
            <p className="text-warm-dark text-lg italic">
              {t('case.teacher.persona')}
            </p>
            <p className="text-warm-dark/60 mt-1">{t("case.teacher.description")}</p>
          </div>

          {/* 融合前 */}
          <div className="bg-gray-100 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-warm-dark mb-4">{t("case.teacher.fusionBefore")}</h3>
            <ul className="space-y-2 text-warm-dark/70">
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>{t("case.teacher.beforeItem1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>{t("case.teacher.beforeItem2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>{t("case.teacher.beforeItem3")}</span>
              </li>
            </ul>
          </div>

          {/* 拼图片入库展示 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-warm-dark mb-4">{t("case.teacher.fragmentsTitle")}</h3>
            <div className="flex flex-wrap gap-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {teacherFragments.map((tag: any, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warm-accent/15 rounded-full text-sm text-warm-dark"
                >
                  <span>{tag.emoji}</span>
                  <span>{tag.text}</span>
                </span>
              ))}
            </div>
          </div>

          {/* 融合结果 */}
          <div className="bg-warm-accent/20 rounded-2xl p-6 mb-8 border-2 border-warm-accent/30">
            <h3 className="text-lg font-semibold text-warm-dark mb-4">{t("case.teacher.fusionResult")}</h3>
            <div className="space-y-4">
              <div>
                <span className="font-semibold text-warm-dark">金句：</span>
                <p className="text-warm-dark text-lg mt-1 italic">
                  &ldquo;{t("case.teacher.quote")}&rdquo;
                </p>
              </div>
              <div>
                <span className="font-semibold text-warm-dark">方向：</span>
                <p className="text-warm-dark mt-1">{t("case.teacher.direction")}</p>
                <ul className="mt-2 space-y-1 text-warm-dark/70 text-sm">
                  <li>• {teacherEvidence[0]}</li>
                  <li>• {teacherEvidence[1]}</li>
                  <li>• {teacherEvidence[2]}</li>
                  <li>• {teacherEvidence[3]}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 行动卡 */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
            <h3 className="text-lg font-semibold text-warm-dark mb-4">{t("case.teacher.actionCard")}</h3>
            <ol className="space-y-2 text-warm-dark/70">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-warm-accent/20 rounded-full flex items-center justify-center text-sm font-semibold text-warm-dark">1</span>
                <span>{teacherActions[0]}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-warm-accent/20 rounded-full flex items-center justify-center text-sm font-semibold text-warm-dark">2</span>
                <span>{teacherActions[1]}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-warm-accent/20 rounded-full flex items-center justify-center text-sm font-semibold text-warm-dark">3</span>
                <span>{teacherActions[2]}</span>
              </li>
            </ol>
          </div>

          {/* 结果 */}
          <div className="bg-green-50 rounded-2xl p-6 mb-8 border-l-4 border-warm-success">
            <h3 className="text-lg font-semibold text-warm-dark mb-4">{t("case.teacher.resultsTitle")}</h3>
            <ul className="space-y-2 text-warm-dark/80">
              <li className="flex items-start gap-2">
                <span className="text-warm-success">✓</span>
                <span>{teacherResults[0]}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-warm-success">✓</span>
                <span>{teacherResults[1]}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-warm-success">✓</span>
                <span className="font-bold text-warm-success">{t("case.teacher.final")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-warm-success">✓</span>
                <span className="italic">{t("case.teacher.footnote")}</span>
              </li>
            </ul>
          </div>

          <p className="text-center text-xl font-bold text-warm-dark">
            {t('case.teacher.tagline')}
          </p>
          <p className="text-center text-sm text-warm-dark/50 mt-4">
            {t('case.teacher.tagline2')}
          </p>
        </div>
      </section>

      {/* Section 5.5: 更多案例（折叠） */}
      <section className="py-12 px-6 bg-warm-light/30">
        <div className="max-w-4xl mx-auto text-center">
          <button
            onClick={() => setShowMoreCases(!showMoreCases)}
            className="text-warm-accent hover:text-warm-accent/80 font-semibold text-lg transition-colors"
          >
            {showMoreCases ? '收起更多案例 ▲' : '查看更多融合案例 ▼'}
          </button>

          {showMoreCases && (
            <div className="mt-8 text-left">
              {/* 外卖骑手案例（缩略版） */}
              <div className="bg-white/80 rounded-2xl p-6 shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-warm-dark mb-3">
                  {t('case.rider.title')}
                </h3>
                <p className="text-warm-dark/70 mb-3">
                  <span className="font-medium">{t('case.rider.fragments')}：</span>{t('case.rider.fragmentsDesc')}
                </p>
                <div className="bg-warm-accent/10 rounded-xl p-4 mb-3">
                  <p className="text-warm-dark font-medium">
                    金句：&ldquo;{t("case.rider.quote")}&rdquo;
                  </p>
                  <p className="text-warm-dark/70 mt-1">
                    {t("case.rider.direction")}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-warm-success font-medium">
                  <span>✓</span>
                  <span>{t("case.rider.income")}</span>
                </div>
              </div>

              {/* 更多案例占位 */}
              <div className="bg-white/50 rounded-2xl p-6 border border-dashed border-warm-accent/30 text-center">
                <p className="text-warm-dark/50">{t("case.moreCases.pending")}</p>
                <p className="text-warm-dark/40 text-sm mt-1">{t("case.moreCases.next")}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 6: 核心功能 */}
      <section className="py-20 px-6 bg-warm-bg">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-warm-dark mb-4">
            {t("steps.title")}
          </h2>
          <p className="text-center text-warm-dark/50 mb-12 max-w-2xl mx-auto">
            {t("steps.subtitle")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border-2 border-warm-accent/40">
              <div className="text-4xl mb-4">🧩</div>
              <h3 className="text-lg font-semibold text-warm-dark mb-2">{t("steps.step1Title")}</h3>
              <p className="text-warm-dark/70">{t("steps.step1Desc")}</p>
            </div>

            <div className="bg-white/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border-2 border-warm-accent/40">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold text-warm-dark mb-2">{t("steps.step2Title")}</h3>
              <p className="text-warm-dark/70">{t("steps.step2Desc")}</p>
            </div>

            <div className="bg-white/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border-2 border-warm-accent/40">
              <div className="text-4xl mb-4">🚶</div>
              <h3 className="text-lg font-semibold text-warm-dark mb-2">{t("steps.step3Title")}</h3>
              <p className="text-warm-dark/70">{t("steps.step3Desc")}</p>
            </div>

            <div className="bg-white/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border-2 border-warm-accent/40">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-lg font-semibold text-warm-dark mb-2">{t("steps.step4Title")}</h3>
              <p className="text-warm-dark/70">{t("steps.step4Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6.5: 行进地图预览 */}
      <section className="py-20 px-6 bg-warm-accent/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-warm-dark mb-4">
              {t('map.title')}
            </h2>
            <p className="text-lg text-warm-dark/70 max-w-2xl mx-auto">
              {t('map.subtitle')}
            </p>
          </div>

          {/* 地图预览 */}
          <div className="bg-white rounded-2xl border-2 border-warm-border p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-warm-dark">{t("map.example")}</h3>
                <p className="text-sm text-warm-dark/50">{t("map.exampleDesc")}</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-600">
                {t("map.progress")}: 40%
              </span>
            </div>

            {/* 简化版地图网格 */}
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              {[
                { icon: '🏛️', label: '起点广场', status: 'completed' },
                { icon: '🔧', label: '技能工坊', status: 'completed' },
                { icon: '🏪', label: '市场集市', status: 'active' },
                { icon: '🗼', label: '口碑塔', status: 'locked' },
                { icon: '🏰', label: '收益城堡', status: 'locked' },
                { icon: '⭐', label: '里程碑', status: 'locked' },
              ].map((step, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                    step.status === 'completed'
                      ? 'bg-green-50 border-green-300'
                      : step.status === 'active'
                      ? 'bg-amber-50 border-amber-400 shadow-lg'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <span className="text-2xl">{step.icon}</span>
                  <span className="text-[10px] text-center mt-1 text-warm-dark/60">{step.label}</span>
                  {step.status === 'active' && (
                    <span className="text-xs animate-bounce">🚶</span>
                  )}
                </div>
              ))}
            </div>

            {/* 进度条 */}
            <div className="mt-6 h-2 bg-warm-border rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '40%' }} />
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-warm-dark/60">
                {t("map.progressTip")}
              </p>
            </div>
          </div>

          {/* 地图特性 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {mapFeatures.map((feat: {icon:string;title:string;desc:string}, i: number) => (
              <div key={i} className="bg-white/80 rounded-xl p-4 text-center">
                <span className="text-2xl">{feat.icon}</span>
                <h4 className="font-semibold text-warm-dark mt-2">{feat.title}</h4>
                <p className="text-xs text-warm-dark/60 mt-1">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: 定价（A/B测试） */}
      <PricingSection />

      {/* Section 8: 底部CTA */}
      <section className="py-20 px-6 bg-warm-dark">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-warm-light/50 text-sm mb-6">{t("cta.tagline")}</p>
          <Link
            href="/onboarding/vision"
            className="inline-flex items-center gap-2 px-10 py-5 bg-warm-accent text-warm-light rounded-2xl text-xl font-semibold hover:bg-warm-accent/90 hover:shadow-lg hover:shadow-warm-accent/20 transition-all active:scale-[0.98] mb-4"
          >
            {t('hero.cta')}
          </Link>
          <p className="text-warm-light/40 text-sm">
            {t("cta.copyright")}
          </p>
        </div>
      </section>
    </main>
  );
}
import { authFetch  } from '@/lib/api';
