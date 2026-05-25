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
  nurse: [
    { type: '技能', content: '基础护理操作（打针、换药、输液）' },
    { type: '能力', content: '细致观察病人状况变化' },
    { type: '性格', content: '有耐心，能应对反复询问' },
    { type: '习惯', content: '严格执行操作流程和消毒规范' },
    { type: '能力', content: '情绪稳定，面对突发情况不慌乱' },
    { type: '知识', content: '常见疾病护理知识和用药常识' },
    { type: '经历', content: '照顾过不同病种、不同年龄段的病人' },
    { type: '技能', content: '医疗文书记录和交班报告' },
    { type: '能力', content: '共情力强，会安抚病人和家属情绪' },
    { type: '习惯', content: '长时间站立和走动，体能在线' },
    { type: '资源', content: '有医院和医疗行业人脉' },
    { type: '技能', content: '会使用各种医疗设备' },
    { type: '能力', content: '多任务处理：同时照顾多位病人' },
    { type: '知识', content: '了解医保政策和就医流程' },
    { type: '经历', content: '经历过重症监护和精神高压时刻' },
    { type: '性格', content: '细心、负责、有同理心' },
  ],
  admin: [
    { type: '技能', content: '办公软件熟练（Word/Excel/PPT）' },
    { type: '能力', content: '文件整理归档，有条理' },
    { type: '技能', content: '会议组织和会议纪要撰写' },
    { type: '能力', content: '跨部门沟通协调' },
    { type: '习惯', content: '做事有条理，分轻重缓急' },
    { type: '性格', content: '细心，不容易出错' },
    { type: '经历', content: '处理过各种行政事务和突发事件' },
    { type: '知识', content: '了解公司流程和规章制度' },
    { type: '能力', content: '接待访客，接听电话有礼貌' },
    { type: '技能', content: '费用报销和办公用品管理' },
    { type: '习惯', content: '每天做待办清单，做完打勾' },
    { type: '资源', content: '认识公司各部门的人' },
    { type: '能力', content: '信息收集和汇总能力' },
    { type: '知识', content: '档案管理和资料保密意识' },
    { type: '经历', content: '协助组织过公司活动和团建' },
    { type: '性格', content: '稳重、可靠、口风紧' },
  ],
  accountant: [
    { type: '技能', content: '记账、做账、编制财务报表' },
    { type: '能力', content: '数字敏感，不容易算错' },
    { type: '知识', content: '熟悉会计准则和税务法规' },
    { type: '习惯', content: '严谨仔细，每一笔都要对上' },
    { type: '技能', content: 'Excel精通（透视表/VLOOKUP）' },
    { type: '能力', content: '财务分析：能从数字里看出问题' },
    { type: '习惯', content: '月底年底加班赶报表是常态' },
    { type: '知识', content: '了解企业税种和申报流程' },
    { type: '经历', content: '应对过税务稽查或审计' },
    { type: '性格', content: '原则性强，不轻易妥协' },
    { type: '能力', content: '成本控制和预算管理' },
    { type: '经历', content: '帮公司省过钱或发现过财务漏洞' },
    { type: '资源', content: '有财务/税务圈人脉' },
    { type: '技能', content: '会用财务软件（金蝶/用友/SAP）' },
    { type: '性格', content: '耐心、坐得住、细心' },
  ],
  operator: [
    { type: '技能', content: '写公众号/小红书/抖音文案' },
    { type: '能力', content: '数据分析和内容效果复盘' },
    { type: '技能', content: '图片处理和基础设计（Canva/PS）' },
    { type: '能力', content: '网感好，知道什么内容能火' },
    { type: '习惯', content: '每天刷各大平台，研究热门趋势' },
    { type: '知识', content: '了解各平台算法和推荐机制' },
    { type: '经历', content: '运营过至少一个社交账号' },
    { type: '能力', content: '用户互动和社群维护' },
    { type: '技能', content: '短视频拍摄和剪辑' },
    { type: '性格', content: '创意多，脑洞大' },
    { type: '习惯', content: '看到好内容会收藏拆解' },
    { type: '经历', content: '做过活动策划或投放' },
    { type: '能力', content: '排期规划，能同时跟进多个项目' },
    { type: '资源', content: '认识一些博主、KOL、媒介' },
    { type: '知识', content: '了解品牌营销和用户心理' },
    { type: '性格', content: '抗压，能接受数据波动' },
  ],
  driver: [
    { type: '技能', content: '驾驶技术熟练（多年驾龄）' },
    { type: '能力', content: '熟悉城市路线和交通规律' },
    { type: '习惯', content: '守时，从不迟到' },
    { type: '性格', content: '稳重，不开斗气车' },
    { type: '技能', content: '车辆日常检查和简单维护' },
    { type: '能力', content: '规划最优路线能力' },
    { type: '经历', content: '处理过各种路况和突发情况' },
    { type: '习惯', content: '每天出车前检查车况' },
    { type: '知识', content: '了解交通法规和事故处理' },
    { type: '能力', content: '连续驾驶时间长，体力好' },
    { type: '经历', content: '帮人搬过家、拉过货、跑过长途' },
    { type: '性格', content: '靠谱，交办的事让人放心' },
    { type: '资源', content: '认识不少物流和运输行业的人' },
    { type: '能力', content: '有客户服务意识' },
    { type: '经历', content: '遇到过难缠的客户或路霸' },
    { type: '技能', content: '会用导航和物流APP' },
  ],
  chef: [
    { type: '技能', content: '烹饪技术（中餐/西餐/面点）' },
    { type: '能力', content: '刀工好，出餐速度快' },
    { type: '知识', content: '食材鉴别和储存方法' },
    { type: '习惯', content: '保持厨房清洁，注重卫生' },
    { type: '能力', content: '菜品创新和口味搭配' },
    { type: '技能', content: '成本控制和食材损耗管理' },
    { type: '经历', content: '在高峰期同时处理多桌订单' },
    { type: '性格', content: '做事利索，不拖泥带水' },
    { type: '习惯', content: '每天记菜谱和改进心得' },
    { type: '能力', content: '团队协作：和后厨团队配合默契' },
    { type: '知识', content: '了解食品安全法规' },
    { type: '经历', content: '应对过客人投诉或退菜' },
    { type: '资源', content: '有食材供应商关系' },
    { type: '技能', content: '会摆盘，注重菜品卖相' },
    { type: '性格', content: '对自己出品有要求' },
    { type: '能力', content: '体力好，能连续站几小时' },
  ],
  agent: [
    { type: '技能', content: '客户带看和讲解技巧' },
    { type: '能力', content: '谈判议价能力' },
    { type: '知识', content: '了解房产政策和贷款流程' },
    { type: '性格', content: '主动热情，不害怕被拒绝' },
    { type: '习惯', content: '每天回访客户，维护关系' },
    { type: '能力', content: '市场分析和价格判断' },
    { type: '技能', content: '拍照和房源包装' },
    { type: '经历', content: '成交过至少一单' },
    { type: '资源', content: '有一定客户积累' },
    { type: '技能', content: '合同撰写和条款解读' },
    { type: '能力', content: '抗压，能承受几个月不开单' },
    { type: '习惯', content: '每天刷房源，熟悉市场动态' },
    { type: '性格', content: '诚信，不忽悠客户' },
    { type: '经历', content: '处理过纠纷或复杂交易' },
    { type: '能力', content: '服务意识强，客户转介绍率高' },
  ],
  designer: [
    { type: '技能', content: '设计软件熟练（PS/AI/Figma/Sketch）' },
    { type: '能力', content: '审美在线，知道什么是好的设计' },
    { type: '习惯', content: '收藏好的设计作品，拆解学习' },
    { type: '知识', content: '了解色彩、排版、字体基础知识' },
    { type: '经历', content: '做过海报/UI/品牌设计项目' },
    { type: '能力', content: '能理解需求并给出设计方案' },
    { type: '性格', content: '对自己作品有要求，不凑合' },
    { type: '习惯', content: '经常逛设计社区（Behance/站酷/UI中国）' },
    { type: '技能', content: '手绘/插画基础' },
    { type: '能力', content: '沟通能力强，能和甲方或团队对接' },
    { type: '经历', content: '改过很多版最终还是用第一版' },
    { type: '知识', content: '了解印刷和输出规范' },
    { type: '资源', content: '有一些设计圈同行人脉' },
    { type: '性格', content: '耐心，能接受多次修改' },
    { type: '能力', content: '创意发想和视觉表达' },
    { type: '技能', content: '会做动效或简单视频剪辑' },
  ],
  fitness: [
    { type: '技能', content: '健身训练计划设计' },
    { type: '能力', content: '动作示范和教学能力' },
    { type: '知识', content: '人体解剖和运动生理基础' },
    { type: '习惯', content: '规律训练，自律性强' },
    { type: '性格', content: '有感染力，能带动别人' },
    { type: '技能', content: '营养搭配和饮食规划' },
    { type: '经历', content: '帮别人纠正过动作或带过训练' },
    { type: '能力', content: '观察力好，能发现动作偏差' },
    { type: '知识', content: '了解运动损伤预防和康复' },
    { type: '习惯', content: '记录训练数据和身体变化' },
    { type: '资源', content: '有健身房或运动社群关系' },
    { type: '性格', content: '有耐心，能反复教同一个动作' },
    { type: '能力', content: '体能好，能做高难度动作' },
    { type: '经历', content: '自己经历过身材或体能蜕变' },
    { type: '技能', content: '拍运动视频和简单剪辑' },
  ],
  photographer: [
    { type: '技能', content: '摄影技术（构图/用光/色彩）' },
    { type: '能力', content: '善于发现日常中的美' },
    { type: '技能', content: '后期修图（LR/PS）' },
    { type: '习惯', content: '走到哪拍到哪，保持记录习惯' },
    { type: '知识', content: '了解相机和镜头参数' },
    { type: '经历', content: '拍过人像/风景/产品等不同题材' },
    { type: '能力', content: '引导被拍对象摆姿势' },
    { type: '性格', content: '有耐心，愿意等一个瞬间' },
    { type: '资源', content: '有摄影器材和设备' },
    { type: '习惯', content: '经常看优秀摄影作品学习' },
    { type: '技能', content: '视频拍摄和基础稳定器使用' },
    { type: '经历', content: '被客户或朋友夸过照片好看' },
    { type: '能力', content: '场景布置和道具搭配' },
    { type: '知识', content: '了解各平台对图片的要求' },
    { type: '性格', content: '追求细节，不凑合' },
    { type: '技能', content: '会用手机拍摄专业模式' },
  ],
  cs: [
    { type: '能力', content: '耐心倾听客户的问题和投诉' },
    { type: '技能', content: '沟通话术和标准化回复' },
    { type: '能力', content: '情绪稳定，被骂也不急' },
    { type: '习惯', content: '记录每个客户的问题和解决方案' },
    { type: '知识', content: '熟悉产品/服务的所有细节' },
    { type: '性格', content: '有同理心，能站在客户角度想' },
    { type: '技能', content: '打字速度快，能多窗口处理' },
    { type: '经历', content: '解决过棘手投诉和情绪激动的客户' },
    { type: '能力', content: '跨部门协调解决问题' },
    { type: '习惯', content: '每天整理FAQ，提高效率' },
    { type: '知识', content: '了解消费者权益保护法' },
    { type: '资源', content: '有行业客服交流群' },
    { type: '性格', content: '服务意识强，不敷衍' },
    { type: '经历', content: '被客户点名表扬过' },
    { type: '能力', content: '语言表达清晰有礼貌' },
  ],
  hr: [
    { type: '技能', content: '招聘面试和人才评估' },
    { type: '能力', content: '识人：能快速判断人岗匹配度' },
    { type: '知识', content: '了解劳动法和用工政策' },
    { type: '习惯', content: '维护人才库，定期跟进候选人' },
    { type: '能力', content: '沟通协调：平衡公司和员工需求' },
    { type: '性格', content: '公正，不偏袒任何一方' },
    { type: '经历', content: '处理过员工关系或劳动纠纷' },
    { type: '技能', content: '员工培训和绩效考核设计' },
    { type: '习惯', content: '关注行业薪酬动态和市场数据' },
    { type: '能力', content: '数据分析：算薪酬、统计流失率' },
    { type: '资源', content: '有人力资源行业圈子和猎头关系' },
    { type: '性格', content: '保密意识强，口风严' },
    { type: '经历', content: '组织过公司级活动或团建' },
    { type: '知识', content: '了解社保公积金政策和流程' },
    { type: '能力', content: '写作能力：写JD、通知、制度文件' },
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
  nurse: { icon: '🏥', name: '医护/护理' },
  admin: { icon: '📋', name: '行政/文员' },
  accountant: { icon: '💰', name: '会计/财务' },
  operator: { icon: '📱', name: '新媒体运营' },
  driver: { icon: '🚚', name: '物流/司机' },
  chef: { icon: '🍳', name: '餐饮/厨师' },
  agent: { icon: '🏠', name: '房产/中介' },
  designer: { icon: '🎨', name: '设计师/美工' },
  fitness: { icon: '💪', name: '健身/运动' },
  photographer: { icon: '📸', name: '摄影师' },
  cs: { icon: '🎧', name: '客服/售后' },
  hr: { icon: '👥', name: '人力资源' },
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
