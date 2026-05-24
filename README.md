# 拼拼看Me

个人认知融合引擎 — 通过碎片化的经历、技能、性格，发现个人发展的方向。

## 快速启动

### 后端

```bash
cd backend
pip install -r requirements.txt
python init_db.py     # 首次运行：建表
python -m uvicorn main:app --reload  # http://localhost:8000
```

### 前端

```bash
cd frontend
npm install
cp .env.example .env.local  # 编辑 API 地址
npm run dev                  # http://localhost:3000
```

## Docker 部署

```bash
# SQLite（单容器，无外部依赖）
docker compose up -d

# PostgreSQL（生产级）
docker compose -f docker-compose.yml -f docker-compose.pg.yml up -d
```

## Vercel 部署（前端）

1. 连接 GitHub 仓库
2. 设置 `NEXT_PUBLIC_API_URL` 为后端地址
3. 部署

## 测试

```bash
cd backend
python -m pytest tests/ -v     # 113 tests
```

## 架构

- **后端**: FastAPI + SQLAlchemy + 内置 AI 融合引擎
- **前端**: Next.js 14 + Tailwind CSS + Framer Motion
- **认证**: JWT (HS256, 7天过期)
- **AI**: 内置规则引擎（无需外部 API），可选 External Provider 兜底
