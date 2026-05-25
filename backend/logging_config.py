"""结构化日志配置 — JSON 格式输出到 stdout"""

import json
import logging
import sys
import traceback
from datetime import datetime, timezone
from typing import Any, Dict

from config import settings

# 被 JSONFormatter 识别的 extra 键名，超出此列表的 extra 会被忽略
KNOWN_EXTRA_KEYS = {"http", "error", "user_id", "request_id"}


class JSONFormatter(logging.Formatter):
    """将日志行序列化为 JSON 对象，方便日志平台（ELK / Loki）消费"""

    def format(self, record: logging.LogRecord) -> str:
        entry: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # 异常栈信息
        if record.exc_info and record.exc_info[0]:
            entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "value": record.exc_info[1].__class__.__name__ if record.exc_info[1] else None,
                "traceback": "".join(traceback.format_exception(*record.exc_info)).rstrip(),
            }

        # extra 字段（由 logging.debug(msg, extra={...}) 传入）
        for key in KNOWN_EXTRA_KEYS:
            val = getattr(record, key, None)
            if val is not None:
                entry[key] = val

        return json.dumps(entry, ensure_ascii=False)


_console_handler: logging.Handler | None = None


def _create_handler() -> logging.Handler:
    global _console_handler
    if _console_handler is not None:
        return _console_handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    _console_handler = handler
    return handler


def setup_logging() -> None:
    """应用统一的日志配置（只应调用一次）"""
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # 配置 root logger
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)
    handler = _create_handler()
    root.addHandler(handler)

    # uvicorn 日志也走相同的 JSON 格式
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        logger = logging.getLogger(name)
        logger.handlers.clear()
        logger.propagate = False
        logger.setLevel(level)
        logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """获取命名 logger（推荐模块级使用）"""
    return logging.getLogger(name)
