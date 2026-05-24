# CLAUDE.md — 拼拼看Me

## 项目概述

**产品名**：拼拼看Me (PinPinKanMe)
**一句话**：把你散落的能力碎片，拼成能变现的完整作品。
**目标用户**：副业探索者（想做副业但不知道从哪入手的人）

### 核心隐喻
> 大部分拼图只看正面图案，我们把拼图的**背面也利用起来**——碎片不仅是技能列表，每块碎片背后有故事、经历、上下文。

---

## 双面架构

```
第一面（日记/知识库）              第二面（碎片/融合）
━━━━━━━━━━━━━━━━━━━              ━━━━━━━━━━━━━━━━━
📝 每日记录                       🧩 碎片页面
📚 知识库                         ⚡ 融合引擎

       ↓ AI自动连接 ↓
  每天写完 → AI扫描 → 检测碎片 → 一键确认 → 进入第二面
```

---

## 技术栈

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14 (App Router) | SEO友好，内容型产品 |
| Tailwind CSS | latest | UI样式 |
| Zustand | latest | 状态管理 |
| Framer Motion | latest | 拼图融合动画 |
| Recharts | latest | 碎片增长曲线 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | latest | REST API |
| PostgreSQL | latest | 主数据库 |
| Qdrant | latest | 向量检索（碎片相似度） |
| Celery + Redis | latest | 异步任务（融合/推送） |
| Supabase Auth | latest | 用户认证 |

### 开发环境
- Node: v22.16.0
- Python: 3.12.7 (位于 D:\Python\python.exe)
- 项目根: D:\projects\puzzle-fusion-engine

---

## 设计系统

### 配色（Kindle暖色系）
```
主色：深灰 #3c3a37（标题/导航）
辅色：米白 #f5f0eb（卡片背景）
强调：暖橙 #b8a088（按钮/高亮/选中）
背景：暖灰 #e8e0d5（页面背景）
成功：橄榄绿 #5a7a5a
```

### 字体
- 系统默认中文：-apple-system, "PingFang SC", "Microsoft YaHei"
- 标题可用思源宋体 Noto Serif SC

### UI隐喻
- 碎片 = 拼图片（带凹凸形状）
- 未融合 = 发光边框
- 融合中 = 碎片飞向中心旋转动画
- 融合完成 = 新拼图弹出 + 金句展示

---

## 数据库Schema

### Fragment（碎片）
```sql
CREATE TABLE fragments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 技能/爱好/习惯/能力/知识点/经历
    content TEXT NOT NULL,
    source_journal_id UUID REFERENCES journal_entries(id),  -- 来源日记
    tags TEXT[] DEFAULT '{}',
    embedding VECTOR(1536),
    fusion_count INT DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

### JournalEntry（日记/知识库）
```sql
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    extracted_fragment_ids UUID[] DEFAULT '{}',  -- AI从中提取的碎片
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Fusion（融合记录）
```sql
CREATE TABLE fusions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    fragment_ids UUID[] NOT NULL,
    trigger_type VARCHAR(50) DEFAULT 'manual',  -- manual/auto/scheduled
    cutting_result JSONB,
    collision_result JSONB,
    output_type VARCHAR(50),
    output_content TEXT,
    quality_score INT CHECK(quality_score BETWEEN 1 AND 5),
    confidence FLOAT CHECK(confidence BETWEEN 0 AND 1),
    sources UUID[],
    used_blades VARCHAR(50)[],
    created_at TIMESTAMP DEFAULT NOW()
);
```

### CheckIn（行动打卡）
```sql
CREATE TABLE checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    fusion_id UUID REFERENCES fusions(id) NOT NULL,
    action_index INT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    feedback TEXT,
    new_fragment_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Template（预置模板）
```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) NOT NULL,  -- emoji
    description TEXT,
    fragments JSONB NOT NULL,  -- [{type, content, tags}]
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6个职业模板碎片

| 模板 | 图标 | 碎片数 | 碎片列表 |
|------|------|--------|---------|
| 外卖骑手 | 🛵 | 10 | 熟悉城市路线、会骑电动车、每天跑单10h+、会用导航APP、体力好、时间灵活、熟悉商家位置、会简单维修（车子）、抗压能力强、每天接触不同人 |
| 程序员 | 💻 | 10 | Python、SQL、解决问题能力、逻辑思维、加班习惯、GitHub、算法基础、沟通能力、项目管理、持续学习 |
| 销售 | 🏪 | 8 | 说服能力、抗压能力、客户关系管理、目标导向、沟通能力、产品知识、谈判技巧、时间管理 |
| 宝妈 | 👶 | 8 | 时间管理、多任务处理、耐心、教育知识、采购能力、社交网络、财务管理、烹饪技能 |
| 老师 | 👩‍🏫 | 8 | 知识传授、课程设计、学生管理、沟通能力、学科知识、评估能力、耐心、公开演讲 |
| 自由职业者 | 🎨 | 8 | 自驱力、项目管理、时间自由、主动获客、一人多职、持续学习、抗压能力、自律习惯 |

---

## API设计（RESTful）

```
# 认证
POST   /api/auth/register
POST   /api/auth/login

# 日记
GET    /api/journal              # 日记列表（分页）
POST   /api/journal              # 写日记
GET    /api/journal/:id          # 日记详情
DELETE /api/journal/:id          # 删除日记
POST   /api/journal/:id/extract  # AI提取碎片

# 碎片
GET    /api/fragments            # 碎片列表
POST   /api/fragments            # 手动添加碎片
GET    /api/fragments/:id        # 碎片详情
DELETE /api/fragments/:id        # 删除碎片

# 模板
GET    /api/templates            # 模板列表
POST   /api/templates/:id/apply  # 应用模板（导入碎片）

# 融合
POST   /api/fusions              # 创建融合（指定碎片ID列表）
GET    /api/fusions/:id          # 融合结果

# 打卡
POST   /api/checkins/:id/complete  # 标记完成
POST   /api/checkins/:id/feedback  # 写反馈

# 用户
GET    /api/user/profile         # 用户信息
GET    /api/user/stats           # 统计（碎片数/融合数/完成数）
```

---

## 前端路由（Next.js App Router）

```
/                       → Landing Page
/onboarding             → 职业选择 + 碎片确认（Step 1-2）
/dashboard              → 主界面
/dashboard/journal      → 第一面：日记列表 + 写日记
/dashboard/journal/[id] → 日记详情（含提取的碎片）
/dashboard/fragments    → 第二面：碎片库
/dashboard/fusion       → 融合页面（选碎片→融合→结果）
/dashboard/fusion/[id]  → 融合结果详情
/dashboard/history      → 融合历史 + 碎片增长
/dashboard/settings     → 设置（可选刃/模板管理）
```

---

## 前端组件树

```
Layout
├── LandingPage
│   ├── HeroSection
│   ├── PainPointSection
│   ├── ConceptSection
│   ├── CaseStudySection
│   ├── FeatureGrid
│   ├── ChatGPTComparison
│   ├── PricingSection
│   └── CTASection
│
├── OnboardingLayout
│   ├── StepIndicator (1/3, 2/3)
│   ├── ProfessionSelector (6 cards grid)
│   └── FragmentConfirmer (碎片确认列表)
│
└── DashboardLayout
    ├── SideNav (日记 | 碎片 | 融合 | 历史)
    ├── JournalPage
    │   ├── JournalInput (今天做了什么/学了什么)
    │   ├── JournalList (时间线)
    │   └── FragmentExtractor (AI提取结果弹窗)
    ├── FragmentPage
    │   ├── FragmentGrid (拼图片网格)
    │   ├── FragmentCard
    │   │   ├── type icon + content + tags + fusion_count
    │   │   └── source_journal_link (来源日记链接)
    │   └── AddFragmentModal
    ├── FusionPage
    │   ├── FragmentPicker (选择要融合的碎片)
    │   ├── FusionAnimation (碎片飞向中心旋转)
    │   ├── FusionResult
    │   │   ├── QuoteDisplay (金句，暖橙色大字)
    │   │   ├── ConfidenceBadge (信心度%)
    │   │   ├── SourceTags (引用来源标签)
    │   │   ├── DirectionCards (融合方向×3)
    │   │   └── ActionChecklist (可勾选行动清单)
    │   └── SaveButton / ReFusionButton
    └── HistoryPage
        ├── MonthSelector
        ├── FragmentGrowthChart (折线图)
        └── FusionHistoryList
```

---

## 当前状态：Week 1 开发

### 目标
搭建项目骨架 + 实现注册登录 + 职业选择 + 碎片确认流程

### 具体任务
1. [ ] 前端：Next.js 14 项目初始化（Tailwind + Zustand + Framer Motion）
2. [ ] 后端：FastAPI 项目初始化
3. [ ] 数据库：创建所有表 + 录入6个模板数据
4. [ ] 功能：注册/登录页（邮箱+密码）
5. [ ] 功能：职业选择页（6卡片网格）
6. [ ] 功能：碎片确认页（10-12碎片确认/删除）
7. [ ] 功能：碎片确认后跳转到dashboard
8. [ ] 设计：暖色系主题配置（Tailwind colors + CSS变量）

### 成功标准
- 用户能注册 → 选职业 → 确认碎片 → 进入dashboard
- 所有页面使用暖色系配色
- 响应式设计（移动端优先）

---

## 代码风格

### TypeScript
- 严格模式
- 函数组件 + 类型注解
- 文件命名：kebab-case

### Python
- type hints everywhere
- Pydantic models for API
- 文件命名：snake_case

### 通用
- 中文注释
- 功能模块化，单一职责
- 先写能跑的，再优化