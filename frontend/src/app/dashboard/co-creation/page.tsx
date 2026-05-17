'use client';

import { useState, useEffect } from 'react';
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

const API_BASE = 'http://localhost:8000';

export default function CoCreationPage() {
  const { toast } = useToast();
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CoCreationResult | null>(null);
  const [history, setHistory] = useState<CoCreationResult[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [, setOrderStatus] = useState<'idle' | 'pending_partner' | 'partner_confirmed' | 'paid'>('idle');
  const [, setCurrentOrderId] = useState<number | null>(null);

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
  }, []);

  async function loadFragments() {
    try {
      const res = await fetch(`${API_BASE}/api/fragments/`);
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
      const res = await fetch(`${API_BASE}/api/co-creation/`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      // silent
    }
  }

  async function handleAnalyze() {
    if (!userAName.trim() || !userBName.trim() || !projectType.trim()) {
      toast('请填写双方姓名和项目类型', 'error');
      return;
    }
    if (selectedA.length < 2 || selectedB.length < 2) {
      toast('每人至少需要选择2个碎片', 'error');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/co-creation/analyze`, {
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
        toast('合拍分析完成！', 'success');
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

  // VIP弹窗 - 温柔叙事风格
  const PaywallModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPaywall(false)}>
      <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 text-center" onClick={e => e.stopPropagation()}>
        <div className="text-4xl mb-3">🗺️</div>
        <h3 className="text-lg font-bold text-warm-dark mb-2">一起，看见这条路</h3>
        <p className="text-sm text-warm-dark/60 mb-4">
          如果准备好了，我们可以把刚才的发现，变成一张属于你们的拼图地图。
          <br/><span className="text-xs text-warm-dark/40">（3天冷静期内可随时退款）</span>
        </p>
        
        {/* 价值展示 */}
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
        
        {/* 价格与说明 */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-warm-accent">¥9.9</div>
          <p className="text-xs text-warm-dark/40 mt-1">这是你们的第一笔共同投资</p>
        </div>
        
        {/* 双人确认提示 */}
        <div className="bg-amber-50 rounded-lg p-3 mb-4">
          <p className="text-xs text-amber-700">
            💡 建议双方AA或提前商量好由谁出资，
            让这个决定成为你们共同选择的一部分。
          </p>
        </div>
        
        <button
          onClick={async () => {
            // 第一步：创建订单（发起人）
            if (!result) return;
            try {
              const res = await fetch(`${API_BASE}/api/co-creation-orders/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  co_creation_id: result.id,
                  initiator_id: 1, // TODO: 当前用户ID
                  initiator_name: userAName || '甲方',
                  partner_name: userBName || '乙方',
                  amount: 9.9,
                }),
              });
              const data = await res.json();
              if (data.success) {
                setCurrentOrderId(data.data.id);
                setOrderStatus('pending_partner');
                toast(`已邀请 ${userBName || '对方'} 确认`, 'success');
              } else {
                toast(data.detail || '创建订单失败', 'error');
              }
            } catch {
              toast('创建订单失败', 'error');
            }
            setShowPaywall(false);
          }}
          className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl text-sm font-medium hover:opacity-90"
        >
          我们准备好了 💫
        </button>
        <button
          onClick={() => setShowPaywall(false)}
          className="w-full py-2 text-sm text-warm-dark/40 mt-2 hover:text-warm-dark/60"
        >
          再想想，没关系
        </button>
      </div>
    </div>
  );

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
        <h1 className="text-2xl font-bold text-warm-dark">🤝 合拍分析</h1>
        <p className="text-sm text-warm-dark/50 mt-1">两个人，一堆碎片，能拼出什么？</p>
      </div>

      {/* 输入表单 */}
      <div className="rounded-2xl bg-white/80 border border-warm-dark/10 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-warm-dark/60 mb-1 block">甲方姓名</label>
            <input
              value={userAName}
              onChange={e => setUserAName(e.target.value)}
              placeholder="如：张三"
              className="w-full px-4 py-2.5 rounded-xl border border-warm-dark/10 bg-warm-light/50 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-warm-dark/60 mb-1 block">乙方姓名</label>
            <input
              value={userBName}
              onChange={e => setUserBName(e.target.value)}
              placeholder="如：李四"
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
          <div className="text-center py-8 text-warm-dark/40">加载碎片中...</div>
        ) : fragments.length === 0 ? (
          <EmptyState icon="🧩" title="还没有碎片" description="先去碎片页添加一些碎片吧" />
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-medium text-warm-dark/60">选择碎片（每人至少2个）</p>
            
            {/* 甲方碎片 */}
            <div>
              <p className="text-xs text-warm-dark/40 mb-2">{userAName || '甲方'}的碎片（已选{selectedA.length}个）</p>
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
              <p className="text-xs text-warm-dark/40 mb-2">{userBName || '乙方'}的碎片（已选{selectedB.length}个）</p>
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
          {analyzing ? '🔮 分析中...' : '🤝 开始合拍分析'}
        </button>
      </div>

      {/* 分析结果 */}
      {result && (
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
            <h4 className="text-sm font-medium text-warm-dark/60 mb-2">✅ 契合潜力因素</h4>
            <div className="space-y-1">
              {(result.result.potential_factors || []).map((f, i) => (
                <p key={i} className="text-sm text-warm-dark/70">{f}</p>
              ))}
            </div>
          </div>

          {/* 建议 */}
          <div>
            <h4 className="text-sm font-medium text-warm-dark/60 mb-2">💡 建议</h4>
            <div className="space-y-1">
              {result.result.recommendations.map((r, i) => (
                <p key={i} className="text-sm text-warm-dark/70">{r}</p>
              ))}
            </div>
          </div>

          {/* 方向 */}
          <div>
            <h4 className="text-sm font-medium text-warm-dark/60 mb-2">🎯 方向</h4>
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
                    🗺 生成行进地图（VIP）
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
          <h3 className="text-sm font-medium text-warm-dark/60">历史合拍分析</h3>
          {history.map(h => (
            <div key={h.id} className="rounded-xl bg-white/60 border border-warm-dark/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-warm-dark">{h.user_a_name} × {h.user_b_name}</p>
                  <p className="text-xs text-warm-dark/40">{h.project_type} · 契合潜力值{h.potential_score ?? 0}%</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${riskColor[h.risk_level as keyof typeof riskColor]}`}>
                    {riskText[h.risk_level as keyof typeof riskText]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 存档纪念入口 */}
      <div className="rounded-xl bg-warm-light/30 border border-warm-dark/5 p-4 text-center">
        <p className="text-sm text-warm-dark/50 mb-2">如果这段关系已经结束...</p>
        <button
          onClick={() => {
            const note = prompt('留下一段纪念留言（可选）：');
            if (note !== null) {
              toast('已存档为纪念地图。这段旅程值得被记住。', 'info');
            }
          }}
          className="text-xs px-4 py-2 bg-warm-dark/5 text-warm-dark/60 rounded-full hover:bg-warm-dark/10 transition-colors"
        >
          🕯️ 存档纪念地图
        </button>
        <p className="text-xs text-warm-dark/30 mt-2">存档后地图将被保留，但不再活跃</p>
      </div>

      {/* VIP弹窗 */}
      {showPaywall && <PaywallModal />}
    </div>
  );
}
