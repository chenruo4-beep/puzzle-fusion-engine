'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  requestPushSubscription,
  cancelPushSubscription,
  checkPushSubscription,
  sendTestPush,
} from '@/app/sw-register';

// 动态导入非关键组件，减小首屏 bundle
const CompletionRing = dynamic(() => import('@/components/CompletionRing'), { ssr: false });
const ReverseConfirmationCard = dynamic(() => import('@/components/ReverseConfirmationCard'), { ssr: false });
const AbilitySpectrum = dynamic(() => import('@/components/AbilitySpectrum'), { ssr: false });
const WeeklyInsightCard = dynamic(() => import('@/components/WeeklyInsightCard'), { ssr: false });
const DailyObservationNote = dynamic(() => import('@/components/DailyObservationNote'), { ssr: false });
const TodaySuggestion = dynamic(() => import('@/components/TodaySuggestion'), { ssr: false });
const MicroHabitSeed = dynamic(() => import('@/components/MicroHabitSeed'), { ssr: false });
const LetGoRitual = dynamic(() => import('@/components/LetGoRitual'), { ssr: false });
const DeepQuestionCard = dynamic(() => import('@/components/DeepQuestionCard'), { ssr: false });
const UserProfileCard = dynamic(() => import('@/components/UserProfileCard'), { ssr: false });
const AIProviderPanel = dynamic(() => import('@/components/AIProviderPanel'), { ssr: false });
const ShareInvite = dynamic(() => import('@/components/ShareInvite'), { ssr: false });
const DataExport = dynamic(() => import('@/components/DataExport'), { ssr: false });

/* ---------- 类型 ---------- */
interface Fragment {
  id: string;
  fragment_type: string;
  content: string;
  created_at: string;
}

interface Fusion {
  id: string;
  profession: string;
  title: string;
  result: string;
  created_at: string;
}

interface CheckIn {
  id: number;
  title: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

interface JournalEntry {
  id: number;
  content: string;
  tags: string[];
  created_at: string;
}

/* ---------- 常量 ---------- */

const QUOTES = [
  '每天进步一点点，碎片也能拼出星辰 ✨',
  '坚持的力量，藏在每一天的小行动里 🌱',
  '你的独特组合，就是最大的竞争力 🧩',
  '今天又是积累的一天，加油 💪',
  '拼图不需要一开始就完整。慢慢来，每一块都算数 🧩',
];

// const TYPE_COLORS: Record<string, string> = {
//   '技能': '#4a7c9b',
//   '能力': '#5a7a5a',
//   '爱好': '#c49a6c',
//   '习惯': '#c49a6c',
//   '知识': '#b8a088',
//   '经历': '#b8a088',
//   '资源': '#7a9b4a',
//   '性格': '#9b6c4a',
// };

/* ---------- 活动条目（融合 / 日记混合排序） ---------- */
interface ClusterItem {
  id: number;
  content: string;
  fragment_type: string;
  quality_score: number;
}

interface Cluster {
  name: string;
  theme: { name: string; color: string; bg: string };
  description: string;
  primary_type: string;
  count: number;
  avg_similarity: number;
  fragments: ClusterItem[];
}

interface GapItem {
  content: string;
  fragment_type: string;
  suggestion: string;
  color: string;
  best_match_score: number;
}

interface GapData {
  total_fragments: number;
  existing_types: string[];
  gap_count: number;
  gap_types: string[];
  gaps: GapItem[];
  message: string;
}

interface ActivityItem {
  id: string;
  type: 'fusion' | 'journal';
  title: string;
  tag?: string;
  createdAt: string;
}

/* ---------- 组件 ---------- */
export default function DashboardHome() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [fusions, setFusions] = useState<Fusion[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [gapData, setGapData] = useState<GapData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 推送状态
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [fRes, fuRes, cRes, jRes, clRes, gapRes] = await Promise.all([
          authFetch('/api/fragments/').catch(() => null),
          authFetch('/api/fusions/').catch(() => null),
          authFetch('/api/checkins/').catch(() => null),
          authFetch('/api/journal/').catch(() => null),
          authFetch('/api/fragments/clusters').catch(() => null),
          authFetch('/api/fragments/gaps').catch(() => null),
        ]);
        const fData = fRes ? await fRes.json() : {};
        const fuData = fuRes ? await fuRes.json() : {};
        const cData = cRes ? await cRes.json() : {};
        const jData = jRes ? await jRes.json() : {};
        setFragments(fData?.data?.items ?? (Array.isArray(fData) ? fData : []));
        setFusions(fuData?.data?.items ?? (Array.isArray(fuData) ? fuData : []));
        setCheckins(cData?.data?.items ?? (Array.isArray(cData) ? cData : []));
        setJournals(jData?.data?.items ?? (Array.isArray(jData) ? jData : []));
        const clData = clRes ? await clRes.json() : { clusters: [] };
        setClusters(Array.isArray(clData.clusters) ? clData.clusters : []);
        const gData = gapRes ? await gapRes.json() : null;
        setGapData(gData);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ---- 派生数据 ---- */

  // 好久不见检测（超过24小时未访问）
  const [isReturning, setIsReturning] = useState(false);
  useEffect(() => {
    try {
      const last = localStorage.getItem('puzzle_last_visit');
      const now = Date.now();
      if (last && now - Number(last) > 24 * 60 * 60 * 1000) {
        setIsReturning(true);
      }
      localStorage.setItem('puzzle_last_visit', String(now));
    } catch {
      // localStorage 不可用时不处理
    }
  }, []);

  // 检查推送订阅状态
  useEffect(() => {
    checkPushSubscription().then(setPushStatus);
  }, []);

  // 切换推送订阅
  const togglePush = async () => {
    setPushLoading(true);
    try {
      if (pushStatus === 'granted') {
        await cancelPushSubscription();
        setPushStatus('default');
      } else {
        const ok = await requestPushSubscription();
        setPushStatus(ok ? 'granted' : 'denied');
        if (ok) {
          // 发送测试推送
          await sendTestPush();
        }
      }
    } finally {
      setPushLoading(false);
    }
  };

  // 问候语
  const now = new Date();
  const hours = now.getHours();
  const baseGreeting =
    hours < 6 ? '凌晨好' :
    hours < 9 ? '早上好' :
    hours < 12 ? '上午好' :
    hours < 14 ? '中午好' :
    hours < 18 ? '下午好' : '晚上好';
  const greeting = isReturning ? '好久不见' : baseGreeting;

  // 今日日期
  const todayStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  // 随机激励语（基于日期，同一天显示同一条）
  const quoteIndex = now.getDate() % QUOTES.length;

  // 打卡连续天数（useMemo缓存，避免每次渲染重新计算）
  const streak = useMemo(() => {
    if (checkins.length === 0) return 0;
    const completed = checkins
      .filter(c => c.status === 'completed' && c.completed_at)
      .map(c => new Date(c.completed_at!).toISOString().slice(0, 10))
      .filter((v, i, a) => a.indexOf(v) === i) // 去重
      .sort()
      .reverse();
    if (completed.length === 0) return 0;
    let s = 1;
    const today = new Date().toISOString().slice(0, 10);
    // 如果最近完成日不是今天也不是昨天，连续天数归零
    const latest = completed[0];
    const latestDate = new Date(latest);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - latestDate.getTime()) / 86400000);
    if (diffDays > 1) return 0;
    for (let i = 1; i < completed.length; i++) {
      const prev = new Date(completed[i - 1]);
      const curr = new Date(completed[i]);
      const gap = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
      if (gap === 1) s++;
      else break;
    }
    return s;
  }, [checkins]);
  const totalCheckins = checkins.filter(c => c.status === 'completed').length;

  // 拼图片连接率：以融合次数 × 4（平均每次融合涉及约4块拼图片）/ 总拼图片数估算
  const estimatedConnections = fusions.length * 4;
  const connectionRate = fragments.length > 0
    ? Math.round(Math.min(100, (estimatedConnections / fragments.length) * 100))
    : 0;
  const connectedCount = Math.min(fragments.length, estimatedConnections);

  // 最近活动（融合 + 日记混合，取最新5条）— useMemo缓存
  const activities = useMemo<ActivityItem[]>(() => {
    const items = [
      ...fusions.slice(0, 5).map(f => ({
        id: `f-${f.id}`,
        type: 'fusion' as const,
        title: f.title || f.profession || '融合结果',
        tag: f.profession,
        createdAt: f.created_at,
      })),
      ...journals.slice(0, 5).map(j => ({
        id: `j-${j.id}`,
        type: 'journal' as const,
        title: j.content?.slice(0, 40) || '日记',
        tag: j.tags?.[0],
        createdAt: j.created_at,
      })),
    ];
    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [fusions, journals]);

  /* ---- 渲染 ---- */
  return (
    <div className="space-y-6">
      {/* ====== 欢迎区 ====== */}
      <div className="rounded-2xl bg-gradient-to-br from-warm-accent/15 via-warm-light to-warm-light dark:from-warm-accent/10 dark:via-dark-surface dark:to-dark-bg border border-warm-accent/20 dark:border-dark-border p-5">
        <h1 className="text-2xl font-bold text-warm-dark dark:text-dark-text">
          {greeting} 👋
        </h1>
        <p className="text-sm text-warm-dark/50 dark:text-dark-text/50 mt-1">{todayStr}</p>
        <p className="text-sm text-warm-dark/70 dark:text-dark-text/70 mt-2 italic">
          {QUOTES[quoteIndex]}
        </p>
      </div>

      {/* ====== 推送通知设置 ====== */}
      {pushStatus !== 'unsupported' && (
        <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <div className="text-sm font-medium text-warm-dark dark:text-dark-text">推送通知</div>
              <div className="text-xs text-warm-dark/50 dark:text-dark-text/50">
                {pushStatus === 'granted' ? '已开启，接收打卡提醒' :
                 pushStatus === 'denied' ? '已拒绝，在浏览器设置中开启' :
                 '开启后可接收打卡提醒'}
              </div>
            </div>
          </div>
          <button
            onClick={togglePush}
            disabled={pushLoading || pushStatus === 'denied'}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              pushStatus === 'granted'
                ? 'bg-warm-accent/20 text-warm-accent hover:bg-warm-accent/30'
                : 'bg-warm-accent text-white hover:bg-warm-accent/90'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {pushLoading ? '处理中...' : pushStatus === 'granted' ? '关闭' : '开启'}
          </button>
        </div>
      )}

      {/* ====== 深度问题 ====== */}
      <DeepQuestionCard />

      {/* ====== 今日自我观察 ====== */}
      <DailyObservationNote />

      {/* ====== 今日使用建议 ====== */}
      <TodaySuggestion />

      {/* ====== 这可能也是你 ====== */}
      <ReverseConfirmationCard />

      {/* ====== 放下仪式 ====== */}
      <LetGoRitual />

      {/* ====== 快捷入口 2×2 ====== */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/dashboard/fragments"
          className="rounded-xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-4 text-center hover:border-warm-accent/40 dark:hover:border-dark-accent/40 hover:shadow-sm transition-all group"
        >
          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🧩</div>
          <div className="text-sm font-medium text-warm-dark dark:text-dark-text">添加碎片</div>
        </Link>
        <Link
          href="/dashboard/fusion"
          className="rounded-xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-4 text-center hover:border-warm-accent/40 dark:hover:border-dark-accent/40 hover:shadow-sm transition-all group"
        >
          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🔮</div>
          <div className="text-sm font-medium text-warm-dark dark:text-dark-text">开始融合</div>
        </Link>
        <Link
          href="/dashboard/checkin"
          className="rounded-xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-4 text-center hover:border-warm-accent/40 dark:hover:border-dark-accent/40 hover:shadow-sm transition-all group"
        >
          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">✅</div>
          <div className="text-sm font-medium text-warm-dark dark:text-dark-text">今日打卡</div>
        </Link>
        <Link
          href="/dashboard/journal"
          className="rounded-xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-4 text-center hover:border-warm-accent/40 dark:hover:border-dark-accent/40 hover:shadow-sm transition-all group"
        >
          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📝</div>
          <div className="text-sm font-medium text-warm-dark dark:text-dark-text">写日记</div>
        </Link>
        <Link
          href="/dashboard/analytics"
          className="rounded-xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-4 text-center hover:border-warm-accent/40 dark:hover:border-dark-accent/40 hover:shadow-sm transition-all group"
        >
          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📊</div>
          <div className="text-sm font-medium text-warm-dark dark:text-dark-text">看分析</div>
        </Link>
      </div>

      {/* ====== 统计卡片 ====== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse rounded-2xl bg-white/60 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-4">
              <div className="h-3 w-12 bg-warm-dark/10 dark:bg-dark-border rounded mb-2" />
              <div className="h-6 w-8 bg-warm-dark/10 dark:bg-dark-border rounded" />
            </div>
          ))
        ) : (
          <>
            <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-4">
              <div className="text-xs text-warm-dark/40 dark:text-dark-text/40 mb-1">🧩 碎片总数</div>
              <div className="text-2xl font-bold text-warm-dark dark:text-dark-text">{fragments.length}</div>
            </div>
            <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-4">
              <div className="text-xs text-warm-dark/40 dark:text-dark-text/40 mb-1">✨ 融合次数</div>
              <div className="text-2xl font-bold text-warm-dark dark:text-dark-text">{fusions.length}</div>
            </div>
            <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-4">
              <div className="text-xs text-warm-dark/40 dark:text-dark-text/40 mb-1">📔 日记篇数</div>
              <div className="text-2xl font-bold text-warm-dark dark:text-dark-text">{journals.length}</div>
            </div>
            <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-4">
              <div className="text-xs text-warm-dark/40 dark:text-dark-text/40 mb-1">🔥 打卡连续</div>
              <div className="text-2xl font-bold text-warm-dark dark:text-dark-text">
                {streak > 0 ? `${streak} 天` : `${totalCheckins} 次`}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ====== 数据导出 ====== */}
      <div className="flex justify-end">
        <DataExport fragments={fragments} fusions={fusions} journals={journals} />
      </div>

      {/* ====== 用户认知画像 ====== */}
      <UserProfileCard />

      {/* ====== AI 模型设置 ====== */}
      <AIProviderPanel />

      {/* ====== 邀请好友 ====== */}
      <ShareInvite />

      {/* ====== 能力光谱 ====== */}
      <AbilitySpectrum />

      {/* ====== 本周自我新发现 ====== */}
      <WeeklyInsightCard />

      {/* ====== 微习惯孵化器 ====== */}
      <MicroHabitSeed />

      {/* ====== 拼图片连接率圆环 ====== */}
      {!loading && (
        <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-warm-dark/60 dark:text-dark-text/60 mb-4">🔗 拼图片连接率</h3>
          <CompletionRing
            percentage={connectionRate}
            connectedCount={connectedCount}
            totalCount={fragments.length}
            size={130}
            strokeWidth={11}
          />
          <p className="text-xs text-warm-dark/30 dark:text-dark-text/30 mt-3 text-center max-w-[240px]">
            每次融合都在你的拼图片之间建立联系。连接越多，你的组合潜力越大。
          </p>
        </div>
      )}

      {/* ====== 缺口识别 ====== */}
      {!loading && gapData && gapData.gaps.length > 0 && (
        <div className="gap-section rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-warm-dark dark:text-dark-text">🔍 缺口识别</h3>
            <span className="text-xs text-warm-dark/30 dark:text-dark-text/30">{gapData.gap_count} 个潜在缺口</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gapData.gaps.slice(0, 6).map((gap, i) => (
              <div key={i} className="gap-card">
                <span
                  className="gap-badge"
                  style={{ backgroundColor: gap.color + '20', color: gap.color }}
                >
                  {gap.fragment_type}
                </span>
                <div className="gap-content">{gap.content}</div>
                <div className="gap-hint">{gap.suggestion}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-warm-dark/30 dark:text-dark-text/30 mt-4 text-center">
            {gapData.message}
          </p>
          {gapData.gap_count > 6 && (
            <Link
              href="/dashboard/fragments"
              className="block mt-2 text-center text-xs text-warm-accent hover:underline"
            >
              查看全部 {gapData.gap_count} 个缺口 →
            </Link>
          )}
        </div>
      )}

      {/* ====== 智能组块推荐 ====== */}
      {!loading && clusters.length > 0 && (
        <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-warm-dark dark:text-dark-text">🧠 智能组块推荐</h3>
            <span className="text-xs text-warm-dark/30 dark:text-dark-text/30">AI 自动聚类</span>
          </div>
          <div className="space-y-3">
            {clusters.map((cluster, i) => (
              <ClusterCard key={i} cluster={cluster} index={i} />
            ))}
          </div>
          <p className="text-xs text-warm-dark/30 dark:text-dark-text/30 mt-4 text-center">
            拼图片不会孤立存在——它们天然聚成组块，找到你的核心组合 🧩
          </p>
        </div>
      )}

      {/* ====== 最近活动 ====== */}
      <div className="rounded-2xl bg-white/80 dark:bg-dark-surface border border-warm-dark/10 dark:border-dark-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-warm-dark dark:text-dark-text">最近活动</h3>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-10 bg-warm-dark/5 dark:bg-dark-border rounded-lg" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-warm-dark/40 dark:text-dark-text/40">
            <div className="text-2xl mb-2">📭</div>
            <p className="text-sm">暂时安静，正是积蓄力量的时刻</p>
            <Link
              href="/dashboard/fragments"
              className="mt-2 inline-block text-xs text-warm-accent hover:underline"
            >
              从第一块拼图片开始 →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map(a => (
              <div key={a.id} className="flex items-center gap-3 text-sm py-2 border-b border-warm-dark/5 last:border-0">
                <span className="shrink-0 text-lg">
                  {a.type === 'fusion' ? '✨' : '📔'}
                </span>
                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: a.type === 'fusion' ? '#b8a088' : '#5a7a5a' }}
                >
                  {a.type === 'fusion' ? (a.tag || '融合') : '日记'}
                </span>
                <span className="text-warm-dark/70 dark:text-dark-text/70 truncate flex-1">{a.title}</span>
                <span className="shrink-0 text-xs text-warm-dark/30 dark:text-dark-text/30">
                  {formatRelativeTime(a.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====== 试探探索者徽章 ====== */}
      <ExplorerBadge />

      {/* ====== 底部提示 ====== */}
      <div className="rounded-2xl bg-gradient-to-r from-warm-accent/10 to-warm-accent/5 dark:from-warm-accent/5 dark:to-dark-surface border border-warm-accent/15 dark:border-dark-border p-4 text-center">
        <p className="text-sm text-warm-dark/60 dark:text-dark-text/60">
          💡 残缺不是缺憾，是拼图还在生长的证明
        </p>
      </div>
    </div>
  );
}

/* ---------- 组块卡片（memo避免不必要的重渲染） ---------- */
const ClusterCard = memo(function ClusterCard({ cluster }: { cluster: Cluster; index?: number }) {
  const [expanded, setExpanded] = useState(false);
  const { theme, name, description, count, fragments, avg_similarity } = cluster;

  return (
    <div
      className="cluster-card rounded-xl border cursor-pointer transition-all overflow-hidden"
      style={{
        borderColor: theme.color + '30',
        backgroundColor: theme.bg + '80',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* 头部 */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 左侧色条 */}
        <div
          className="shrink-0 w-1.5 self-stretch rounded-full"
          style={{ backgroundColor: theme.color }}
        />
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-warm-dark dark:text-dark-text truncate">{name}</span>
            <span
              className="shrink-0 text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: theme.color }}
            >
              {count}块
            </span>
            {avg_similarity > 0 && (
              <span className="shrink-0 text-[10px] text-warm-dark/25 dark:text-dark-text/25">
                相似度 {Math.round(avg_similarity * 100)}%
              </span>
            )}
          </div>
          <p className="text-xs text-warm-dark/45 dark:text-dark-text/45 mt-0.5">{description}</p>
        </div>
        {/* 展开箭头 */}
        <span
          className="shrink-0 text-warm-dark/30 dark:text-dark-text/30 text-sm transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </div>

      {/* 展开区 */}
      <div
        className="cluster-expand transition-all duration-300 ease-in-out"
        style={{
          maxHeight: expanded ? `${fragments.length * 48 + 20}px` : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="px-4 pb-3 space-y-1.5">
          {fragments.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg"
              style={{ backgroundColor: theme.bg }}
            >
              <span
                className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: theme.color }}
              >
                {f.fragment_type}
              </span>
              <span className="text-warm-dark/70 dark:text-dark-text/70 truncate flex-1">{f.content}</span>
              {f.quality_score > 0 && (
                <span className="shrink-0 text-[10px] text-warm-dark/25">
                  {'⭐'.repeat(Math.min(f.quality_score, 3))}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

/* ---------- 试探探索者徽章（memo避免不必要的重渲染） ---------- */
const ExplorerBadge = memo(function ExplorerBadge() {
  const [trialCount, setTrialCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const count = parseInt(localStorage.getItem('puzzle_trial_count') || '0', 10);
    setTrialCount(count);
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // 徽章等级：3次青铜，10次白银，25次黄金
  const getBadge = (n: number) => {
    if (n >= 25) return { level: 'gold',   label: '🔍 金级探索者', desc: '已试探25次以上，敢于尝试新组合',  color: '#f59e0b', bg: '#fffbeb' };
    if (n >= 10) return { level: 'silver', label: '🔍 银级探索者', desc: '已试探10次以上，探索精神可嘉',   color: '#6b7280', bg: '#f9fafb' };
    if (n >= 3)  return { level: 'bronze', label: '🔍 青铜探索者', desc: '已试探3次以上，开始勇于尝试',    color: '#92400e', bg: '#fffbeb' };
    return null;
  };

  const badge = getBadge(trialCount);
  if (!badge) return null;

  return (
    <div
      className="rounded-2xl border p-5 flex items-center gap-4"
      style={{ backgroundColor: badge.bg, borderColor: badge.color + '30' }}
    >
      <div
        className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl"
        style={{ backgroundColor: badge.color + '20' }}
      >
        {badge.level === 'gold' ? '🥇' : badge.level === 'silver' ? '🥈' : '🥉'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: badge.color }}>{badge.label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.color + '15', color: badge.color }}>
            试探 {trialCount} 次
          </span>
        </div>
        <p className="text-xs text-warm-dark/50 dark:text-dark-text/50 mt-0.5">{badge.desc}</p>
      </div>
    </div>
  );
});

/* ---------- 工具函数 ---------- */
function formatRelativeTime(isoStr: string): string {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
import { authFetch   } from '@/lib/api';
