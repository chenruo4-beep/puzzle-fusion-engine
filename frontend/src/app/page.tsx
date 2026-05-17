"use client";

import Link from "next/link";
import { useState } from "react";
import dynamic from "next/dynamic";
import HeroSection from "@/components/HeroSection";
import SmartLogInput from "@/components/SmartLogInput";

// 懒加载非首屏组件，减少初始bundle
const PainSection = dynamic(() => import("@/components/PainSection"));
const SocialProofSection = dynamic(() => import("@/components/SocialProofSection"));
const PricingSection = dynamic(() => import("@/components/PricingSection"));

export default function Home() {
  const [showMoreCases, setShowMoreCases] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-warm-light to-warm-bg">
      <HeroSection />

      {/* Section 1.5: 统一输入流 */}
      <SmartLogInput />

      {/* Section 2: 痛点共鸣区（A/B测试） */}
      <PainSection />

      {/* Section 3: 产品哲学 */}
      <section className="py-20 px-6 bg-white/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-warm-dark mb-8">
            为什么是「拼图」？
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-warm-light/60 rounded-2xl p-6 border border-warm-accent/10">
              <div className="text-3xl mb-3">🧩</div>
              <h3 className="font-semibold text-warm-dark mb-2">你不是没能力</h3>
              <p className="text-sm text-warm-dark/70">你只是还没看到，你已有的拼图片能拼出什么。</p>
            </div>
            <div className="bg-warm-light/60 rounded-2xl p-6 border border-warm-accent/10">
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="font-semibold text-warm-dark mb-2">组合 &gt; 单点</h3>
              <p className="text-sm text-warm-dark/70">老师+读书笔记=付费课程。骑手+短视频=探店博主。</p>
            </div>
            <div className="bg-warm-light/60 rounded-2xl p-6 border border-warm-accent/10">
              <div className="text-3xl mb-3">🌱</div>
              <h3 className="font-semibold text-warm-dark mb-2">越拼越多</h3>
              <p className="text-sm text-warm-dark/70">每融合一次，你就多几块新拼图片。拼图越来越大。</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: 社会证明区（A/B测试） */}
      <SocialProofSection />

      {/* Section 3.5: 过程价值 */}
      <section className="py-16 px-6 bg-warm-accent/5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-6">🧩</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-warm-dark mb-6">
            不必等到「拼完」才感到成就
          </h2>
          <p className="text-lg text-warm-dark/70 leading-relaxed max-w-2xl mx-auto">
            每一次把两块拼图片放在一起，都是一次发现。
            我们记录你每一次拼合——即使未完成，也是成长。
          </p>
          <p className="text-sm text-warm-dark/50 mt-4 italic">
            老师不觉得自己能卖课，骑手不觉得自己能拍视频——
            拼图融合帮你看见，你已经拥有的。
          </p>
        </div>
      </section>

      {/* Section 4: ChatGPT对比表 */}
      <section className="py-20 px-6 bg-warm-bg">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-warm-dark mb-12">
            ChatGPT做不到的事
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full bg-white/80 rounded-2xl shadow-sm overflow-hidden">
              <thead className="bg-warm-accent/20">
                <tr>
                  <th className="px-6 py-4 text-left text-warm-dark font-semibold">对比项</th>
                  <th className="px-6 py-4 text-center text-warm-dark font-semibold">ChatGPT</th>
                  <th className="px-6 py-4 text-center text-warm-dark font-semibold">拼图融合引擎</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-dark/10">
                <tr className="hover:bg-warm-light/50 transition-colors">
                  <td className="px-6 py-4 text-warm-dark font-medium">拼图片管理</td>
                  <td className="px-6 py-4 text-center">❌ 每次重新输入</td>
                  <td className="px-6 py-4 text-center text-warm-success font-medium">✅ 拼图片永久保存，越积越多</td>
                </tr>
                <tr className="hover:bg-warm-light/50 transition-colors">
                  <td className="px-6 py-4 text-warm-dark font-medium">融合历史</td>
                  <td className="px-6 py-4 text-center">❌ 没有</td>
                  <td className="px-6 py-4 text-center text-warm-success font-medium">✅ 3个月成长轨迹可视化</td>
                </tr>
                <tr className="hover:bg-warm-light/50 transition-colors">
                  <td className="px-6 py-4 text-warm-dark font-medium">行动闭环</td>
                  <td className="px-6 py-4 text-center">❌ 给完方案就结束</td>
                  <td className="px-6 py-4 text-center text-warm-success font-medium">✅ 打卡→反馈→新拼图片→再融合</td>
                </tr>
                <tr className="hover:bg-warm-light/50 transition-colors">
                  <td className="px-6 py-4 text-warm-dark font-medium">冷启动</td>
                  <td className="px-6 py-4 text-center">❌ 不知道输入什么</td>
                  <td className="px-6 py-4 text-center text-warm-success font-medium">✅ 选个职业就有预设拼图片</td>
                </tr>
                <tr className="hover:bg-warm-light/50 transition-colors">
                  <td className="px-6 py-4 text-warm-dark font-medium">定价</td>
                  <td className="px-6 py-4 text-center">❌ $20/月</td>
                  <td className="px-6 py-4 text-center text-warm-success font-medium">✅ 免费25次/月</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 5: 真实案例：老师王姐（主案例） */}
      <section className="py-20 px-6 bg-white/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-warm-dark mb-12">
            真实案例：中学老师王姐的拼图融合
          </h2>

          {/* 用户画像 */}
          <div className="bg-warm-light/60 rounded-2xl p-6 mb-8 border-l-4 border-warm-accent">
            <p className="text-warm-dark text-lg italic">
              王姐，38岁，三线城市初中语文老师，教龄12年
            </p>
            <p className="text-warm-dark/60 mt-1">月薪4500，暑假2个月空闲，觉得&ldquo;这辈子就这样了&rdquo;</p>
          </div>

          {/* 融合前 */}
          <div className="bg-gray-100 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-warm-dark mb-4">融合前</h3>
            <ul className="space-y-2 text-warm-dark/70">
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>每天重复备课上课改作业，觉得自己的能力&ldquo;不值钱&rdquo;</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>朋友圈发过几条读书笔记，有人点赞但没人付费</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>想：我就会讲课，这能卖什么？</span>
              </li>
            </ul>
          </div>

          {/* 拼图片入库展示 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-warm-dark mb-4">拼图片入库</h3>
            <div className="flex flex-wrap gap-3">
              {[
                { emoji: "🧩", text: "课程设计（12年教案）" },
                { emoji: "🧩", text: "公开演讲（从不怯场）" },
                { emoji: "🧩", text: "PPT制作（同事抢着借模板）" },
                { emoji: "❤️", text: "读书笔记（朋友圈日更3年）" },
                { emoji: "⚡", text: "耐心倾听（家长爱找她聊天）" },
                { emoji: "📚", text: "辅导邻居孩子作文提15分" },
              ].map((tag, i) => (
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
            <h3 className="text-lg font-semibold text-warm-dark mb-4">融合结果</h3>
            <div className="space-y-4">
              <div>
                <span className="font-semibold text-warm-dark">金句：</span>
                <p className="text-warm-dark text-lg mt-1 italic">
                  &ldquo;你早就会讲课了，只是还没学会给自己定价。&rdquo;
                </p>
              </div>
              <div>
                <span className="font-semibold text-warm-dark">方向：</span>
                <p className="text-warm-dark mt-1">暑假作文陪跑营 + 读书笔记IP + 家长沟通咨询</p>
                <ul className="mt-2 space-y-1 text-warm-dark/70 text-sm">
                  <li>• 你有课程设计能力：做一套&ldquo;7天作文速成&rdquo;完全没问题</li>
                  <li>• 你有公开演讲经验：录网课根本不是事</li>
                  <li>• 你有读书笔记习惯：小红书/公众号天然素材</li>
                  <li>• 你有耐心倾听：家长付费咨询，你比心理老师还管用</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 行动卡 */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
            <h3 className="text-lg font-semibold text-warm-dark mb-4">行动卡</h3>
            <ol className="space-y-2 text-warm-dark/70">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-warm-accent/20 rounded-full flex items-center justify-center text-sm font-semibold text-warm-dark">1</span>
                <span>本周：把朋友圈最好的5条读书笔记发到小红书，测试流量</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-warm-accent/20 rounded-full flex items-center justify-center text-sm font-semibold text-warm-dark">2</span>
                <span>下周：用你的PPT模板做一套&ldquo;7天作文速成&rdquo;大纲</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-warm-accent/20 rounded-full flex items-center justify-center text-sm font-semibold text-warm-dark">3</span>
                <span>暑假前：在小红书发&ldquo;作文陪跑营&rdquo;招募帖，定价¥299/人</span>
              </li>
            </ol>
          </div>

          {/* 结果 */}
          <div className="bg-green-50 rounded-2xl p-6 mb-8 border-l-4 border-warm-success">
            <h3 className="text-lg font-semibold text-warm-dark mb-4">结果</h3>
            <ul className="space-y-2 text-warm-dark/80">
              <li className="flex items-start gap-2">
                <span className="text-warm-success">✓</span>
                <span>第一个月小红书发了20条读书笔记，涨粉800</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-warm-success">✓</span>
                <span>暑假开了第一期作文陪跑营，8个学生，收入¥2392</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-warm-success">✓</span>
                <span className="font-bold text-warm-success">每月课外收入¥2000-4000，暑假能翻倍</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-warm-success">✓</span>
                <span className="italic">用的还是她每天都在做的事——讲课、读书、聊天</span>
              </li>
            </ul>
          </div>

          <p className="text-center text-xl font-bold text-warm-dark">
            你每天都在用的能力，可能就是别人愿意付费的技能。
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
                  🛵 外卖骑手小李
                </h3>
                <p className="text-warm-dark/70 mb-3">
                  <span className="font-medium">碎片：</span>熟悉城市路线 + 会修电动车 + 每天刷短视频3小时 + 奇葩订单经历
                </p>
                <div className="bg-warm-accent/10 rounded-xl p-4 mb-3">
                  <p className="text-warm-dark font-medium">
                    金句：&ldquo;你跑过的每一单，都是别人拍不出来的内容。&rdquo;
                  </p>
                  <p className="text-warm-dark/70 mt-1">
                    方向：外卖视角探店 + 奇葩订单故事系列
                  </p>
                </div>
                <div className="flex items-center gap-2 text-warm-success font-medium">
                  <span>✓</span>
                  <span>月均多赚¥800-1500</span>
                </div>
              </div>

              {/* 更多案例占位 */}
              <div className="bg-white/50 rounded-2xl p-6 border border-dashed border-warm-accent/30 text-center">
                <p className="text-warm-dark/50">更多真实案例持续更新中...</p>
                <p className="text-warm-dark/40 text-sm mt-1">你的故事，可能就是下一个</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 6: 核心功能 */}
      <section className="py-20 px-6 bg-warm-bg">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-warm-dark mb-12">
            每一个功能，都是一块拼图
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border-2 border-warm-accent/40">
              <div className="text-4xl mb-4">🧩</div>
              <h3 className="text-lg font-semibold text-warm-dark mb-2">拼图片入库</h3>
              <p className="text-warm-dark/70">技能/爱好/知识/经历一键入库，AI自动分类打标签</p>
            </div>

            <div className="bg-white/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border-2 border-warm-accent/40">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold text-warm-dark mb-2">主动融合</h3>
              <p className="text-warm-dark/70">点击「融合」，AI用8刃切割输出金句+行动方案</p>
            </div>

            <div className="bg-white/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border-2 border-warm-accent/40">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-warm-dark mb-2">输出多样</h3>
              <p className="text-warm-dark/70">可执行行动卡 + 观点卡 + 口播脚本 + 案例卡</p>
            </div>

            <div className="bg-white/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border-2 border-warm-accent/40">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-lg font-semibold text-warm-dark mb-2">成长循环</h3>
              <p className="text-warm-dark/70">打卡→反馈→新拼图片→再融合，越用越准</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: 定价（A/B测试） */}
      <PricingSection />

      {/* Section 8: 底部CTA */}
      <section className="py-20 px-6 bg-warm-dark">
        <div className="max-w-2xl mx-auto text-center">
          <Link
            href="/onboarding/vision"
            className="inline-flex items-center gap-2 px-10 py-5 bg-warm-accent text-warm-light rounded-2xl text-xl font-semibold hover:bg-warm-accent/90 hover:shadow-lg hover:shadow-warm-accent/20 transition-all active:scale-[0.98] mb-4"
          >
            开始融合
          </Link>
          <p className="text-warm-light/60 text-sm mb-8">
            选择你的职业，2分钟完成入门
          </p>
          <p className="text-warm-light/40 text-sm">
            © 2026 拼图融合引擎 | 你的拼图片，值得被拼起来
          </p>
        </div>
      </section>
    </main>
  );
}
