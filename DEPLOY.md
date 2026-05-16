# 拼图融合引擎 — 部署指南

## 前端部署（Vercel）

### 方式一：GitHub自动部署（推荐）

1. 访问 https://vercel.com/new
2. 导入 GitHub 仓库 `chenruo4-beep/puzzle-fusion-engine`
3. 配置：
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. 添加环境变量：
   - `NEXT_PUBLIC_API_URL` = `https://你的后端地址`
5. 点击 Deploy

### 方式二：Vercel CLI

```bash
# 登录
vercel login

# 部署
cd D:\projects\puzzle-fusion-engine
vercel --prod
```

## 后端部署（Render/Railway/阿里云）

项目使用 FastAPI + SQLite，推荐部署到：
- **Render** (免费): https://render.com
- **Railway** (免费额度): https://railway.app
- **阿里云函数计算** (国内访问快)

### Render部署步骤

1. 访问 https://dashboard.render.com
2. New → Web Service
3. 连接 GitHub 仓库
4. 配置：
   - Runtime: Python 3
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
5. 添加环境变量（如有API Key等）

## 当前状态

- ✅ GitHub: https://github.com/chenruo4-beep/puzzle-fusion-engine
- ⏳ Vercel前端: 待部署
- ⏳ 后端API: 待部署

## 注意事项

1. SQLite在Vercel等无服务器环境不可写，生产环境建议：
   - 使用 PostgreSQL (Render提供)
   - 或迁移到 Supabase/Firebase
2. 前端构建时已配置 API 代理，开发时自动指向 localhost:8000
3. 生产环境需设置 `NEXT_PUBLIC_API_URL` 指向实际后端地址
