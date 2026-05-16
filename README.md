# 拼图融合引擎 - 快速启动指南

## 前置条件
- Node.js v22.16.0+ ✅
- Python 3.12.7+ ✅
- Claude Code CLI 已安装

## 启动Claude Code开发

打开终端（PowerShell），运行：

```powershell
cd D:\projects\puzzle-fusion-engine
claude
```

Claude Code会自动读取当前目录的 `CLAUDE.md` 作为项目上下文。

## 第一周开发任务（复制给Claude Code）

```
请帮我搭建拼图融合引擎项目骨架，按以下顺序：

1. 前端初始化
   - 创建 Next.js 14 项目（App Router + TypeScript + Tailwind CSS）
   - 配置暖色系主题（#3c3a37 #f5f0eb #b8a088 #e8e0d5）
   - 安装依赖：zustand framer-motion recharts

2. 后端初始化
   - 创建 FastAPI 项目（Python 3.12.7，路径 D:\Python\python.exe）
   - 配置 PostgreSQL 连接（本地或Docker）
   - 安装依赖：fastapi uvicorn sqlalchemy pgvector qdrant-client celery redis

3. 数据库
   - 运行 schemas.sql 创建所有表（fragments/journal_entries/fusions/checkins/templates）
   - 录入6个职业模板数据

4. 第一个功能：注册+职业选择+碎片确认
   - 前端：注册页 + 职业选择页（6卡片） + 碎片确认页
   - 后端：POST /api/auth/register + GET /api/templates + POST /api/templates/:id/apply
   - 完成后可注册 → 选职业 → 确认碎片 → 进入dashboard

请开始吧，有问题随时问。
```

## 目录结构（规划）

```
D:\projects\puzzle-fusion-engine\
├── CLAUDE.md          # ← Claude Code 项目上下文（已创建）
├── 执行方案_v1.2.md   # ← 完整执行方案（已复制）
├── LandingPage_v2.2.md # ← Landing Page文案（已复制）
├── frontend\          # ← Next.js 14 项目（待创建）
├── backend\           # ← FastAPI 项目（待创建）
└── shared\            # ← 共享类型/工具（待创建）
```

## 当前状态

前期准备 ✅ → 搭建骨架 🔄 → 功能开发 ⏳

---
生成时间：2026-05-12
作者：Ruo Chen + QClaw AI
