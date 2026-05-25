'use client';

import { useState, useEffect } from 'react';
import { SkeletonCard } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import EmptyState from '@/components/EmptyState';

interface Fragment {
  id: number;
  fragment_type: string;
  content: string;
}

interface CoCreationResult {
  id: number;
  user_a_name: string;
  user_b_name: string;
  relationship: string;
  project_type: string;
  potential_score: number;  // 契合潜力值（原success_rate）
  complement_score: number;
  risk_level: string;
  result: {
    golden_sentence: string;
    complement_analysis: {
      type_complement: number;
      content_complement: number;
      overall: number;
    };
    potential_factors: string[];
    recommendations: string[];
    directions: Array<{
      title: string;
      description: string;
      difficulty: string;
      next_action: string;
      landmark?: string;
      landmark_icon?: string;
    }>;
    roadmap?: Array<{
      step: number;
      title: string;
      landmark: string;
      landmark_icon: string;
      description: string;
    }>;
  };
  created_at: string;
}


import { authHeaders as getAuthHeaders, authFetch   } from '@/lib/api';

export default function CoCreationPage() {
  const { toast } = useToast();
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CoCreationResult | null>(null);
  const [history, setHistory] = useState<CoCreationResult[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const [orderStep, setOrderStep] = useState<'intro' | 'pending_partner' | 'partner_confirmed' | 'paid'>('intro');
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [paidBy, setPaidBy] = useState<string>('initiator');
  interface OrderInfo { id: number; co_creation_id: number; status: string; initiator_name: string; partner_name: string; amount: number; archived: boolean; }
  const [orders, setOrders] = useState<OrderInfo[]>([]);

  // 表单状态
  const [userAName, setUserAName] = useState('');
  const [userBName, setUserBName] = useState('');
  const [relationship, setRelationship] = useState('partner');
  const [projectType, setProjectType] = useState('');
  const [selectedA, setSelectedA] = useState<number[]>([]);
  const [selectedB, setSelectedB] = useState<number[]>([]);

  useEffect(() => {
    loadFragments();
    loadHistory();
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const res = await authFetch('/api/co-creation-orders/');
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } catch { /* silent */ }
  }

  async function loadFragments() {
    try {
      const res = await authFetch('/api/fragments/');
      const data = await res.json();
      setFragments(Array.isArray(data) ? data : []);
    } catch {
      toast('加载碎片失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const res = await authFetch('/api/co-creation/');
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      // silent
    }
  }

  async function handleAnalyze() {
    if (!userAName.trim() || !userBName.trim() || !projectType.trim()) {
      toast('先填上你们的名字和想做的事', 'error');
      return;
    }
    if (selectedA.length < 2 || selectedB.length < 2) {
      toast('每人至少选2个碎片', 'error');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await authFetch('/api/co-creation/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_a_name: userAName,
          user_b_name: userBName,
          relationship,
          project_type: projectType,
          user_a_fragment_ids: selectedA,
          user_b_fragment_ids: selectedB,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setShowPayment(false);
        setPreviewDismissed(false);
        toast('你们的碎片，拼出了一个方向。', 'success');
        loadHistory();
      } else {
        toast(data.detail || '分析失败', 'error');
      }
    } catch {
      toast('分析失败，请重试', 'error');
    } finally {
      setAnalyzing(false);
    }
  }

  const toggleSelection = (id: number, role: 'a' | 'b') => {
    if (role === 'a') {
      setSelectedA(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedB(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }
  };

  // VIP弹窗 - 多步骤双人确认支付流程
  const PaywallModal = () => {
    const [busy, setBusy] = useState(false);

    const handleCreateOrder = async () => {
      if (!result) return;
      setBusy(true);
      try {
        const res = await authFetch('/api/co-creation-orders/', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            co_creation_id: result.id,
            initiator_name: userAName || '甲方',
            partner_name: userBName || '乙方',
            amount: 29.9,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setCurrentOrderId(data.data.id);
          setOrderStep('pending_partner');
          toast(data.data.message, 'success');
          loadOrders();
        } else {
          toast(data.detail || '创建订单失败', 'error');
        }
      } catch {
        toast('创建订单失败', 'error');
      } finally {
        setBusy(false);
      }
    };

    const handlePartnerConfirm = async () => {
      if (!currentOrderId) return;
      setBusy(true);
      try {
        const res = await authFetch(`/api/co-creation-orders/${currentOrderId}/confirm`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ paid_by: paidBy }),
        });
        const data = await res.json();
        if (data.success) {
          setOrderStep('partner_confirmed');
          toast(data.data.message, 'success');
          loadOrders();
        } else {
          toast(data.detail || '确认失败', 'error');
        }
      } catch {
        toast('确认失败', 'error');
      } finally {
        setBusy(false);
      }
    };

    const handlePay = async () => {
      if (!currentOrderId) return;
      setBusy(true);
      try {
        const res = await authFetch(`/api/co-creation-orders/${currentOrderId}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (data.success) {
          setOrderStep('paid');
          toast(data.data.message, 'success');
          loadOrders();
        } else {
          toast(data.detail || '支付失败', 'error');
        }
      } catch {
        toast('支付失败', 'error');
      } finally {
        setBusy(false);
      }
    };

    const handleClose = () => {
      setShowPaywall(false);
      setOrderStep('intro');
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
        <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 text-center" onClick={e => e.stopPropagation()}>
          {/* Step 0: Intro — 价值展示 */}
          {orderStep === 'intro' && (
            <>
              <div className="text-4xl mb-3">🗺️</div>
              <h3 className="text-lg font-bold text-warm-dark mb-2">解锁一起拼地图</h3>
              <p className="text-sm text-warm-dark/60 mb-4">
                要解锁完整的&apos;一起拼&apos;地图吗？它会帮你们把方向变成一步一步的路。这张地图会同时出现在你们俩的Me里。
                <br/><span className="text-xs text-warm-dark/40">（3天冷静期内可随时退款）</span>
              </p>
              <div className="space-y-2 mb-4 text-left bg-warm-light/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm text-warm-dark/70">
                  <span className="text-warm-accent">🧩</span> 4步可视化路线图
                </div>
                <div className="flex items-center gap-2 text-sm text-warm-dark/70">
                  <span className="text-warm-accent">📍</span> 里程碑进度追踪
                </div>
                <div className="flex items-center gap-2 text-sm text-warm-dark/70">
                  <span className="text-warm-accent">🤝</span> 双人协作节点标记
                </div>
                <div className="flex items-center gap-2 text-sm text-warm-dark/70">
                  <span className="text-warm-accent">💌</span> 合伙承诺书（纪念版）
                </div>
              </div>
              <div className="mb-4">
                <div className="text-2xl font-bold text-warm-accent">¥29.9</div>
                <p className="text-xs text-warm-dark/40 mt-1">一次解锁，永久有效</p>
                <p className="text-xs text-warm-dark/50 mt-0.5">由发起方支付，另一方自动获得。一次解锁，共同抵达。</p>
                <p className="text-xs text-warm-dark/30 mt-1.5">专业版用户每月可免费生成1次合拍地图</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-700">
                  💡 建议双方AA或提前商量好由谁出资，让这个决定也成为你们一起走的一小步。
                </p>
              </div>
              <button
                onClick={handleCreateOrder}
                disabled={busy}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {busy ? '处理中...' : '我们准备好了 💫'}
              </button>
              <button onClick={handleClose} className="w-full py-2 text-sm text-warm-dark/40 mt-2 hover:text-warm-dark/60">
                再想想，没关系
              </button>
            </>
          )}

          {/* Step 1: 等待对方确认 */}
          {orderStep === 'pending_partner' && (
            <>
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="text-lg font-bold text-warm-dark mb-2">等待 {userBName || '对方'} 确认</h3>
              <p className="text-sm text-warm-dark/60 mb-4">
                已发起邀请，等TA回应。
              </p>
              <div className="bg-blue-50 rounded-xl p-4 mb-4 text-left">
                <p className="text-xs text-blue-700 mb-2">📋 订单详情</p>
                <p className="text-xs text-blue-700">发起人：{userAName || '你'}</p>
                <p className="text-xs text-blue-700">对方：{userBName || 'TA'}</p>
                <p className="text-xs text-blue-700">金额：¥29.9</p>
                <p className="text-xs text-blue-700">状态：等TA回应</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-700">
                  💡 如果对方就在旁边，可以让 ta 点击下方按钮确认。
                </p>
              </div>
              <div className="mb-3">
                <label className="text-xs text-warm-dark/50 block mb-1">出资方式</label>
                <select
                  value={paidBy}
                  onChange={e => setPaidBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-warm-dark/10 text-xs bg-warm-light/50"
                >
                  <option value="initiator">{userAName || '你'}出资</option>
                  <option value="partner">{userBName || 'TA'}出资</option>
                  <option value="aa">AA 各付一半</option>
                </select>
              </div>
              <button
                onClick={handlePartnerConfirm}
                disabled={busy}
                className="w-full py-3 bg-gradient-to-r from-blue-400 to-indigo-500 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {busy ? '处理中...' : `我是 ${userBName || '对方'}，确认参与 ✓`}
              </button>
              <button onClick={handleClose} className="w-full py-2 text-sm text-warm-dark/40 mt-2 hover:text-warm-dark/60">
                稍后再确认
              </button>
            </>
          )}

          {/* Step 2: 双方已确认，待支付 */}
          {orderStep === 'partner_confirmed' && (
            <>
              <div className="text-4xl mb-3">💳</div>
              <h3 className="text-lg font-bold text-warm-dark mb-2">就快好了！</h3>
              <p className="text-sm text-warm-dark/60 mb-4">
                {userAName} × {userBName}，一起拼的地图马上属于你们。
              </p>
              <div className="bg-green-50 rounded-xl p-4 mb-4 text-left">
                <p className="text-xs text-green-700 mb-2">✅ 确认详情</p>
                <p className="text-xs text-green-700">发起人：{userAName || '你'}</p>
                <p className="text-xs text-green-700">对方：{userBName || 'TA'}（已确认）</p>
                <p className="text-xs text-green-700">出资方：{paidBy === 'initiator' ? userAName : paidBy === 'partner' ? userBName : 'AA'}</p>
                <p className="text-xs text-green-700">金额：¥29.9</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-700">
                  🛡️ 支付后享受3天冷静期，可随时退款。
                </p>
              </div>
              <button
                onClick={handlePay}
                disabled={busy}
                className="w-full py-3 bg-gradient-to-r from-emerald-400 to-teal-500 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {busy ? '处理中...' : '确认支付 ¥29.9 💫'}
              </button>
              <button onClick={handleClose} className="w-full py-2 text-sm text-warm-dark/40 mt-2 hover:text-warm-dark/60">
                再想想
              </button>
            </>
          )}

          {/* Step 3: 支付成功 */}
          {orderStep === 'paid' && (
            <>
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-bold text-warm-dark mb-2">支付成功！</h3>
              <p className="text-sm text-warm-dark/60 mb-4">
                你们的第一张一起拼地图正在生成中……
              </p>
              <div className="bg-emerald-50 rounded-xl p-4 mb-4 text-left">
                <p className="text-xs text-emerald-700 mb-2">🎊 包含内容</p>
                <p className="text-xs text-emerald-700">🧩 4步可视化路线图</p>
                <p className="text-xs text-emerald-700">📍 里程碑进度追踪</p>
                <p className="text-xs text-emerald-700">🤝 双人协作节点标记</p>
                <p className="text-xs text-emerald-700">💌 合伙承诺书（纪念版）</p>
                <p className="text-xs text-emerald-700 mt-2">🛡️ 3天冷静期 · 可随时退款</p>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl text-sm font-medium hover:opacity-90"
              >
                好，我们一起走 🚀
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const riskColor = {
    low: 'text-emerald-600 bg-emerald-50',
    medium: 'text-amber-600 bg-amber-50',
    high: 'text-red-600 bg-red-50',
  };

  const riskText = {
    low: '低风险',
    medium: '中等风险',
    high: '高风险',
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div>
        <h1 className="text-2xl font-bold text-warm-dark">一起拼</h1>
        <p className="text-sm text-warm-dark/50 mt-1">把你的碎片和TA的放在一起，看看能拼出什么。</p>
      </div>

      {/* 输入表单 */}
      <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-warm-dark/60 mb-1 block">你的名字</label>
            <input
              value={userAName}
              onChange={e => setUserAName(e.target.value)}
              placeholder="你的名字"
              className="w-full px-4 py-2.5 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-warm-dark/60 mb-1 block">TA的名字</label>
            <input
              value={userBName}
              onChange={e => setUserBName(e.target.value)}
              placeholder="TA的名字"
              className="w-full px-4 py-2.5 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-warm-dark/60 mb-1 block">关系</label>
            <select
              value={relationship}
              onChange={e => setRelationship(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm"
            >
              <option value="partner">合伙人</option>
              <option value="spouse">夫妻</option>
              <option value="lover">情侣</option>
              <option value="friend">朋友</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-warm-dark/60 mb-1 block">项目类型</label>
            <input
              value={projectType}
              onChange={e => setProjectType(e.target.value)}
              placeholder="如：开奶茶店"
              className="w-full px-4 py-2.5 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm"
            />
          </div>
        </div>

        {/* 碎片选择 */}
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : fragments.length === 0 ? (
          <EmptyState icon="🧩" title="还没有碎片" description="先去碎片页留下你的第一片。" />
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-medium text-warm-dark/60">挑几片你的碎片（每人至少2个）</p>
            
            {/* 甲方碎片 */}
            <div>
              <p className="text-xs text-warm-dark/40 mb-2">{userAName || '你'}的碎片（已选{selectedA.length}个）</p>
              <div className="flex flex-wrap gap-2">
                {fragments.map(f => (
                  <button
                    key={`a-${f.id}`}
                    onClick={() => toggleSelection(f.id, 'a')}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      selectedA.includes(f.id)
                        ? 'bg-warm-accent text-white'
                        : 'bg-warm-light/50 text-warm-dark/60 hover:bg-warm-light'
                    }`}
                  >
                    {f.fragment_type}: {f.content.slice(0, 20)}
                  </button>
                ))}
              </div>
            </div>

            {/* 乙方碎片 */}
            <div>
              <p className="text-xs text-warm-dark/40 mb-2">{userBName || 'TA'}的碎片（已选{selectedB.length}个）</p>
              <div className="flex flex-wrap gap-2">
                {fragments.map(f => (
                  <button
                    key={`b-${f.id}`}
                    onClick={() => toggleSelection(f.id, 'b')}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      selectedB.includes(f.id)
                        ? 'bg-indigo-500 text-white'
                        : 'bg-warm-light/50 text-warm-dark/60 hover:bg-warm-light'
                    }`}
                  >
                    {f.fragment_type}: {f.content.slice(0, 20)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full py-3 bg-gradient-to-r from-warm-accent to-indigo-500 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {analyzing ? 'Me在拼合中……' : '开始拼合'}
        </button>
      </div>

      {/* 免费预览报告 */}
      {result && !showPayment && !previewDismissed && (
        <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-warm-dark">你们的合拍潜力预览</h3>
            <p className="text-sm text-warm-dark/50 mt-1">基于你们各自的碎片，Me看到了一些有意思的可能性。</p>
          </div>

          <div className="text-center">
            <p className="text-sm text-warm-dark/50 mb-2">
              契合潜力：{result.potential_score >= 75 ? '高' : result.potential_score >= 50 ? '中' : '有待探索'}
            </p>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all ${
                    (result.potential_score >= 75) ||
                    (result.potential_score >= 50 && i < 2) ||
                    (result.potential_score < 50 && i === 0)
                      ? 'bg-warm-accent shadow-sm'
                      : 'bg-warm-dark/15'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-warm-dark/60 mb-3 text-center">可能的方向</p>
            <div className="grid grid-cols-1 gap-3">
              {(result.result.directions || []).slice(0, 3).map((d, i) => {
                const defaultIcons = ['🌱', '🎯', '💫'];
                const gradients = [
                  'from-amber-50 to-orange-50',
                  'from-indigo-50 to-blue-50',
                  'from-emerald-50 to-teal-50',
                ];
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl bg-gradient-to-br ${gradients[i % 3]} border border-warm-dark/5`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{d.landmark_icon || defaultIcons[i]}</span>
                      <span className="text-sm font-medium text-warm-dark">{d.title}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {(result.result.directions || []).length === 0 && (
              <p className="text-xs text-center text-warm-dark/30">方向正在生成中……</p>
            )}
          </div>

          <p className="text-sm text-center text-warm-dark/50">
            想看看完整的路线图吗？解锁后，你们会得到一张专属于两人的拼图地图。
          </p>

          <div className="relative rounded-xl overflow-hidden border border-warm-dark/10">
            <div className="h-36 bg-gradient-to-br from-warm-light/50 to-indigo-50/50 flex items-center justify-center">
              <div className="text-center opacity-60">
                <div className="w-14 h-14 mx-auto bg-warm-accent/20 rounded-full flex items-center justify-center blur-[1px]">
                  <span className="text-xl">📍</span>
                </div>
                <p className="text-xs text-warm-dark/25 mt-2">第一个路标在这里...</p>
              </div>
            </div>
            <div className="absolute inset-0 backdrop-blur-[3px] bg-white/30 flex items-center justify-center">
              <div className="text-center">
                <span className="text-3xl">🔒</span>
                <p className="text-xs text-warm-dark/40 mt-1">解锁后查看完整地图</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setShowPayment(true); setShowPaywall(true); }}
            className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            解锁完整地图 ¥29.9
          </button>

          <button
            onClick={() => setPreviewDismissed(true)}
            className="w-full py-2 text-sm text-warm-dark/40 hover:text-warm-dark/60 transition-colors"
          >
            我们再想想
          </button>
        </div>
      )}

      {result && !showPayment && previewDismissed && (
        <div className="rounded-xl bg-white/60 border border-warm-dark/5 p-4 text-center">
          <p className="text-sm text-warm-dark/40 mb-2">预览已收起</p>
          <button
            onClick={() => setPreviewDismissed(false)}
            className="text-sm text-warm-accent hover:underline"
          >
            重新查看合拍潜力预览
          </button>
        </div>
      )}

      {/* 分析结果 */}
      {result && showPayment && (
        <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-6 space-y-5">
          <div className="text-center">
            <h3 className="text-lg font-bold text-warm-dark">{result.result.golden_sentence}</h3>
            <div className="flex items-center justify-center gap-3 mt-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${riskColor[result.risk_level as keyof typeof riskColor]}`}>
                {riskText[result.risk_level as keyof typeof riskText]}
              </span>
              <span className="text-sm text-warm-dark/60">契合潜力值 {result.potential_score}%</span>
              <span className="text-sm text-warm-dark/60">互补性 {result.complement_score}%</span>
            </div>
          </div>

          {/* 互补分析 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-warm-light/40 rounded-xl">
              <div className="text-xl font-bold text-warm-accent">{result.result.complement_analysis.type_complement}%</div>
              <div className="text-xs text-warm-dark/40">类型互补</div>
            </div>
            <div className="text-center p-3 bg-warm-light/40 rounded-xl">
              <div className="text-xl font-bold text-indigo-500">{result.result.complement_analysis.content_complement}%</div>
              <div className="text-xs text-warm-dark/40">内容互补</div>
            </div>
            <div className="text-center p-3 bg-warm-light/40 rounded-xl">
              <div className="text-xl font-bold text-emerald-600">{result.result.complement_analysis.overall}%</div>
              <div className="text-xs text-warm-dark/40">综合互补</div>
            </div>
          </div>

          {/* 契合潜力因素 */}
          <div>
            <h4 className="text-sm font-medium text-warm-dark/60 mb-2">✅ 你们的契合点</h4>
            <div className="space-y-1">
              {(result.result.potential_factors || []).map((f, i) => (
                <p key={i} className="text-sm text-warm-dark/70">{f}</p>
              ))}
            </div>
          </div>

          {/* 建议 */}
          <div>
            <h4 className="text-sm font-medium text-warm-dark/60 mb-2">💡 一些小建议</h4>
            <div className="space-y-1">
              {result.result.recommendations.map((r, i) => (
                <p key={i} className="text-sm text-warm-dark/70">{r}</p>
              ))}
            </div>
          </div>

          {/* 方向 */}
          <div>
            <h4 className="text-sm font-medium text-warm-dark/60 mb-2">🎯 可能的方向</h4>
            {result.result.directions.map((d, i) => (
              <div key={i} className="p-3 bg-warm-light/40 rounded-xl">
                <p className="text-sm font-medium text-warm-dark">{d.title}</p>
                <p className="text-xs text-warm-dark/60 mt-1">{d.description}</p>
                <p className="text-xs text-warm-accent mt-1">📌 {d.next_action}</p>
                {d.landmark && (
                  <button
                    onClick={() => setShowPaywall(true)}
                    className="mt-2 text-xs px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full hover:opacity-90 transition-opacity"
                  >
                    🗺 生成一起拼地图
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 历史记录 */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-warm-dark/60">一起拼的记录</h3>
          {history.map(h => {
            const relatedOrder = orders.find(o => o.co_creation_id === h.id && !o.archived);
            const orderStatusText: Record<string, string> = {
              pending_partner: '等TA回应',
              partner_confirmed: '就差一步',
              paid: '已解锁',
              completed: '在路上',
              refunded: '已退回',
            };
            return (
              <div key={h.id} className="rounded-xl bg-white/60 border border-warm-dark/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-warm-dark">{h.user_a_name} × {h.user_b_name}</p>
                    <p className="text-xs text-warm-dark/40">{h.project_type} · 契合潜力值{h.potential_score ?? 0}%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {relatedOrder && (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-600">
                        {orderStatusText[relatedOrder.status] || relatedOrder.status}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${riskColor[h.risk_level as keyof typeof riskColor]}`}>
                      {riskText[h.risk_level as keyof typeof riskText]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 存档纪念入口 */}
      {orders.filter(o => !o.archived && (o.status === 'paid' || o.status === 'completed')).length > 0 && (
        <div className="rounded-xl bg-warm-light/30 border border-warm-dark/5 p-4 text-center">
          <p className="text-sm text-warm-dark/50 mb-2">如果这段路走到尽头了……</p>
          <div className="space-y-2">
            {orders.filter(o => !o.archived && (o.status === 'paid' || o.status === 'completed')).map(o => (
              <div key={o.id} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                <span className="text-xs text-warm-dark/60">{o.initiator_name} × {o.partner_name} · ¥{o.amount}</span>
                <button
                  onClick={async () => {
                    const note = prompt('留下一段纪念留言（可选）：');
                    if (note === null) return;
                    try {
                      const res = await authFetch(`/api/co-creation-orders/${o.id}/archive`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ note }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        toast(data.data.message, 'info');
                        loadOrders();
                      } else {
                        toast(data.detail || '存档失败', 'error');
                      }
                    } catch {
                      toast('存档失败', 'error');
                    }
                  }}
                  className="text-xs px-3 py-1.5 bg-warm-dark/5 text-warm-dark/60 rounded-full hover:bg-warm-dark/10 transition-colors"
                >
                  🕯️ 存档纪念
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-warm-dark/30 mt-2">存档后拼图会保留，但不再更新</p>
        </div>
      )}

      {/* VIP弹窗 */}
      {showPaywall && <PaywallModal />}
    </div>
  );
}
