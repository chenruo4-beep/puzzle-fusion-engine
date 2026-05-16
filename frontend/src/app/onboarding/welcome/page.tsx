'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface FusionData {
  profession: string;
  professionIcon: string;
  fragments: { type: string; content: string }[];
}

interface RoadmapStep {
  step: number;
  time: string;
  action: string;
}

interface FusionDirection {
  title: string;
  why_this_works?: string;
  description?: string;
  market_hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  time_to_first_result?: string;
  roadmap?: RoadmapStep[];
  used_fragments: string[];
  next_action: string;
}

interface FusionResult {
  golden_sentence: string;
  profile_tag?: string;
  confidence?: number;
  directions: FusionDirection[];
  insight: string;
  skill_gaps?: string[];
  fragment_connections?: FragmentConnection[];
}

interface FragmentConnection {
  fragment_a: string;
  fragment_b: string;
  connection: string;
}

const DIFFICULTY_CONFIG = {
  easy: { label: '上手快', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  medium: { label: '中等难度', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  hard: { label: '有挑战', color: 'bg-rose-100 text-rose-700', dot: 'bg-rose-400' },
};

const API_BASE = 'http://localhost:8000';

type PageState = 'loading' | 'fusing' | 'result' | 'error';

export default function WelcomePage() {
  const router = useRouter();
  const [data, setData] = useState<FusionData | null>(null);
  const [state, setState] = useState<PageState>('loading');
  const [result, setResult] = useState<FusionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingStep, setLoadingStep] = useState(1);
  const [expandedDir, setExpandedDir] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const fusionTriggered = useRef(false);

  // Load data from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('fusionData');
    if (!stored) {
      router.push('/onboarding/profession');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (!parsed.fragments || parsed.fragments.length < 3) {
        router.push('/onboarding/profession');
        return;
      }
      setData(parsed);
    } catch {
      router.push('/onboarding/profession');
    }
  }, [router]);

  // Auto-trigger fusion once data is loaded
  useEffect(() => {
    if (!data || fusionTriggered.current) return;
    fusionTriggered.current = true;
    triggerFusion(data);
  }, [data]);

  const triggerFusion = async (fusionData: FusionData) => {
    setState('fusing');
    setLoadingStep(1);

    const startTime = Date.now();
    let step = 1;
    const stepTimer = setInterval(() => {
      step = Math.min(step + 1, 8);
      setLoadingStep(step);
    }, 800);

    try {
      const response = await fetch(`${API_BASE}/api/fusions/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profession: fusionData.profession || '未知职业',
          profession_icon: fusionData.professionIcon,
          fragments: fusionData.fragments,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `请求失败 (${response.status})`);
      }

      const responseData = await response.json();

      const elapsed = Date.now() - startTime;
      if (elapsed < 2500) {
        await new Promise(resolve => setTimeout(resolve, 2500 - elapsed));
      }

      setLoadingStep(8);
      await new Promise(resolve => setTimeout(resolve, 500));

      if (responseData.success) {
        setResult(responseData.data);
        setState('result');
        // Show disclaimer on first fusion
        if (!localStorage.getItem('fusion_disclaimer_accepted')) {
          setShowDisclaimer(true);
        }
        // Save fragments to DB in background
        saveFragmentsToDb(fusionData);
      } else {
        throw new Error('AI返回异常');
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '融合失败，请重试');
      setState('error');
    } finally {
      clearInterval(stepTimer);
    }
  };

  // Save onboarding fragments to DB so they appear in the fragments page later
  const saveFragmentsToDb = async (fusionData: FusionData) => {
    try {
      for (const frag of fusionData.fragments) {
        await fetch(`${API_BASE}/api/fragments/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fragment_type: frag.type,
            content: frag.content,
          }),
        });
      }
    } catch {
      // Silent - fragments will still be in localStorage for this fusion
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const title = result.directions[0]?.title || '首次融合';
      await fetch(`${API_BASE}/api/fusions/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profession: data?.profession || '未知职业',
          title,
          fragment_ids: [],
          result: JSON.stringify(result),
        }),
      });
      setSaved(true);
    } catch {
      // Silent
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `🔮 拼图融合报告\n\n${result.golden_sentence}\n\n${result.directions.map((d, i) =>
      `${i + 1}. ${d.title}\n${d.why_this_works || d.description || ''}\n📌 下一步：${d.next_action}`
    ).join('\n\n')}\n\n💡 洞察：${result.insight}`;
    navigator.clipboard.writeText(text);
  };

  // ====== 免责声明弹窗 ======
  if (showDisclaimer) {
    return (
      <div className="min-h-screen bg-warm-bg">
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-warm-dark">📌 使用前请了解</h3>
            <div className="space-y-2 text-sm text-warm-dark/70 leading-relaxed">
              <p>拼图融合引擎的分析结果仅供灵感参考，不构成任何投资、商业或职业指导。</p>
              <p>AI 基于你提供的信息生成建议，可能存在偏差或遗漏。请结合自身实际情况，独立判断风险。</p>
              <p>执行任何建议前，请自行验证可行性，谨慎决策。</p>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('fusion_disclaimer_accepted', '1');
                setShowDisclaimer(false);
              }}
              className="w-full py-2.5 bg-warm-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 transition-colors"
            >
              我已了解，继续查看
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====== Loading / Initial ======
  if (state === 'loading' || !data) {
    return (
      <div className="min-h-screen bg-warm-bg flex flex-col items-center justify-center">
        <div className="text-4xl animate-pulse">🧩</div>
        <p className="text-sm text-warm-dark/40 mt-3">正在准备...</p>
      </div>
    );
  }

  // ====== Fusing ======
  if (state === 'fusing') {
    return (
      <div className="min-h-screen bg-warm-bg flex flex-col">
        {/* 进度条 - Step 3/3 */}
        <div className="w-full h-1 bg-warm-dark/10">
          <div className="h-full bg-warm-accent w-full transition-all duration-500" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center space-y-6 max-w-sm">
            <div className="text-6xl animate-bounce">🧩</div>
            <div>
              <h2 className="text-xl font-bold text-warm-dark mb-1">步骤 3/3 · 融合你的碎片</h2>
              <p className="text-sm text-warm-dark/50">{data.professionIcon} {data.profession} · {data.fragments.length} 个碎片</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-warm-dark">
                {loadingStep <= 1 && '🔍 正在识别你的能力类型...'}
                {loadingStep === 2 && '🧠 正在用8刃切割法分析...'}
                {loadingStep === 3 && '💡 正在寻找最有力的组合方向...'}
                {loadingStep === 4 && '🔗 正在验证碎片间的连接...'}
                {loadingStep >= 5 && loadingStep < 8 && '📋 正在生成你的行动方案...'}
                {loadingStep >= 8 && '✨ 马上就好...'}
              </h3>
              <div className="w-64 h-2.5 bg-warm-dark/10 rounded-full mx-auto overflow-hidden relative">
                <div className="h-full bg-warm-accent rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(10 + loadingStep * 11, 95)}%` }} />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-warm-dark/70">
                  {Math.min(10 + loadingStep * 11, 95)}%
                </span>
              </div>
              <p className="text-xs text-warm-dark/30">
                {loadingStep <= 2 ? '第一步：把碎片分类到8个维度' : loadingStep <= 4 ? '第二步：找到你的组合技' : loadingStep <= 6 ? '第三步：生成行动方案' : '最后一步：润色输出'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====== Error ======
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-warm-bg flex flex-col">
        <div className="w-full h-1 bg-warm-dark/10">
          <div className="h-full bg-warm-accent w-full transition-all duration-500" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="text-5xl">😅</div>
            <h2 className="text-xl font-bold text-warm-dark">融合出了点问题</h2>
            <p className="text-sm text-red-500">{errorMsg}</p>
            <div className="space-y-3 pt-2">
              <button
                onClick={() => triggerFusion(data)}
                className="w-full py-3 bg-warm-accent text-white rounded-2xl font-medium hover:bg-warm-accent/90 transition-colors"
              >
                再试一次
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 text-warm-dark/50 font-medium text-sm hover:text-warm-dark transition-colors"
              >
                先进主页看看 →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====== Result ======
  return (
    <div className="min-h-screen bg-warm-bg flex flex-col">
      {/* 进度条 - 完成 */}
      <div className="w-full h-1 bg-warm-dark/10">
        <div className="h-full bg-warm-accent w-full transition-all duration-500" />
      </div>

      {/* 顶部 */}
      <div className="px-6 py-4 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <h1 className="text-xl font-bold text-warm-dark">你的融合结果来了！</h1>
        <p className="text-xs text-warm-dark/40">{data.professionIcon} {data.profession} · {data.fragments.length} 个碎片融合</p>
      </div>

      {/* 结果内容 */}
      <div className="flex-1 px-6 pb-40 overflow-y-auto">
        <div className="max-w-lg mx-auto space-y-5">
          {/* 金句 */}
          {result && (
            <>
              <div className="p-5 rounded-2xl bg-gradient-to-br from-warm-accent/15 via-warm-accent/5 to-transparent border border-warm-accent/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-warm-accent/20 flex items-center justify-center text-lg">
                    {data.professionIcon}
                  </div>
                  <div>
                    <span className="text-xs text-warm-dark/50">{data.profession}</span>
                    {result.profile_tag && (
                      <span className="ml-2 px-2 py-0.5 bg-warm-accent/10 text-warm-accent text-xs rounded-full">
                        {result.profile_tag}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-base font-bold text-warm-dark leading-relaxed">
                  &ldquo; {result.golden_sentence} &rdquo;
                </p>
              </div>

              {/* 融合方向 */}
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-warm-dark/50">🎯 融合方向</h2>
                {result.directions.map((dir, i) => {
                  const diff = DIFFICULTY_CONFIG[dir.difficulty || 'medium'];
                  const isOpen = expandedDir === i;
                  return (
                    <div key={i} className="rounded-xl border border-warm-dark/10 bg-white/80 overflow-hidden">
                      <button
                        onClick={() => setExpandedDir(isOpen ? -1 : i)}
                        className="w-full text-left p-4 flex items-center justify-between hover:bg-warm-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{['🔥', '💡'][i] || '⚡'}</span>
                          <div>
                            <span className="font-bold text-warm-dark text-sm">{dir.title}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${diff.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                                {diff.label}
                              </span>
                              {dir.time_to_first_result && (
                                <span className="text-xs text-warm-dark/40">⏱ {dir.time_to_first_result}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`text-warm-dark/30 transition-transform text-sm ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 space-y-3 border-t border-warm-dark/5 pt-3">
                          {(dir.why_this_works || dir.description) && (
                            <div>
                              <h4 className="text-xs font-medium text-warm-dark/40 mb-1">为什么这个组合能打</h4>
                              <p className="text-sm text-warm-dark/80 leading-relaxed">
                                {dir.why_this_works || dir.description}
                              </p>
                            </div>
                          )}
                          {dir.market_hint && (
                            <div>
                              <h4 className="text-xs font-medium text-warm-dark/40 mb-1">市场参考</h4>
                              <p className="text-sm text-warm-dark/70">{dir.market_hint}</p>
                            </div>
                          )}
                          {dir.roadmap && dir.roadmap.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-warm-dark/40 mb-2">执行路线图</h4>
                              <div className="space-y-2">
                                {dir.roadmap.map((s, si) => (
                                  <div key={si} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${si === 0 ? 'bg-warm-accent' : 'bg-warm-accent/40'}`}>
                                        {s.step}
                                      </div>
                                      {si < (dir.roadmap?.length || 0) - 1 && (
                                        <div className="w-0.5 flex-1 bg-warm-dark/10 mt-1" />
                                      )}
                                    </div>
                                    <div className="pt-0">
                                      <span className="text-xs text-warm-dark/40">{s.time}</span>
                                      <p className="text-sm text-warm-dark/80">{s.action}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {dir.used_fragments.map((f, j) => (
                              <span key={j} className="px-2 py-0.5 bg-warm-accent/10 text-warm-accent/80 text-xs rounded-full">
                                🧩 {f}
                              </span>
                            ))}
                          </div>
                          <div className="p-3 rounded-lg bg-warm-accent/5 border border-warm-accent/10">
                            <span className="text-xs text-warm-accent font-medium">📌 本周第一步：</span>
                            <p className="text-sm text-warm-dark mt-0.5">{dir.next_action}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 整体洞察 */}
              <div className="p-4 rounded-2xl bg-warm-light/60 border border-warm-dark/5">
                <h3 className="text-sm font-medium text-warm-dark/50 mb-2">💡 整体洞察</h3>
                <p className="text-sm text-warm-dark/80 leading-relaxed">{result.insight}</p>
              </div>

              {/* 能力缺口 */}
              {result.skill_gaps && result.skill_gaps.length > 0 && (
                <div className="p-4 rounded-2xl bg-white/60 border border-warm-dark/10">
                  <h3 className="text-sm font-medium text-warm-dark/50 mb-2">🔧 你离更强还差这些拼图</h3>
                  <div className="space-y-1.5">
                    {result.skill_gaps.map((gap, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-warm-dark/70">
                        <span className="text-warm-dark/30">🧩</span>
                        <span>{gap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 碎片关联发现 */}
              {result.fragment_connections && result.fragment_connections.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/80 to-pink-50/60 border border-purple-200/40">
                  <h3 className="text-sm font-medium text-purple-600/70 mb-2">🔗 碎片关联发现</h3>
                  <div className="space-y-2">
                    {result.fragment_connections.map((conn, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/70 border border-purple-100/50">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-2 py-0.5 bg-warm-accent/10 text-warm-accent text-xs rounded-full">{conn.fragment_a}</span>
                          <span className="text-purple-400 text-xs">×</span>
                          <span className="px-2 py-0.5 bg-warm-accent/10 text-warm-accent text-xs rounded-full">{conn.fragment_b}</span>
                        </div>
                        <p className="text-sm text-warm-dark/70 leading-relaxed">💡 {conn.connection}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${saved ? 'bg-emerald-100 text-emerald-700' : 'bg-warm-accent text-white hover:bg-warm-accent/90'}`}
                >
                  {saved ? '✅ 已保存' : '💾 保存'}
                </button>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-warm-dark/10 text-warm-dark rounded-xl text-sm font-medium hover:bg-warm-dark/20 transition-colors"
                >
                  📋 复制
                </button>
              </div>

              {/* 免责声明 */}
              <div className="rounded-xl bg-warm-dark/3 border border-warm-dark/5 p-3 text-center">
                <p className="text-xs text-warm-dark/30 leading-relaxed">
                  ⚠️ 以上内容仅为 AI 生成的灵感建议，不构成投资或商业指导。
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 底部CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-warm-bg via-warm-bg/95 to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => {
              localStorage.setItem('firstFusionComplete', 'true');
              localStorage.removeItem('fusionData');
              router.push('/dashboard');
            }}
            className="w-full py-4 bg-warm-accent text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl hover:bg-warm-accent/90 transition-all duration-300 hover:-translate-y-0.5"
          >
            进入我的主页 →
          </button>
          <button
            onClick={() => router.push('/dashboard/fusion')}
            className="w-full py-3 text-warm-dark/50 font-medium text-sm hover:text-warm-dark transition-colors mt-1"
          >
            再融合一次 →
          </button>
        </div>
      </div>
    </div>
  );
}
