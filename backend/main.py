"""拼图融合引擎 - FastAPI 入口"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, journal, fragment, fusion, template, checkin, analytics, inspirations, smart_log, gap, cooccurrence

app = FastAPI(title="拼图融合引擎 API", version="0.1.0")

# 跨域配置（允许前端开发服务器访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 导入模型（确保建表）
import models.analytics  # noqa: F401
import models.inspiration  # noqa: F401

# 注册路由
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(journal.router, prefix="/api/journal", tags=["日记"])
app.include_router(fragment.router, prefix="/api/fragments", tags=["碎片"])
app.include_router(fusion.router, prefix="/api/fusions", tags=["融合"])
app.include_router(template.router, prefix="/api/templates", tags=["模板"])
app.include_router(checkin.router, prefix="/api/checkins", tags=["打卡"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["埋点"])
app.include_router(inspirations.router, prefix="/api/inspirations", tags=["灵感集"])
app.include_router(smart_log.router, prefix="/api/smart-log", tags=["智能输入"])
app.include_router(gap.router, prefix="/api/gap", tags=["缺口识别"])
app.include_router(cooccurrence.router, prefix="/api/cooccurrence", tags=["智能组块"])


@app.get("/api/health")
async def health():
    """健康检查端点"""
    return {"status": "ok"}