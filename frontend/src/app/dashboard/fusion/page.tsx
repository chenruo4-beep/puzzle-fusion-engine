'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
// html2canvas 已由 ShareCard 组件处理
import { Skeleton, SkeletonCard, SkeletonHeader } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { playClickSound, playPiecePlaceSound, playFusionSound } from '@/hooks/useSound';
import PuzzleFusionAnimation from '@/components/PuzzleFusionAnimation';
import { useDragPuzzle } from '@/hooks/useDragPuzzle';
import { useMobilePuzzle } from '@/hooks/useMobilePuzzle';
import ShareCard from '@/components/ShareCard';

interface FragmentItem {
  type: string;
  content: string;
}

interface Fragment {
  id: string;
  fragment_type: string;
  content: string;
  tags?: string;
  created_at?: string;
}

interface RoadmapStep {
  step: number;
  time: string;
  action: string;
  landmark?: string;
  landmark_icon?: string;
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
  id?: number;
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

const TYPE_COLORS: Record<string, string> = {
  '技能': '#4a7c9b',
  '能力': '#5a7a5a',
  '爱好': '#c49a6c',
  '习惯': '#c49a6c',
  '知识': '#b8a088',
  '经历': '#b8a088',
  '资源': '#7a9b4a',
  '性格': '#9b6c4a',
};

const API_BASE = 'http://localhost:8000';

export default function FusionPage() {
  const { toast } = useToast();
  const [isFusing, setIsFusing] = useState(false);
  const [result, setResult] = useState<FusionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDir, setExpandedDir] = useState<number>(0);
  const [saved, setSaved] = useState(false);
  const [fusionSuccess, setFusionSuccess] = useState(false);
  // exportingImage 状态已由 ShareCard 组件处理
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'useful' | 'not_useful'>('idle');
  const [showFeedbackReason, setShowFeedbackReason] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState('');
  const FEEDBACK_REASONS = [
    '方向不符合我的预期',
    '建议不够具体',
    '碎片匹配不准确',
    '结果太泛泛',
    '其他原因',
  ];

  // W5-4: 拼图融合可视化动画
  const [showFusionAnimation, setShowFusionAnimation] = useState(false);
  const [fusionAnimationFragments, setFusionAnimationFragments] = useState<Array<{id: string; content: string; type: string; color: string}>>([]);

  async function handleFeedback(vote: 'useful' | 'not_useful') {
    if (!result || feedbackState !== 'idle') return;
    if (!result.id) {
      toast('请先保存结果再提交反馈', 'warning');
      return;
    }
    if (vote === 'not_useful') {
      setShowFeedbackReason(true);
      return;
    }
    // useful: 直接提交
    try {
      const res = await fetch(`${API_BASE}/api/fusions/${result.id}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: vote, source: 'web' }),
      });
      if (res.ok) {
        setFeedbackState(vote);
        toast('感谢反馈！我们会持续优化', 'success');
      } else toast('反馈提交失败', 'error');
    } catch {
      toast('反馈提交失败', 'error');
    }
  }

  async function submitFeedbackWithReason(reason: string) {
    if (!result || !result.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/fusions/${result.id}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: 'not_useful', reason, source: 'web' }),
      });
      if (res.ok) {
        setFeedbackState('not_useful');
        setShowFeedbackReason(false);
        setFeedbackReason('');
        toast('反馈已记录，我们会据此优化', 'success');
      } else toast('反馈提交失败', 'error');
    } catch {
      toast('反馈提交失败', 'error');
    }
  }

  // 创建行进地图
  async function createJourneyMap(direction: FusionDirection, dirIndex: number, textOnly: boolean = false) {
    try {
      const steps = (direction.roadmap || []).map((step, i) => ({
        step_number: step.step,
        title: step.action,
        description: `${step.time}: ${step.action}`,
        landmark: step.landmark || ['起点广场', '技能工坊', '市场集市', '口碑塔', '收益城堡'][i] || `步骤${i+1}`,
        landmark_icon: step.landmark_icon || ['🏛️', '🔧', '🏪', '🗼', '🏰'][i] || '📍',
        time_estimate: step.time,
        action: step.action,
        position_x: [0, 1, 2, 2, 1][i] || 0,
        position_y: [2, 2, 2, 1, 1][i] || 0,
      }));

      const res = await fetch(`${API_BASE}/api/journey-maps/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fusion_id: result?.id,
          title: direction.title,
          subtitle: direction.why_this_works?.slice(0, 100) + '...',
          difficulty: direction.difficulty,
          time_to_result: direction.time_to_first_result,
          steps,
        }),
      });

      if (!res.ok) throw new Error('创建失败');
      const mapData = await res.json();

      if (textOnly) {
        // 文字版：跳转到地图页面
        window.open(`/dashboard/journey-map/${mapData.id}?text=1`, '_blank');
      } else {
        // 地图版：跳转到地图页面
        window.open(`/dashboard/journey-map/${mapData.id}`, '_blank');
      }

      toast('行进地图已生成！', 'success');
    } catch {
      toast('创建地图失败', 'error');
    }
  }

  // 碎片选择相关
  const [dbFragments, setDbFragments] = useState<Fragment[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingFragments, setLoadingFragments] = useState(true);
  const [, setShowFragmentPicker] = useState(true);
  const [profession, setProfession] = useState('');
  const [professionIcon, setProfessionIcon] = useState('🧩');
  const [goal, setGoal] = useState('');
  const [goalError, setGoalError] = useState('');
  const PLACEHOLDER_HINTS = ['例：我想找到一份远程工作...','例：我想开一家属于自己的小店...','例：我想利用现有技能做副业...','例：我想找到最适合我的发展方向...','例：我想把爱好变成事业...',];
  const [placeholderHint, setPlaceholderHint] = useState(PLACEHOLDER_HINTS[0]);
  // 筛选状态：按类型筛选显示（修复bug：原逻辑点击分类会全选碎片）
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const [recModal, setRecModal] = useState<{
    open: boolean;
    target: Fragment | null;
    recs: Record<string, unknown>[];
  }>({ open: false, target: null, recs: [] });
  const [copied, setCopied] = useState(false);

  // W3-5: 参考图引导 — 选择融合目标后显示半透明轮廓
  const [referenceTarget, setReferenceTarget] = useState<string | null>(null);
  const [showReferenceOverlay, setShowReferenceOverlay] = useState(false);

  // W3-6: 缺口识别提示
  const [gapAnalysis, setGapAnalysis] = useState<{
    overall_readiness: number;
    missing_types: string[];
    gaps: Array<{type: string; severity: string; current_count: number; needed_count: number; suggestion: string; action: string}>;
    summary: string;
    has_enough_fragments: boolean;
  } | null>(null);
  const [gapLoading, setGapLoading] = useState(false);

  const REFERENCE_GOALS = [
    '找到远程工作',
    '开一家小店',
    '做副业赚钱',
    '技能变现',
    '转行跳槽',
    '自由职业',
    '创业启动',
    '提升职场竞争力',
  ];

  // W5-3: 试探反馈 — 拖拽放置后先预览，用户确认才正式加入
  const [trialFragmentId, setTrialFragmentId] = useState<string | null>(null);
  const [trialBounce, setTrialBounce] = useState(false);
  const trialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX_GOAL_LENGTH = 100;
  const MIN_FRAGMENTS = 3;
  const MAX_FRAGMENTS = 15;

  function validateGoal(value: string): boolean {
    if (value.length > MAX_GOAL_LENGTH) {
      setGoalError(`目标不能超过${MAX_GOAL_LENGTH}字`);
      return false;
    }
    setGoalError('');
    return true;
  }

  // 目标输入空时循环播放placeholder提示
  useEffect(() => {
    if (goal.length > 0) { setPlaceholderHint(''); return; }
    setPlaceholderHint(PLACEHOLDER_HINTS[0]);
    let i = 0;
    const interval = setInterval(() => { i = (i + 1) % PLACEHOLDER_HINTS.length; setPlaceholderHint(PLACEHOLDER_HINTS[i]); }, 2500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal.length]);

  const onboardingHandled = useRef(false);

  // W3-6: 缺口识别 — 当选择目标+有碎片时自动分析
  useEffect(() => {
    async function analyzeGap() {
      if (!referenceTarget || selectedIds.size === 0) {
        setGapAnalysis(null);
        return;
      }
      setGapLoading(true);
      try {
        const selectedFragments = dbFragments
          .filter(f => selectedIds.has(f.id))
          .map(f => ({ type: f.fragment_type, content: f.content }));
        const res = await fetch(`${API_BASE}/api/gap/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fragments: selectedFragments,
            goal: referenceTarget,
            profession: profession || undefined,
            use_ai: false,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setGapAnalysis(data);
        }
      } catch {
        // silent fail
      } finally {
        setGapLoading(false);
      }
    }
    const timer = setTimeout(analyzeGap, 400); // debounce
    return () => clearTimeout(timer);
  }, [referenceTarget, selectedIds, dbFragments, profession]);

  // 加载碎片和职业信息
  useEffect(() => {
    async function load() {
      // 从 localStorage 读职业信息和碎片（来自 onboarding 流程）
      const stored = localStorage.getItem('fusionData');
      if (stored && !onboardingHandled.current) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.fragments && parsed.fragments.length >= 3) {
            // 来自 onboarding：直接触发融合
            if (parsed.profession) setProfession(parsed.profession);
            if (parsed.professionIcon) setProfessionIcon(parsed.professionIcon);
            setLoadingFragments(false);
            setShowFragmentPicker(false);
            localStorage.removeItem('fusionData');
            onboardingHandled.current = true;
            // 用 onboarding 碎片直接触发融合
            // 首次融合显示免责弹窗
            if (!localStorage.getItem('fusion_disclaimer_accepted')) {
              setShowDisclaimer(true);
            }
            await triggerOnboardingFusion(parsed.fragments, parsed.profession || '', parsed.professionIcon || '🧩');
            return;
          }
        } catch { /* malformed data */ }
        localStorage.removeItem('fusionData');
      }

      // 正常模式：从 API 拉碎片
      try {
        const res = await fetch(`${API_BASE}/api/fragments/`);
        const data = await res.json();
        const fragments: Fragment[] = Array.isArray(data) ? data : [];
        setDbFragments(fragments);

        // 新行为：默认全部不选，强制用户主动选择
        setSelectedIds(new Set());
      } catch {
        // 如果 API 不可用，静默
      } finally {
        setLoadingFragments(false);
      }

      // 从 localStorage 读职业信息（无碎片时只设职业）
      try {
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.profession) setProfession(parsed.profession);
          if (parsed.professionIcon) setProfessionIcon(parsed.professionIcon);
        }
      } catch { /* no data */ }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // function toggleFragment(id: string) {
  //   setSelectedIds(prev => {
  //     const next = new Set(prev);
  //     if (next.has(id)) next.delete(id);
  //     else next.add(id);
  //     return next;
  //   });
  // }

  const isMaxReached = selectedIds.size >= MAX_FRAGMENTS;


  function toggleFragmentWithLimit(id: string) {
    if (selectedIds.has(id)) {
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      playPiecePlaceSound();
    } else if (isMaxReached) {
      return;
    } else {
      setSelectedIds(prev => new Set(prev).add(id));
      playPiecePlaceSound();
    }
  }

  // W5-3: 试探反馈 - 清空旧 trial
  function clearTrial() {
    if (trialTimerRef.current) { clearTimeout(trialTimerRef.current); trialTimerRef.current = null; }
    setTrialFragmentId(null);
    setTrialBounce(false);
  }

  // W5-3: 确认试探 → 正式加入选中
  function confirmTrial() {
    if (!trialFragmentId) return;
    const fid = trialFragmentId;
    clearTrial();
    if (!isMaxReached && !selectedIds.has(fid)) {
      setSelectedIds(prev => new Set(prev).add(fid));
      playClickSound();
    }
  }

  // W5-3: 委婉弹开试探
  function dismissTrial() {
    if (!trialFragmentId) return;
    if (trialTimerRef.current) { clearTimeout(trialTimerRef.current); trialTimerRef.current = null; }
    setTrialBounce(true);
    setTimeout(() => { setTrialFragmentId(null); setTrialBounce(false); }, 500);
  }

  // W5-3: 启动试探（拖拽/移动端放置后调用）
  function startTrial(fragId: string) {
    clearTrial();
    if (selectedIds.has(fragId)) return; // 已选中不试探
    setTrialFragmentId(fragId);
    playPiecePlaceSound();

    // W5-4: 记录试探次数
    try {
      const prev = parseInt(localStorage.getItem('puzzle_trial_count') || '0', 10);
      localStorage.setItem('puzzle_trial_count', String(prev + 1));
    } catch { /* ignore */ }

    trialTimerRef.current = setTimeout(() => {
      setTrialFragmentId(prev => {
        if (prev === fragId) {
          setTrialBounce(true);
          setTimeout(() => { setTrialFragmentId(null); setTrialBounce(false); }, 500);
        }
        return prev;
      });
    }, 3000);
  }

  // W3-1: 拖拽拼合（桌面端）→ 进入试探预览
  const handleDragDrop = useCallback((fragId: string) => {
    startTrial(fragId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { drag, isOverDrop, dropzoneRef, onPointerDown: onDragPointerDown } = useDragPuzzle(handleDragDrop);

  // W3-2: 移动端拼合操作 → 进入试探预览
  const handleMobileSnap = useCallback((fragId: string) => {
    startTrial(fragId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const {
    snap: mobileSnap,
    dropBounce,
    isMobile,
    onPointerDown: onMobileDown,
    onPointerMove: onMobileMove,
    onPointerUp: onMobileUp,
    triggerSnap,
    cancelSelection,
  } = useMobilePuzzle(handleMobileSnap);

  // W5-3: 监听拖拽弹开事件（碎片拖到投放区外）
  useEffect(() => {
    const onTrialBounce = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.fragmentId && trialFragmentId === detail.fragmentId) {
        dismissTrial();
      }
    };
    window.addEventListener('puzzle:trial-bounce', onTrialBounce);
    return () => window.removeEventListener('puzzle:trial-bounce', onTrialBounce);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialFragmentId]);

  // 修复bug：分类按钮改为筛选显示，不再全选碎片
  function toggleFilter(type: string) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function clearAllFilters() {
    setActiveFilters(new Set());
  }

  // 来自 onboarding 的自动融合（直接用 localStorage 中的碎片）
  const triggerOnboardingFusion = async (frags: FragmentItem[], prof: string, icon: string) => {
    clearTrial(); // W5-3: 融合开始时清除试探

    // W5-4: onboarding 也使用拼图融合可视化
    const onboardingAnimFrags = frags.map((f, i) => ({
      id: `onboarding-${i}`,
      content: f.content.slice(0, 20),
      type: f.type,
      color: TYPE_COLORS[f.type] || '#b8a088',
    }));
    setFusionAnimationFragments(onboardingAnimFrags);
    setShowFusionAnimation(true);
    playFusionSound();

    await new Promise(r => setTimeout(r, 2500));
    setShowFusionAnimation(false);

    setIsFusing(true);
    setError(null);
    setResult(null);
    setSaved(false);
    setExpandedDir(0);
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
          profession: prof || '未知职业',
          profession_icon: icon,
          fragments: frags,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `请求失败 (${response.status})`);
      }

      const data = await response.json();

      const elapsed = Date.now() - startTime;
      if (elapsed < 2500) {
        await new Promise(resolve => setTimeout(resolve, 2500 - elapsed));
      }

      setLoadingStep(8);
      await new Promise(resolve => setTimeout(resolve, 500));

      if (data.success) {
        setResult(data.data);
        playClickSound();
        setFusionSuccess(true);
        setTimeout(() => setFusionSuccess(false), 3000);
        if (!localStorage.getItem('fusion_disclaimer_accepted')) {
          setShowDisclaimer(true);
        }
      } else {
        throw new Error('AI返回异常');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '融合失败，请重试');
    } finally {
      clearInterval(stepTimer);
      setIsFusing(false);
    }
  };

  const handleFusion = async () => {
    clearTrial(); // W5-3: 融合开始时清除试探
    if (selectedIds.size === 0) return;
    if (goalError) return; // 目标验证失败时不提交

    // #26: 首次融合显示免责声明弹窗
    if (!localStorage.getItem('fusion_disclaimer_accepted')) {
      setShowDisclaimer(true);
      return;
    }

    // W2-2: 碎片飞入动画 — 先捕获DOM位置
    const fragmentEls = document.querySelectorAll('[data-fragment-id]');
    const flyData: Array<{id: string; x: number; y: number; w: number; h: number; content: string; type: string; color: string}> = [];
    fragmentEls.forEach(el => {
      const fid = el.getAttribute('data-fragment-id');
      if (fid && selectedIds.has(fid)) {
        const rect = el.getBoundingClientRect();
        const frag = dbFragments.find(f => f.id === fid);
        if (frag) {
          flyData.push({
            id: fid,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            w: rect.width,
            h: rect.height,
            content: frag.content.slice(0, 20),
            type: frag.fragment_type,
            color: TYPE_COLORS[frag.fragment_type] || '#b8a088',
          });
        }
      }
    });

    if (flyData.length > 0) {
      // W5-4: 启动拼图融合可视化动画
      const animFrags = flyData.map(f => ({
        id: f.id,
        content: f.content,
        type: f.type,
        color: f.color,
      }));
      setFusionAnimationFragments(animFrags);
      setShowFusionAnimation(true);
      playFusionSound();

      // 动画全部完成后进入加载状态
      setTimeout(() => {
        setShowFusionAnimation(false);
        proceedWithFusion();
      }, 2600);
    } else {
      proceedWithFusion();
    }

    function proceedWithFusion() {
      // 构建选中的碎片
      const selectedFragments: FragmentItem[] = dbFragments
        .filter(f => selectedIds.has(f.id))
        .map(f => ({ type: f.fragment_type, content: f.content }));

      setIsFusing(true);
      setError(null);
      setResult(null);
      setSaved(false);
      setExpandedDir(0);
      setShowFragmentPicker(false);
      setLoadingStep(1);

      const startTime = Date.now();
      let step = 1;
      const stepTimer = setInterval(() => {
        step = Math.min(step + 1, 8);
        setLoadingStep(step);
      }, 800);

      (async () => {
        try {
          const response = await fetch(`${API_BASE}/api/fusions/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profession: profession || '未知职业',
              profession_icon: professionIcon,
              fragments: selectedFragments,
              goal: goal || undefined,
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `请求失败 (${response.status})`);
          }

          const data = await response.json();

          const elapsed = Date.now() - startTime;
          if (elapsed < 2500) {
            await new Promise(resolve => setTimeout(resolve, 2500 - elapsed));
          }

          setLoadingStep(8);
          await new Promise(resolve => setTimeout(resolve, 500));

          if (data.success) {
            setResult(data.data);
            setFusionSuccess(true);
            setTimeout(() => setFusionSuccess(false), 3000);
          } else {
            throw new Error('AI返回异常');
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : '融合失败，请重试');
        } finally {
          clearInterval(stepTimer);
          setIsFusing(false);
        }
      })();
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const title = result.directions[0]?.title || '融合结果';
      const response = await fetch(`${API_BASE}/api/fusions/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profession: profession || '未知职业',
          title,
          fragment_ids: Array.from(selectedIds),
          result: JSON.stringify(result),
        }),
      });
      const data = await response.json();
      if (response.ok && data.id) {
        setResult(r => r ? { ...r, id: data.id } : r);
        setSaved(true);
      }
    } catch (e) {
      console.error('保存失败:', e);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = `🔮 拼图融合报告\n\n${result.golden_sentence}\n\n${result.directions.map((d, i) =>
      `${i + 1}. ${d.title}\n${d.why_this_works || d.description || ''}\n📌 下一步：${d.next_action}`
    ).join('\n\n')}\n\n💡 洞察：${result.insight}`;
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // handleExportImage 已由 ShareCard 组件替代

  function handleReset() {
    setResult(null);
    setError(null);
    setSaved(false);
    setShowFragmentPicker(true);
  }

  useKeyboardShortcut({ onCtrlEnter: handleFusion, onEsc: () => setShowFragmentPicker(false) });

  if (showDisclaimer) {
    return (
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
    );
  }

  // ====== 融合结果页 ======
  if (result) {
    return (
      <div id="fusion-result-card" className={`space-y-6 relative ${fusionSuccess ? 'fusion-success-glow' : ''}`}>
        {/* +1连接 漂浮动画 */}
        {fusionSuccess && (
          <>
            {/* 光环扩散 */}
            <div className="connection-float" style={{ top: '30%', left: '50%' }}>
              <div className="ring-ping-effect" style={{ width: 60, height: 60 }} />
            </div>
            {/* 文字飘出 */}
            <div className="connection-float" style={{ top: '30%', left: '50%' }}>
              <span
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-extrabold"
                style={{
                  background: 'linear-gradient(135deg, #d97746, #e8a860)',
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(217, 119, 70, 0.35)',
                }}
              >
                +1 连接
              </span>
            </div>
          </>
        )}
        {/* 顶部金句区 */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-warm-accent/15 via-warm-accent/5 to-transparent border border-warm-accent/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-warm-accent/20 flex items-center justify-center text-xl">
              {professionIcon}
            </div>
            <div>
              <span className="text-sm text-warm-dark/50">{profession}</span>
              {result.profile_tag && (
                <span className="ml-2 px-2 py-0.5 bg-warm-accent/10 text-warm-accent text-xs rounded-full">
                  {result.profile_tag}
                </span>
              )}
              {result.confidence && (
                <span className="ml-2 text-xs text-warm-dark/40">
                  置信度 {result.confidence}%
                </span>
              )}
            </div>
          </div>
          <p className="text-lg font-bold text-warm-dark leading-relaxed">
            &ldquo; {result.golden_sentence} &rdquo;
          </p>
        </div>

        {/* 融合方向 */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-warm-dark/50 tracking-wide">🎯 融合方向</h2>
          {result.directions.map((dir, i) => {
            const diff = DIFFICULTY_CONFIG[dir.difficulty || 'medium'];
            const isOpen = expandedDir === i;
            return (
              <div key={i} className="rounded-xl border border-warm-dark/10 bg-white/80 overflow-hidden transition-all">
                <button
                  onClick={() => setExpandedDir(isOpen ? -1 : i)}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-warm-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{['🔥', '💡'][i] || '⚡'}</span>
                    <div>
                      <span className="font-bold text-warm-dark">{dir.title}</span>
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
                  <span className={`text-warm-dark/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 space-y-4 border-t border-warm-dark/5 pt-4">
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
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-xs font-medium text-warm-dark/40">执行路线图</h4>
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full border border-green-200">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />今日可做
                          </span>
                        </div>
                        <div className="space-y-3">
                          {dir.roadmap.map((s, si) => (
                            <div key={si} className={`flex gap-3${si === 0 ? ' p-3 -mx-3 rounded-xl bg-gradient-to-r from-green-50/80 via-green-50/20 to-transparent border-l-[3px] border-green-400 shadow-sm' : ''}`}>
                              <div className="flex flex-col items-center">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white relative ${si === 0 ? 'bg-green-500 shadow-md shadow-green-200' : si === 1 ? 'bg-warm-accent/60' : 'bg-warm-accent/30'}`}>
                                  {s.step}
                                  {si === 0 && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" title="今日可做" />
                                  )}
                                </div>
                                {si < (dir.roadmap?.length || 0) - 1 && (
                                  <div className="w-0.5 flex-1 bg-warm-dark/10 mt-1" />
                                )}
                              </div>
                              <div className="pt-0.5">
                                <span className={`text-xs ${si === 0 ? 'text-green-600 font-medium' : 'text-warm-dark/40'}`}>{si === 0 ? `✅ ${s.time}` : s.time}</span>
                                <p className={`text-sm ${si === 0 ? 'text-warm-dark font-medium' : 'text-warm-dark/80'}`}>{s.action}</p>
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
                    <div className="p-4 rounded-xl bg-gradient-to-r from-warm-accent/15 to-warm-accent/5 border-2 border-warm-accent/20 shadow-sm">
                      <span className="text-xs text-warm-accent font-bold">📌 今天就能开始：</span>
                      <p className="text-sm font-medium text-warm-dark mt-1">{dir.next_action}</p>
                    </div>

                    {/* 创建行进地图按钮 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => createJourneyMap(dir, i)}
                        className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        🗺️ 生成行进地图
                      </button>
                      <button
                        onClick={() => createJourneyMap(dir, i, true)}
                        className="py-2.5 px-4 bg-warm-border hover:bg-warm-border/80 text-warm-dark rounded-xl text-sm font-medium transition-colors"
                        title="极简文字版"
                      >
                        📝 文字版
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 整体洞察 */}
        <div className="p-5 rounded-2xl bg-warm-light/60 border border-warm-dark/5">
          <h3 className="text-sm font-medium text-warm-dark/50 mb-2">💡 整体洞察</h3>
          <p className="text-sm text-warm-dark/80 leading-relaxed">{result.insight}</p>
        </div>

        {/* 能力缺口 */}
        {result.skill_gaps && result.skill_gaps.length > 0 && (
          <div className="p-5 rounded-2xl bg-white/60 border border-warm-dark/10">
            <h3 className="text-sm font-medium text-warm-dark/50 mb-3">🔧 你离更强还差这些拼图</h3>
            <div className="space-y-2">
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
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 to-pink-50/60 border border-purple-200/40">
            <h3 className="text-sm font-medium text-purple-600/70 mb-3">🔗 碎片关联发现</h3>
            <div className="space-y-3">
              {result.fragment_connections.map((conn, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/70 border border-purple-100/50">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
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

        {/* 分享卡片 */}
        <div className="border-t border-warm-dark/10 pt-6">
          <h3 className="text-sm font-medium text-warm-dark/50 mb-4 text-center">📸 生成分享卡片</h3>
          <ShareCard
            goldenSentence={result.golden_sentence}
            profession={profession}
            confidence={result.confidence}
            directions={result.directions}
            insight={result.insight}
          />
        </div>

        {/* 操作栏 */}
        <div className="flex items-center justify-center gap-3 pt-2 pb-4">
          <button
            onClick={handleSave}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${saved ? 'bg-emerald-100 text-emerald-700' : 'bg-warm-accent text-white hover:bg-warm-accent/90'}`}
          >
            {saved ? '✅ 已保存' : '💾 保存结果'}
          </button>
          <button
            onClick={handleCopy}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              copied
                ? 'bg-emerald-100 text-emerald-700 scale-105'
                : 'bg-warm-dark/10 text-warm-dark hover:bg-warm-dark/20'
            }`}
          >
            {copied ? '✅ 已复制' : '📋 复制报告'}
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-2 bg-warm-dark/5 text-warm-dark/60 rounded-xl text-sm font-medium hover:bg-warm-dark/10 transition-colors"
          >
            🔄 重新融合
          </button>
        </div>

        {/* 反馈 + 免责声明 */}
        <div className="space-y-3 pb-4">
          {/* 有用/无用反馈 */}
          <div className="flex items-center justify-center gap-4">
            <span className="text-xs text-warm-dark/40">这个融合结果对你有用吗？</span>
            <button
              onClick={() => handleFeedback('useful')}
              disabled={feedbackState !== 'idle'}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                feedbackState === 'useful'
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                  : feedbackState === 'not_useful'
                  ? 'border-warm-dark/10 text-warm-dark/20'
                  : 'text-warm-dark/50 border-transparent hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
              }`}
            >
              👍 有用
            </button>
            <button
              onClick={() => handleFeedback('not_useful')}
              disabled={feedbackState !== 'idle'}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                feedbackState === 'not_useful'
                  ? 'bg-rose-100 border-rose-300 text-rose-700'
                  : feedbackState === 'useful'
                  ? 'border-warm-dark/10 text-warm-dark/20'
                  : 'text-warm-dark/50 border-transparent hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
              }`}
            >
              👎 没用
            </button>
          </div>

          {/* 反馈原因弹窗 */}
          {showFeedbackReason && (
            <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-warm-dark">💬 帮助我们改进</h3>
                <p className="text-sm text-warm-dark/60">这个结果为什么没有帮助到你？</p>
                <div className="space-y-2">
                  {FEEDBACK_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => submitFeedbackWithReason(reason)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                        feedbackReason === reason
                          ? 'bg-warm-accent/10 border-warm-accent/30 text-warm-dark'
                          : 'bg-warm-light/40 border-warm-dark/10 text-warm-dark/70 hover:border-warm-accent/30'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t border-warm-dark/10">
                  <textarea
                    value={feedbackReason}
                    onChange={(e) => setFeedbackReason(e.target.value)}
                    placeholder="其他原因（选填）..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-warm-light/40 border border-warm-dark/10 text-sm text-warm-dark placeholder:text-warm-dark/30 focus:outline-none focus:border-warm-accent/30 resize-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { setShowFeedbackReason(false); setFeedbackReason(''); }}
                      className="flex-1 py-2 rounded-xl bg-warm-dark/5 text-warm-dark/50 text-sm hover:bg-warm-dark/10 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => {
                        if (feedbackReason.trim()) submitFeedbackWithReason(feedbackReason.trim());
                        else toast('请选择或填写原因', 'warning');
                      }}
                      className="flex-1 py-2 rounded-xl bg-warm-accent text-white text-sm hover:bg-warm-accent/90 transition-colors"
                    >
                      提交反馈
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 免责声明 — 法律风险防护 */}
          <div className="rounded-xl bg-warm-dark/3 border border-warm-dark/5 p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs">⚠️</span>
              <span className="text-xs font-bold text-warm-dark/40">法律免责声明</span>
            </div>
            <p className="text-[11px] text-warm-dark/30 leading-relaxed">
              本工具基于人工智能生成内容，所有分析结果、建议和方向仅供灵感参考，
              <strong className="text-warm-dark/40">不构成任何投资、理财、职业、法律或商业决策建议</strong>。
              AI 输出可能存在偏差、遗漏或过时信息，不保证准确性、完整性或适用性。
            </p>
            <p className="text-[11px] text-warm-dark/30 leading-relaxed">
              用户应结合自身实际情况、专业咨询和独立判断做出决策。
              因使用本工具内容而产生的任何直接或间接损失，本平台不承担法律责任。
              继续使用即表示您已阅读并理解上述声明。
            </p>
            <p className="text-[10px] text-warm-dark/20 text-center pt-1">
              © 拼图融合引擎 · AI 生成内容仅供参考
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ====== 融合中 ======
  if (isFusing) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">融合引擎</h1>
        <div className="mt-4 p-12 rounded-2xl bg-white/60 border border-warm-dark/10 text-center">
          <div className="text-5xl mb-4 animate-bounce">🧩</div>
          <h3 className="text-xl font-bold text-warm-dark mb-4">
            {loadingStep <= 1 && '🔍 正在识别你的能力类型...'}
            {loadingStep === 2 && '🧠 正在用8刃切割法分析...'}
            {loadingStep === 3 && '💡 正在寻找最有力的组合方向...'}
            {loadingStep === 4 && '🔗 正在验证碎片间的连接...'}
            {loadingStep >= 5 && loadingStep < 8 && '📋 正在生成你的行动方案...'}
            {loadingStep >= 8 && '✨ 马上就好...'}
          </h3>
          {/* 拼图片段进度条 — 替代简单百分比条 */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {Array.from({ length: 8 }).map((_, i) => {
              const isActive = i < loadingStep;
              const isCurrent = i === loadingStep;
              const Emojis = ['🔍', '🧠', '💡', '🔗', '📋', '📋', '📋', '✨'];
              return (
                <div key={i} className={`fusion-progress-segment ${isActive ? 'active' : isCurrent ? 'current' : ''}`}
                  style={{ 
                    background: !isActive && !isCurrent ? 'rgba(60,58,55,0.05)' : undefined,
                    color: !isActive && !isCurrent ? 'rgba(60,58,55,0.15)' : undefined
                  }}
                >
                  {isActive ? Emojis[i] || '🧩' : i + 1}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-warm-dark/30 mt-4">
            {loadingStep <= 2 ? '第一步：把碎片分类到8个维度' : loadingStep <= 4 ? '第二步：找到你的组合技' : loadingStep <= 6 ? '第三步：生成行动方案' : '最后一步：润色输出'}
          </p>
        </div>
      </div>
    );
  }

  // ====== 错误状态 ======
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">融合引擎</h1>
        <div className="mt-4 p-8 rounded-2xl bg-white/60 border border-warm-dark/10 text-center">
          <div className="text-4xl mb-4">😅</div>
          <h3 className="text-xl font-bold text-warm-dark mb-2">出了点小问题</h3>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            onClick={handleFusion}
            className="px-6 py-2 bg-warm-accent text-white rounded-xl text-sm font-medium hover:bg-warm-accent/90 transition-colors"
          >
            再试一次
          </button>
        </div>
      </div>
    );
  }

  // ====== 碎片选择页（融合前） ======
  if (loadingFragments) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-white/60 border border-warm-dark/10">
            <div className="space-y-2">
              <Skeleton height="h-5" width="w-28" rounded="rounded-full" />
              <Skeleton height="h-3" width="w-48" />
            </div>
          </div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // 无碎片
  if (dbFragments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">融合引擎</h1>
        <EmptyState
          icon="🧩"
          title="还差几块拼图片"
          description="融合需要至少3块拼图片。别急，先去收集你的第一块。"
          action={{ label: '→ 去收集拼图片', onClick: () => window.location.href = '/dashboard/fragments' }}
        />
      </div>
    );
  }

  // 按类型分组碎片
  const grouped: Record<string, Fragment[]> = {};
  dbFragments.forEach(f => {
    const t = f.fragment_type || '其他';
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(f);
  });

  return (
    <div className="space-y-6">
      {/* W5-4: 拼图融合可视化动画 */}
      {showFusionAnimation && (
        <PuzzleFusionAnimation
          fragments={fusionAnimationFragments}
          onComplete={() => setShowFusionAnimation(false)}
          duration={2500}
        />
      )}
      <div>
        <h1 className="text-2xl font-bold text-warm-dark">融合引擎</h1>
        <p className="text-sm text-warm-dark/50 mt-1">
          选择想要融合的碎片，让 AI 发现你的隐藏组合技
        </p>
      </div>

      {/* 职业信息 */}
      {profession && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-warm-accent/5 border border-warm-accent/10">
          <span className="text-lg">{professionIcon}</span>
          <span className="text-sm text-warm-dark font-medium">{profession}</span>
        </div>
      )}

      {/* 目标输入（可选） */}
      <div className="px-4 py-3 rounded-xl bg-white/40 border border-warm-dark/5">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-warm-dark/40">
            🎯 你有没有憧憬的工作或想完成的事业？（选填）
          </label>
          <span className={`text-xs ${goal.length > MAX_GOAL_LENGTH ? 'text-rose-500 font-medium' : 'text-warm-dark/30'}`}>
            {goal.length}/{MAX_GOAL_LENGTH}
          </span>
        </div>
        <input
          type="text"
          value={goal}
          onChange={e => { setGoal(e.target.value); validateGoal(e.target.value); }}
          placeholder={placeholderHint}
          className={`w-full px-3 py-2 rounded-lg bg-white/60 border text-sm text-warm-dark placeholder:text-warm-dark/30 focus:outline-none transition-colors ${goalError ? 'border-rose-300 focus:border-rose-400' : 'border-warm-dark/10 focus:border-warm-accent/50'}`}
        />
        {goalError && <p className="text-xs text-rose-500 mt-1">{goalError}</p>}
      </div>

      {/* W3-5: 参考图目标选择器 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-warm-dark/40">🖼️ 选择参考图目标（选填）</label>
          {referenceTarget && (
            <button
              onClick={() => { setReferenceTarget(null); setShowReferenceOverlay(false); }}
              className="text-xs text-warm-accent hover:underline"
            >
              清除
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {REFERENCE_GOALS.map(g => (
            <button
              key={g}
              onClick={() => {
                if (referenceTarget === g) {
                  setReferenceTarget(null);
                  setShowReferenceOverlay(false);
                } else {
                  setReferenceTarget(g);
                  setShowReferenceOverlay(true);
                }
              }}
              className={`reference-goal-chip ${referenceTarget === g ? 'active' : ''}`}
            >
              {referenceTarget === g && <span className="text-warm-accent">✓</span>}
              {g}
            </button>
          ))}
        </div>
        {referenceTarget && (
          <p className="text-xs text-warm-dark/30">
            拼图板将显示「{referenceTarget}」的参考轮廓，帮助你更有针对性地选择碎片
          </p>
        )}
      </div>

      {/* W3-6: 缺口识别提示面板 */}
      {referenceTarget && gapAnalysis && !gapLoading && (
        <div className={`p-4 rounded-2xl border space-y-3 transition-all ${
          gapAnalysis.has_enough_fragments
            ? 'bg-emerald-50/60 border-emerald-200/60'
            : 'bg-amber-50/60 border-amber-200/60'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{gapAnalysis.has_enough_fragments ? '✅' : '🔍'}</span>
              <span className="text-sm font-bold text-warm-dark">
                缺口分析 — {referenceTarget}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-warm-dark/40">准备度</span>
              <div className="w-20 h-2 rounded-full bg-warm-dark/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    gapAnalysis.overall_readiness >= 80
                      ? 'bg-emerald-400'
                      : gapAnalysis.overall_readiness >= 50
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                  style={{ width: `${gapAnalysis.overall_readiness}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${
                gapAnalysis.overall_readiness >= 80
                  ? 'text-emerald-600'
                  : gapAnalysis.overall_readiness >= 50
                  ? 'text-amber-600'
                  : 'text-rose-500'
              }`}>
                {gapAnalysis.overall_readiness}%
              </span>
            </div>
          </div>
          <p className="text-xs text-warm-dark/60 leading-relaxed">{gapAnalysis.summary}</p>
          {gapAnalysis.gaps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-warm-dark/50">
                还缺 {gapAnalysis.gaps.length} 类碎片：
              </p>
              <div className="space-y-2">
                {gapAnalysis.gaps.map((g, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      g.severity === 'high'
                        ? 'bg-rose-50/80 border-rose-200/60'
                        : g.severity === 'medium'
                        ? 'bg-amber-50/80 border-amber-200/60'
                        : 'bg-warm-light/60 border-warm-dark/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-warm-dark">
                        🧩 {g.type}
                        <span className="font-normal text-warm-dark/40 ml-1">
                          ({g.current_count}/{g.needed_count})
                        </span>
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        g.severity === 'high'
                          ? 'bg-rose-100 text-rose-600'
                          : g.severity === 'medium'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-warm-dark/5 text-warm-dark/40'
                      }`}>
                        {g.severity === 'high' ? '严重缺口' : g.severity === 'medium' ? '中等缺口' : '轻微缺口'}
                      </span>
                    </div>
                    <p className="text-warm-dark/70">💡 {g.suggestion}</p>
                    <p className="text-warm-accent font-medium">📌 {g.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {gapAnalysis.gaps.length === 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/60 text-xs text-emerald-700">
              🎉 碎片类型覆盖完善！可以直接开始融合。
            </div>
          )}
        </div>
      )}
      {gapLoading && referenceTarget && (
        <div className="p-4 rounded-2xl bg-warm-light/40 border border-warm-dark/10 text-center">
          <span className="inline-block animate-spin text-lg mr-2">🔄</span>
          <span className="text-xs text-warm-dark/50">正在分析碎片缺口...</span>
        </div>
      )}

      {/* W3-5: 参考图覆盖层 */}
      {showReferenceOverlay && referenceTarget && (
        <div className="relative puzzle-board p-6 min-h-[200px] overflow-hidden">
          {/* 木纹纹理背景 */}
          <div className="puzzle-board-texture" />
          {/* 参考图目标区域 */}
          <div className="reference-target-zone">
            {/* 四角装饰 */}
            <div className="reference-zone-edge top-left" />
            <div className="reference-zone-edge top-right" />
            <div className="reference-zone-edge bottom-left" />
            <div className="reference-zone-edge bottom-right" />
            {/* 目标文字 */}
            <div className="reference-goal-text">
              {referenceTarget}
            </div>
            <div className="reference-goal-subtitle">
              选择匹配的碎片放入此区域
            </div>
            {/* 缺口指示器（装饰性） */}
            <div className="reference-gap" style={{ left: '15%', top: '20%' }} />
            <div className="reference-gap" style={{ right: '20%', bottom: '25%' }} />
            <div className="reference-gap" style={{ left: '50%', top: '70%' }} />
          </div>
          {/* 覆盖度标签 */}
          <div className="absolute bottom-3 right-3">
            <span className="reference-coverage-badge">
              🎯 目标: {referenceTarget}
            </span>
          </div>
        </div>
      )}

      {/* 步骤引导（首次用户未选中任何碎片时展示） */}
      {selectedIds.size === 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-warm-accent/5 via-warm-accent/3 to-transparent border border-warm-accent/15 space-y-3">
          <h3 className="text-sm font-bold text-warm-dark">🎯 三步完成融合</h3>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-warm-accent text-white text-xs font-bold flex items-center justify-center mt-0.5">1</span>
              <div>
                <p className="text-sm font-medium text-warm-dark">设定目标（选填）</p>
                <p className="text-xs text-warm-dark/50">告诉引擎你憧憬的方向，让 AI 更有针对性地分析</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-warm-accent text-white text-xs font-bold flex items-center justify-center mt-0.5">2</span>
              <div>
                <p className="text-sm font-medium text-warm-dark">选择拼图片</p>
                <p className="text-xs text-warm-dark/50">勾选至少 <strong>3</strong> 个拼图片，或点击类型标签一键批量选择</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-warm-accent/30 text-warm-accent text-xs font-bold flex items-center justify-center mt-0.5">3</span>
              <div>
                <p className="text-sm font-medium text-warm-dark">开始融合</p>
                <p className="text-xs text-warm-dark/50">点击底部按钮，AI 会分析你的拼图片，生成融合方向</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-warm-dark/50">
            已选 <span className="font-bold text-warm-accent">{selectedIds.size}</span> 个
            <span className="text-warm-dark/30"> / {dbFragments.length} 个碎片</span>
            {isMaxReached && (
              <span className="ml-2 text-xs text-amber-600 font-medium">上限{MAX_FRAGMENTS}个</span>
            )}
            {/* W5-3: 试探预览指示器 */}
            {trialFragmentId && !trialBounce && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 border border-amber-200 text-amber-600 animate-pulse">
                👁️ +1 预览中
              </span>
            )}
            {trialFragmentId && trialBounce && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rose-50 border border-rose-200 text-rose-500 trial-bounce-text">
                💨 弹开了
              </span>
            )}
          </span>
          <button
            onClick={() => setSelectedIds(prev => prev.size === dbFragments.length ? new Set() : new Set(dbFragments.map(f => f.id)))}
            className="text-xs text-warm-accent hover:underline"
          >
            {selectedIds.size >= dbFragments.length ? '取消全选' : '全选'}
          </button>
        </div>
        {/* 按类型筛选显示（修复：不再全选碎片） */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-warm-dark/30 mr-1">筛选：</span>
          {Object.entries(grouped).map(([type, frags]) => {
            const isActive = activeFilters.has(type);
            const allCount = (frags || []).length;
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  isActive
                    ? 'bg-warm-accent/15 border-warm-accent/40 text-warm-accent font-medium'
                    : 'bg-white/50 border-warm-dark/10 text-warm-dark/50 hover:border-warm-dark/25'
                }`}
              >
                {type}
                <span className="ml-1">{allCount}</span>
              </button>
            );
          })}
          {activeFilters.size > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-warm-dark/30 hover:text-warm-accent transition-colors ml-1"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* 碎片分组列表（带筛选） */}
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {Object.entries(grouped)
          .filter(([type]) => activeFilters.size === 0 || activeFilters.has(type))
          .map(([type, frags]) => (
          <div key={type} className="space-y-1">
            <div className="flex items-center gap-2 px-1 mb-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                style={{ backgroundColor: TYPE_COLORS[type] || '#b8a088' }}
              >
                {type}
              </span>
              <span className="text-xs text-warm-dark/30">{frags.length} 个</span>
            </div>
            {frags.map(f => {
              const isSelected = selectedIds.has(f.id);
              const isTrial = trialFragmentId === f.id;
              const isTrialBouncing = isTrial && trialBounce;
              return (
                <button
                  key={f.id}
                  data-fragment-id={f.id}
                  onClick={() => {
                    // W5-3: 试探中的卡片点击确认
                    if (isTrial && !trialBounce) { confirmTrial(); return; }
                    // On mobile: if selected mode, trigger snap to this card
                    if (isMobile && mobileSnap.phase === 'selected') {
                      triggerSnap();
                      return;
                    }
                    toggleFragmentWithLimit(f.id);
                  }}
                  onPointerDown={(e) => isMobile ? onMobileDown(e, f) : onDragPointerDown(e, f)}
                  onPointerMove={() => isMobile ? onMobileMove() : undefined}
                  onPointerUp={() => isMobile ? onMobileUp() : undefined}
                  disabled={!selectedIds.has(f.id) && isMaxReached && !isTrial}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-sm flex items-center gap-2 ${
                    isTrialBouncing
                      ? 'trial-card trial-bounce-out'
                      : isTrial
                      ? 'trial-card'
                      : selectedIds.has(f.id)
                      ? 'bg-warm-accent/10 border-warm-accent/30 text-warm-dark'
                      : isMaxReached
                      ? 'bg-warm-dark/5 border-warm-dark/5 text-warm-dark/20 cursor-not-allowed opacity-50'
                      : 'bg-white/40 border-warm-dark/5 text-warm-dark/40 hover:border-warm-dark/15'
                  }`}
                >
                  {/* W5-3: 试探状态用预览眼图标 */}
                  {isTrial ? (
                    <span className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-xs border ${
                      trialBounce ? 'bg-rose-100 border-rose-300 text-rose-500' : 'bg-amber-100 border-amber-300 text-amber-600 animate-pulse'
                    }`}>
                      👁️
                    </span>
                  ) : (
                    <span className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-xs border transition-all ${
                      isSelected
                        ? 'bg-warm-accent border-warm-accent text-white'
                        : 'border-warm-dark/15'
                    }`}>
                      {isSelected ? '✓' : ''}
                    </span>
                  )}
                  <span className="truncate">{f.content}</span>
                  {/* W5-3: 试探状态的操作提示 */}
                  {isTrial && !trialBounce && (
                    <span className="shrink-0 text-[10px] text-amber-500 font-medium animate-pulse ml-auto">
                      点击确认
                    </span>
                  )}
                  {!isTrial && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const exclude = Array.from(selectedIds).join(',');
                          const res = await fetch(`${API_BASE}/api/fragments/recommend?target_id=${f.id}&exclude_ids=${exclude}&limit=5`);
                          const data = await res.json();
                          if (data.recommendations && data.recommendations.length > 0) {
                            setRecModal({
                              open: true,
                              target: f,
                              recs: data.recommendations,
                            });
                          } else {
                            toast('没有找到更多相关碎片了', 'info');
                          }
                        } catch { toast('推荐失败', 'error'); }
                      }}
                      title="查找相关碎片"
                      className="shrink-0 px-1.5 py-0.5 rounded text-xs bg-warm-accent/5 text-warm-accent/50 border border-warm-accent/20 hover:bg-warm-accent/15 hover:text-warm-accent/80 transition-all ml-1"
                    >
                      💡
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* AI推荐相关碎片弹窗 */}
      {recModal.open && recModal.target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-warm-dark/10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-warm-dark/5">
              <div>
                <h3 className="font-bold text-warm-dark">💡 相关碎片推荐</h3>
                <p className="text-xs text-warm-dark/40 mt-0.5">
                  基于「{recModal.target.content.slice(0, 15)}...」推荐
                </p>
              </div>
              <button
                onClick={() => setRecModal({ open: false, target: null, recs: [] })}
                className="w-7 h-7 rounded-full bg-warm-dark/5 text-warm-dark/40 hover:bg-warm-dark/10 hover:text-warm-dark/60 flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {recModal.recs.map((rec) => (
                <div
                  key={String(rec.id)}
                  data-fragment-id={String(rec.id)}
                  className="p-3 rounded-xl border border-warm-dark/10 bg-warm-light/40 hover:border-warm-accent/30 transition-colors cursor-pointer"
                  onClick={() => {
                    if (!selectedIds.has(String(rec.id))) {
                      if (selectedIds.size >= MAX_FRAGMENTS) return;
                      setSelectedIds(prev => new Set(prev).add(String(rec.id)));
                    }
                    setRecModal({ open: false, target: null, recs: [] });
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: TYPE_COLORS[String(rec.fragment_type)] || '#b8a088' }}
                    >
                      {String(rec.fragment_type)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-warm-dark/30">相似度 {((rec.composite_score as number) * 100).toFixed(0)}%</span>
                      {selectedIds.has(String(rec.id)) && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">已选</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-warm-dark/80">{String(rec.content)}</p>
                  {(rec.quality_score as number) >= 4 && (
                    <p className="text-xs text-amber-600 mt-1">⭐ 高质量碎片</p>
                  )}
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setRecModal({ open: false, target: null, recs: [] })}
                className="w-full py-2 rounded-xl bg-warm-dark/5 text-warm-dark/50 text-sm hover:bg-warm-dark/10 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* W3-1/W3-2: 拖拽/移动端投放区 */}
      {(() => {
        // Desktop: show during dragging
        if (!isMobile && drag.phase === 'dragging') {
          return (
            <div
              ref={dropzoneRef}
              className={`drop-zone p-4 text-center transition-all ${isOverDrop ? 'drop-zone-active' : ''}`}
            >
              <div className="drop-zone-icon text-3xl mb-1">🧩</div>
              <p className="text-sm font-medium text-warm-dark/50">
                {isOverDrop ? '✨ 松开预览咬合' : '拖到这里试放拼图片'}
              </p>
              <p className="text-xs text-warm-dark/30 mt-0.5">
                长按拼图片卡片开始拖拽 → 放到此处预览
              </p>
            </div>
          );
        }
        // Mobile: show when a piece is selected or snapping
        if (isMobile && (mobileSnap.phase === 'selected' || mobileSnap.phase === 'snapping')) {
          return (
            <div
              ref={dropzoneRef}
              onClick={triggerSnap}
              className={`mobile-drop-zone p-4 text-center transition-all cursor-pointer relative overflow-hidden ${dropBounce ? 'mobile-drop-bounce' : ''}`}
            >
              {/* Snap ripple on tap */}
              {mobileSnap.phase === 'snapping' && <div className="mobile-snap-ripple" />}
              <div className="text-3xl mb-1 animate-bounce">👆</div>
              <p className="text-sm font-bold text-warm-accent">
                {mobileSnap.phase === 'snapping' ? '✨ 预览中...' : '点这里试放拼图片'}
              </p>
              <p className="text-xs text-warm-dark/30 mt-0.5">
                长按选中拼图片 → 点击此处预览
              </p>
            </div>
          );
        }
        return null;
      })()}

      {/* 融合按钮 */}
      <div className="pt-2 pb-4">
        <button
          onClick={handleFusion}
          disabled={selectedIds.size < MIN_FRAGMENTS || selectedIds.size > MAX_FRAGMENTS || !!goalError}
          className="w-full py-3 bg-warm-accent text-white rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl enabled:hover:bg-warm-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
        >
          ⚡ 开始融合（{selectedIds.size}/{MAX_FRAGMENTS}）
        </button>
        {selectedIds.size === 0 && (
          <p className="text-xs text-warm-dark/30 text-center mt-2">从上方选择至少 {MIN_FRAGMENTS} 个碎片</p>
        )}
        {selectedIds.size > 0 && selectedIds.size < MIN_FRAGMENTS && (
          <p className="text-xs text-warm-dark/40 text-center mt-2">还差 {MIN_FRAGMENTS - selectedIds.size} 个，建议选 {MIN_FRAGMENTS}+ 个效果更好</p>
        )}
        {isMaxReached && (
          <p className="text-xs text-amber-600 text-center mt-2">已达上限 {MAX_FRAGMENTS} 个，取消部分碎片后继续</p>
        )}
      </div>

      {/* W3-1: 拖拽幽灵元素（仅桌面端） */}
      {!isMobile && (drag.phase === 'dragging' || drag.phase === 'dropping') && drag.fragment && (
        <div
          className={`drag-ghost ${drag.phase === 'dropping' ? 'puzzle-snap' : ''}`}
          style={{
            left: drag.x,
            top: drag.y,
            opacity: drag.phase === 'dropping' ? 0 : 1,
          }}
        >
          <span
            className="ghost-type"
            style={{ backgroundColor: TYPE_COLORS[drag.fragment.fragment_type] || '#b8a088' }}
          >
            {drag.fragment.fragment_type}
          </span>
          <span className="ghost-content">{drag.fragment.content}</span>
        </div>
      )}

      {/* W3-2: 移动端取消选中蒙层 */}
      {isMobile && mobileSnap.phase === 'selected' && (
        <div
          onClick={cancelSelection}
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
          style={{ pointerEvents: 'auto' }}
        />
      )}
    </div>
  );
}