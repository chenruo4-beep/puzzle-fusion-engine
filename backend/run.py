"""生产环境入口 — 建表 + 启动服务器"""
from database import engine, Base
import models.user  # noqa: F401
import models.fragment  # noqa: F401
import models.fusion  # noqa: F401
import models.journal  # noqa: F401
import models.checkin  # noqa: F401
import models.template  # noqa: F401
import models.analytics  # noqa: F401
import models.inspiration  # noqa: F401
import models.journey_map  # noqa: F401
import models.co_creation  # noqa: F401
import models.co_creation_order  # noqa: F401
import models.habit  # noqa: F401
import models.failure  # noqa: F401
import models.feedback  # noqa: F401

Base.metadata.create_all(bind=engine)

import uvicorn
import os

host = os.getenv("HOST", "0.0.0.0")
port = int(os.getenv("PORT", "8000"))
uvicorn.run("main:app", host=host, port=port, log_level="info")
