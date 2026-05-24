"""拼拼看Me - FastAPI 入口"""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)
from routers import auth, journal, fragment, fusion, template, checkin, analytics, inspirations, smart_log, gap, cooccurrence, journey_map, co_creation, co_creation_order, habit, feedback, suggestions, failure, profile, imports, fusion_diary, billing

app = FastAPI(title="拼拼看Me API", version="0.1.0")

# 跨域配置（允许前端开发服务器 + 小程序开发工具访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "https://servicewechat.com",  # 微信小程序 WebView
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====== 全局异常处理器 ======

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Pydantic 校验失败 → JSON 错误响应"""
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "message": "请求参数校验失败"},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """未捕获异常 → JSON 500 响应（不暴露内部细节）"""
    logger.error("未捕获异常: %s %s | %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误"},
    )


# 导入模型（确保建表）
import models.analytics  # noqa: F401
import models.inspiration  # noqa: F401
import models.journey_map  # noqa: F401
import models.co_creation  # noqa: F401
import models.co_creation_order  # noqa: F401
import models.habit  # noqa: F401
import models.failure  # noqa: F401
import models.feedback  # noqa: F401
import models.fusion_diary  # noqa: F401

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
app.include_router(journey_map.router, prefix="/api/journey-maps", tags=["行进地图"])
app.include_router(co_creation.router, prefix="/api/co-creation", tags=["合拍"])
app.include_router(co_creation_order.router, prefix="/api/co-creation-orders", tags=["合拍订单"])
app.include_router(habit.router, prefix="/api/habits", tags=["微习惯"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["反馈"])
app.include_router(suggestions.router, prefix="/api/suggestions", tags=["反向确认"])
app.include_router(failure.router, prefix="/api", tags=["失败飞轮"])
app.include_router(profile.router, prefix="/api", tags=["认知画像"])
app.include_router(imports.router)  # 前缀已在 router 定义中: /api/fragments/import
app.include_router(fusion_diary.router, prefix="/api/fusion-diaries", tags=["融合日记"])
app.include_router(billing.router, prefix="/api/billing", tags=["计费"])


@app.get("/api/health")
async def health():
    """健康检查端点"""
    return {"status": "ok"}
