"""pytest 共享配置 — 测试数据库隔离 + 依赖覆盖"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app

# 允许 pytest-asyncio 作用于模块级 fixture
pytest_plugins = ("pytest_asyncio",)

# 测试数据库：独立文件，避免污染开发库
TEST_DATABASE_URL = "sqlite:///./test_puzzle_fusion.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})

# 为 SQLite 启用外键约束
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """测试用 get_db — 使用独立的测试数据库"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# 全局覆盖 FastAPI 依赖
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """会话级：创建所有表"""
    Base.metadata.create_all(bind=engine)
    yield
    # 会话结束时清理
    with engine.begin() as conn:
        Base.metadata.drop_all(bind=conn)


@pytest.fixture(autouse=True)
def clean_db():
    """每个测试前清空所有表（保持隔离）"""
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(text(f"DELETE FROM {table.name}"))


@pytest.fixture
def client():
    """返回配置好的 TestClient"""
    return TestClient(app)


@pytest.fixture
def db():
    """返回一个测试数据库会话"""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def auth_headers(client):
    """注册一个新用户并返回认证头（同步版本）"""
    import time
    ts = str(int(time.time() * 1000))
    email = f"authtest_{ts}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpass123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── httpx.AsyncClient 异步测试支持 ──────────────────────────────────────────

@pytest.fixture
async def async_client():
    """返回 httpx.AsyncClient，使用 ASGITransport 直连 FastAPI app"""
    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def async_auth_headers(async_client):
    """注册一个新用户并返回认证头（异步版本）"""
    import time
    ts = str(int(time.time() * 1000))
    email = f"async_auth_{ts}@example.com"
    resp = await async_client.post("/api/auth/register", json={
        "email": email,
        "password": "testpass123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_user_id(auth_headers, client):
    """从认证头中解析 user_id（同步版本）"""
    resp = client.get("/api/auth/me", headers=auth_headers)
    return resp.json()["id"]
