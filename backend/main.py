"""拼拼看Me - FastAPI 入口"""

import time
import warnings
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from logging_config import setup_logging, get_logger
from config import settings
from security import (
    setup_rate_limiting,
    SecurityHeadersMiddleware,
    RequestSizeLimitMiddleware,
)
from sentry_init import init_sentry

# ---------- Sentry（可选）----------
# 如需启用 Sentry 错误监控：
#   1. pip install sentry-sdk
#   2. 在 .env 中填写 SENTRY_DSN
#   3. 取消下方三行的注释
# import sentry_sdk
# sentry_sdk.init(dsn=settings.SENTRY_DSN, environment=settings.SENTRY_ENVIRONMENT)
# logger.info("Sentry 已初始化", extra={"sentry_dsn": settings.SENTRY_DSN[:24] + "..." if settings.SENTRY_DSN else "未配置"})

logger = get_logger(__name__)
from routers import auth, journal, fragment, fusion, template, checkin, analytics, inspirations, smart_log, gap, cooccurrence, journey_map, co_creation, co_creation_order, habit, feedback, suggestions, failure, profile, imports, fusion_diary, billing, password_reset, search, invites, push, ai_provider, community
from routers import email_preferences


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期 — 启动时初始化日志和安全检查、关闭时清理"""
    setup_logging()
    logger.info("应用启动", extra={"http": {"log_level": settings.LOG_LEVEL}})

    # Sentry 错误监控（可选，DSN 为空则跳过）
    init_sentry()

    # 安全检查
    try:
        settings.check_security()
    except RuntimeError as e:
        logger.error(str(e))
        raise

    yield
    logger.info("应用关闭")


app = FastAPI(title="拼拼看Me API", version="0.1.0", lifespan=lifespan)

# ====== 安全中间件（顺序重要：最外层最先执行）======

# 1. 请求大小限制
app.add_middleware(RequestSizeLimitMiddleware)

# 2. 安全响应头
app.add_middleware(SecurityHeadersMiddleware)

# 3. 跨域配置（根据环境收紧）
if settings.ENVIRONMENT == "production":
    # 生产环境：只允许指定域名
    allowed_origins = os.getenv("CORS_ORIGINS", "").split(",")
    if not allowed_origins or allowed_origins == [""]:
        warnings.warn("⚠️ 生产环境未设置 CORS_ORIGINS，CORS 将拒绝所有跨域请求")
        allowed_origins = []
else:
    # 开发环境：允许本地开发服务器
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "https://servicewechat.com",  # 微信小程序 WebView
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Rate Limiting（依赖 slowapi，未安装则跳过）
setup_rate_limiting(app)

# ====== 请求日志中间件 ======


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """记录每个请求的 method / path / status / duration"""
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000

    if request.url.path != "/api/health":  # 健康检查不记日志，减少噪音
        logger.info(
            "请求处理完成",
            extra={
                "http": {
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                }
            },
        )
    return response


# ====== 全局异常处理器 ======

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Pydantic 校验失败 → JSON 错误响应"""
    logger.warning(
        "请求参数校验失败",
        extra={
            "http": {"method": request.method, "path": request.url.path, "status": 422},
            "error": {"type": "validation_error", "detail": exc.errors()},
        },
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "message": "请求参数校验失败"},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """未捕获异常 → JSON 500 响应（不暴露内部细节）"""
    logger.error(
        "未捕获异常",
        extra={
            "http": {"method": request.method, "path": request.url.path, "status": 500},
            "error": {"type": type(exc).__name__, "message": str(exc)},
        },
        exc_info=True,
    )
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
import models.email_preference  # noqa: F401
import models.community  # noqa: F401

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
app.include_router(password_reset.router, prefix="/api/auth", tags=["密码重置"])
app.include_router(email_preferences.router, tags=["邮件偏好"])
app.include_router(invites.router, tags=["邀请"])
app.include_router(search.router, prefix="/api/search", tags=["语义搜索"])
app.include_router(invites.router, tags=["邀请"])
app.include_router(invites.router, tags=["邀请裂变"])
app.include_router(push.router, prefix="/api/push", tags=["推送"])
app.include_router(ai_provider.router, tags=["AI Provider"])
app.include_router(community.router, prefix="/api", tags=["社区"])


@app.get("/api/health")
async def health():
    """健康检查端点"""
    return {"status": "ok"}
