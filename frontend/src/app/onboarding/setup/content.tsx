'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const fragmentTemplates: Record<string, { type: string; content: string }[]> = {
  waimai: [
    { type: '技能', content: '熟悉城市路线（3年+骑手经验）' },
    { type: '技能', content: '会骑电动车，能处理一般故障' },
    { type: '习惯', content: '每天跑单10-14小时' },
    { type: '技能', content: '熟练使用多个导航APP' },
    { type: '能力', content: '体力好，能连续工作' },
    { type: '能力', content: '时间相对灵活，能自己排班' },
    { type: '技能', content: '熟悉区域内商家位置和出餐规律' },
    { type: '技能', content: '客户投诉处理经验丰富' },
    { type: '能力', content: '抗压能力强，能应对高峰期' },
    { type: '经历', content: '每天接触不同类型的客户' },
    { type: '性格', content: '吃苦耐劳，不挑单' },
    { type: '资源', content: '认识区域内很多商家老板' },
    { type: '技能', content: '会算配送最优路线' },
    { type: '知识', content: '了解各平台规则和算法' },
    { type: '经历', content: '处理过很多特殊配送需求' },
    { type: '能力', content: '同时处理多单不慌乱' },
    { type: '习惯', content: '善于总结每天的跑单效率' },
  ],
  programmer: [
    { type: '技能', content: 'Python编程' },
    { type: '技能', content: 'SQL数据库查询和优化' },
    { type: '能力', content: '解决问题能力强' },
    { type: '能力', content: '逻辑思维严密' },
    { type: '习惯', content: '加班写代码是常态' },
    { type: '技能', content: 'GitHub协作和代码审查' },
    { type: '知识', content: '算法和数据结构基础' },
    { type: '能力', content: '技术文档阅读能力' },
    { type: '技能', content: 'API设计和接口文档编写' },
    { type: '习惯', content: '持续学习新技术（每天刷技术博客）' },
    { type: '知识', content: '前端或后端某一领域深入' },
    { type: '能力', content: '远程办公经验丰富' },
    { type: '技能', content: '使用AI编程工具提高效率' },
    { type: '经历', content: '经历过项目deadline高压' },
    { type: '性格', content: '追求代码质量和细节' },
    { type: '知识', content: '了解产品思维和用户体验' },
    { type: '资源', content: '有一些技术人脉和社群' },
  ],
  sales: [
    { type: '能力', content: '说服能力强，能快速建立信任' },
    { type: '能力', content: '抗压能力强，屡败屡战' },
    { type: '技能', content: '客户关系管理（CRM）' },
    { type: '能力', content: '目标导向，不达目标不罢休' },
    { type: '能力', content: '沟通表达清晰有感染力' },
    { type: '知识', content: '熟悉所售产品的每一个细节' },
    { type: '技能', content: '商务谈判和价格博弈' },
    { type: '能力', content: '时间管理，善于分配客户跟进优先级' },
    { type: '经历', content: '见过各种类型的客户' },
    { type: '习惯', content: '每天整理客户信息，复盘跟进情况' },
    { type: '资源', content: '有一定客户积累' },
    { type: '性格', content: '主动热情，不怯场' },
    { type: '技能', content: '会做销售演示和PPT' },
    { type: '知识', content: '了解行业市场和竞争对手' },
    { type: '能力', content: '处理客户投诉和售后问题' },
  ],
  mom: [
    { type: '能力', content: '时间管理：能在碎片时间完成多项任务' },
    { type: '能力', content: '多任务并行处理能力强' },
    { type: '能力', content: '有耐心，善于倾听和安抚' },
    { type: '知识', content: '育儿经验（0-12岁各阶段）' },
    { type: '技能', content: '家庭采购和性价比判断' },
    { type: '能力', content: '有本地妈妈社群和邻居关系网络' },
    { type: '技能', content: '家庭财务管理和预算控制' },
    { type: '技能', content: '烹饪：一日三餐变着花样做' },
    { type: '经历', content: '经历过孩子生病、升学等关键节点' },
    { type: '能力', content: '善于发现孩子的需求和情绪' },
    { type: '习惯', content: '记录孩子成长和日常点滴' },
    { type: '性格', content: '细心、观察力强' },
    { type: '资源', content: '认识学校老师和其他家长' },
    { type: '技能', content: '会用手机处理各种事务' },
    { type: '习惯', content: '见缝插针学习新知识' },
  ],
  teacher: [
    { type: '技能', content: '知识传授：能把复杂内容讲得通俗易懂' },
    { type: '技能', content: '课程设计和教案编写' },
    { type: '技能', content: '学生管理和课堂纪律控制' },
    { type: '能力', content: '沟通表达能力强，有感染力' },
    { type: '知识', content: '某一学科的专业知识' },
    { type: '技能', content: '学习效果评估和反馈' },
    { type: '能力', content: '有耐心，不轻易对学生发火' },
    { type: '技能', content: '公开演讲和课堂呈现' },
    { type: '经历', content: '带过不同类型的学生' },
    { type: '习惯', content: '每天备课、批改作业' },
    { type: '性格', content: '善于鼓励学生，发现他们的优点' },
    { type: '知识', content: '了解教育心理学基础' },
    { type: '资源', content: '有学校和家长资源' },
    { type: '习惯', content: '持续学习，更新知识' },
    { type: '技能', content: '会用各种在线教学工具' },
  ],
  freelancer: [
    { type: '能力', content: '自驱力：不需要别人催就能干活' },
    { type: '技能', content: '项目管理和时间规划' },
    { type: '能力', content: '时间自由，能自己安排工作节奏' },
    { type: '技能', content: '主动获客：能找到并说服客户' },
    { type: '能力', content: '一人多职：做得了销售也做得了交付' },
    { type: '习惯', content: '持续学习新技能' },
    { type: '能力', content: '抗压：单子少或客户挑剔时不崩' },
    { type: '习惯', content: '自律：在家也能高效工作' },
    { type: '经历', content: '和各种类型的客户打过交道' },
    { type: '资源', content: '有一些老客户关系' },
    { type: '性格', content: '独立，不喜欢被管' },
    { type: '技能', content: '会用AI工具提高效率' },
    { type: '知识', content: '了解自由职业税务和合同知识' },
    { type: '能力', content: '谈判：争取合理报酬' },
    { type: '习惯', content: '每天记录工作量和收入' },
  ],
  shopkeeper: [
    { type: '技能', content: '商品采购和供应链管理' },
    { type: '技能', content: '客户接待和销售转化' },
    { type: '技能', content: '店铺日常运营管理' },
    { type: '技能', content: '库存管理和盘点' },
    { type: '技能', content: '收银和账目核算' },
    { type: '能力', content: '成本控制，精打细算' },
    { type: '能力', content: '处理客户投诉和售后' },
    { type: '经历', content: '了解本地消费者习惯和需求' },
    { type: '资源', content: '有进货渠道和供应商关系' },
    { type: '资源', content: '认识周边商家，互相带客' },
    { type: '性格', content: '热情好客，会聊天' },
    { type: '知识', content: '了解行业规则和市场竞争' },
    { type: '习惯', content: '早起进货，晚归盘账' },
    { type: '能力', content: '算账快，数字敏感' },
    { type: '经历', content: '经历过淡旺季，有应变经验' },
  ],
  worker: [
    { type: '技能', content: '熟练掌握生产线操作技能' },
    { type: '技能', content: '设备日常维护和简单故障排除' },
    { type: '知识', content: '安全操作规程和劳动保护' },
    { type: '能力', content: '体力好，能适应倒班和高强度' },
    { type: '能力', content: '服从管理，团队协作' },
    { type: '习惯', content: '守时，从不迟到早退' },
    { type: '经历', content: '经历过工厂旺季赶工' },
    { type: '技能', content: '质量检验，能发现次品' },
    { type: '性格', content: '踏实肯干，不偷懒' },
    { type: '知识', content: '了解产品工艺流程' },
    { type: '经历', content: '跟不同岗位的同事都打过交道' },
    { type: '资源', content: '有工厂内部人脉' },
    { type: '能力', content: '执行能力强，领导说干啥就干啥' },
    { type: '习惯', content: '记工作笔记，积累经验' },
    { type: '经历', content: '处理过突发生产问题' },
    { type: '知识', content: '了解劳动法和工人权益' },
  ],
  student: [
    { type: '技能', content: '语言学习能力（中文/意大利语/英语）' },
    { type: '能力', content: '时间管理：能平衡学习和课余时间' },
    { type: '习惯', content: '每天背单词或练口语（坚持30天以上）' },
    { type: '经历', content: '留学经历：适应过新环境文化' },
    { type: '技能', content: '会用Canva/PPT做展示' },
    { type: '能力', content: '社交：认识不少同学和朋友' },
    { type: '经历', content: '做过兼职或实习' },
    { type: '资源', content: '有学校社团和老师关系' },
    { type: '性格', content: '好奇心强，愿意尝试新东西' },
    { type: '习惯', content: '刷短视频了解社会动态' },
    { type: '能力', content: '自学能力强，能自己查资料解决问题' },
    { type: '知识', content: '了解意大利大学申请流程' },
    { type: '经历', content: '帮家人处理过一些事情（翻译/跑腿/协调）' },
    { type: '性格', content: '有想法但不轻易表达' },
    { type: '习惯', content: '关注职业发展和未来规划' },
    { type: '能力', content: '数字工具使用熟练' },
    { type: '知识', content: '了解海外华人社区' },
  ],
};

const professionInfo: Record<string, { icon: string; name: string }> = {
  waimai: { icon: '🏍', name: '外卖骑手' },
  programmer: { icon: '💻', name: '程序员' },
  sales: { icon: '🤝', name: '销售' },
  mom: { icon: '👩', name: '宝妈' },
  teacher: { icon: '👨\u200d🏫', name: '老师' },
  freelancer: { icon: '🚀', name: '自由职业者' },
  shopkeeper: { icon: '🏪', name: '小店主' },
  worker: { icon: '🔧', name: '工厂工人' },
  student: { icon: '📚', name: '学生' },
};

const typeColors: Record<string, string> = {
  '技能': 'bg-[#4a7c9b]',
  '能力': 'bg-[#5a7a5a]',
  '爱好': 'bg-[#b88a9e]',
  '习惯': 'bg-[#c49a6c]',
  '知识': 'bg-[#7a6a9b]',
  '经历': 'bg-[#b8a088]',
  '资源': 'bg-[#7a9b4a]',
  '性格': 'bg-[#9b6c4a]',
};

const TYPE_OPTIONS = ['技能', '能力', '爱好', '习惯', '知识', '经历', '资源', '性格'];

export default function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const professionId = searchParams.get('id') || 'waimai';

  const profession = professionInfo[professionId] || professionInfo['waimai'];
  const templateFragments = fragmentTemplates[professionId] || fragmentTemplates['waimai'];

  const [selectedTemplateIndices, setSelectedTemplateIndices] = useState<Set<number>>(
    () => new Set(templateFragments.map((_, i) => i))
  );
  const [customFragments, setCustomFragments] = useState<{ type: string; content: string }[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState('技能');
  const [newContent, setNewContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const allTemplateSelected = selectedTemplateIndices.size === templateFragments.length;
  const totalSelected = selectedTemplateIndices.size + customFragments.length;
  const canProceed = totalSelected >= 3;

  const toggleFragment = (index: number) => {
    setSelectedTemplateIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (allTemplateSelected) setSelectedTemplateIndices(new Set());
    else setSelectedTemplateIndices(new Set(templateFragments.map((_, i) => i)));
  };

  const addCustom = () => {
    if (!newContent.trim()) return;
    setCustomFragments((prev) => [...prev, { type: newType, content: newContent.trim() }]);
    setNewContent('');
    setShowAddForm(false);
  };

  const removeCustom = (index: number) => {
    setCustomFragments((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (showAddForm && inputRef.current) inputRef.current.focus();
  }, [showAddForm]);

  const handleStart = () => {
    if (!canProceed) return;
    const selected = [
      ...templateFragments.filter((_, i) => selectedTemplateIndices.has(i)).map((f) => ({ type: f.type, content: f.content })),
      ...customFragments,
    ];
    localStorage.setItem('fusionData', JSON.stringify({
      profession: profession.name,
      professionIcon: profession.icon,
      fragments: selected,
    }));
    router.push('/onboarding/welcome');
  };

  return (
    <div className="min-h-screen bg-warm-bg flex flex-col">
      {/* 进度条 - Step 2/2 */}
      <div className="w-full h-1 bg-warm-dark/10">
        <div className="h-full bg-warm-accent w-full transition-all duration-500" />
      </div>

      <div className="p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-warm-dark/60 hover:text-warm-dark transition-colors flex items-center gap-1">← 返回上一步</button>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-warm-dark/15" />
          <span className="w-2 h-2 rounded-full bg-warm-accent" />
          <span className="w-2 h-2 rounded-full bg-warm-dark/15" />
        </div>
      </div>

      <div className="px-6 pb-4 text-center">
        <h1 className="text-2xl font-bold text-warm-dark mb-1">步骤 2/2</h1>
        <p className="text-warm-dark/60">{profession.icon} {profession.name} — 微调你的碎片</p>
        <p className="text-xs text-warm-dark/30 mt-1">已为你预选好碎片，可直接开始融合</p>
      </div>

      <div className="flex-1 px-6 pb-40 overflow-y-auto">
        <div className="space-y-3 max-w-2xl mx-auto">
          <h3 className="text-xs font-medium text-warm-dark/40 px-1">预置碎片 · {templateFragments.length}个（已全选）</h3>
          {templateFragments.map((fragment, index) => {
            const isSelected = selectedTemplateIndices.has(index);
            return (
              <button key={index} onClick={() => toggleFragment(index)}
                className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${isSelected ? 'bg-white shadow-sm border-2 border-warm-accent/30' : 'bg-white/50 border-2 border-transparent opacity-50'}`}>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-white shrink-0 ${typeColors[fragment.type] || 'bg-gray-400'}`}>{fragment.type}</span>
                  <span className={`flex-1 text-sm ${isSelected ? 'text-warm-dark' : 'text-warm-dark/30 line-through'}`}>{fragment.content}</span>
                  {isSelected && <span className="text-warm-accent/50">✓</span>}
                </div>
              </button>
            );
          })}

          <h3 className="text-xs font-medium text-warm-dark/40 px-1 pt-3">你自己的碎片</h3>

          {customFragments.map((f, i) => (
            <div key={`custom-${i}`} className="p-4 rounded-xl bg-white shadow-sm border-2 border-warm-accent/20">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white shrink-0 ${typeColors[f.type] || 'bg-gray-400'}`}>{f.type}</span>
                <span className="flex-1 text-sm text-warm-dark">{f.content}</span>
                <button onClick={() => removeCustom(i)} className="text-warm-dark/30 hover:text-red-400 transition-colors text-lg leading-none">×</button>
              </div>
            </div>
          ))}

          {showAddForm ? (
            <div className="p-4 rounded-xl bg-white shadow-sm border-2 border-warm-accent/30 space-y-3">
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((t) => (
                  <button key={t} onClick={() => setNewType(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${newType === t ? 'text-white ' + (typeColors[t] || 'bg-gray-400') : 'bg-warm-dark/5 text-warm-dark/50 hover:bg-warm-dark/10'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input ref={inputRef} type="text" value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                  placeholder="输入你的碎片，比如：会弹吉他" className="flex-1 px-4 py-2 border border-warm-dark/15 rounded-xl text-sm focus:outline-none focus:border-warm-accent/50 bg-transparent" />
                <button onClick={addCustom} disabled={!newContent.trim()}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${newContent.trim() ? 'bg-warm-accent text-white hover:bg-warm-accent/90' : 'bg-warm-dark/10 text-warm-dark/30 cursor-not-allowed'}`}>
                  添加
                </button>
                <button onClick={() => { setShowAddForm(false); setNewContent(''); }}
                  className="px-4 py-2 rounded-xl text-sm text-warm-dark/40 hover:bg-warm-dark/10 transition-colors">
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddForm(true)}
              className="w-full p-4 rounded-xl border-2 border-dashed border-warm-dark/15 text-warm-dark/40 hover:border-warm-accent/30 hover:text-warm-accent/60 transition-all flex items-center justify-center gap-2 text-sm">
              <span className="text-lg">+</span> 添加你自己的碎片
            </button>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-warm-bg via-warm-bg/95 to-transparent">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-between text-sm">
            <button onClick={toggleAll} className="text-warm-accent hover:text-warm-accent/80 font-medium transition-colors">
              {allTemplateSelected ? '取消全选' : '全选'}
            </button>
            <span className="text-warm-dark/60">已选择 {totalSelected} 个碎片</span>
          </div>
          <button onClick={handleStart} disabled={!canProceed}
            className={`w-full py-4 font-bold text-lg rounded-2xl shadow-lg transition-all duration-300 ${canProceed ? 'bg-warm-accent text-white hover:shadow-xl hover:bg-warm-accent/90 hover:-translate-y-0.5' : 'bg-warm-dark/20 text-warm-dark/40 cursor-not-allowed'}`}>
            {canProceed ? '开始融合 →' : `至少选择 3 个碎片（当前 ${totalSelected} 个）`}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 text-warm-dark/40 font-medium text-sm hover:text-warm-dark transition-colors"
          >
            跳过引导
          </button>
        </div>
      </div>
    </div>
  );
}
