"""认证模块测试 — JWT 创建/验证 + 注册/登录端点 + 路由保护"""

import pytest
import time
from fastapi.testclient import TestClient
from jose import jwt
from datetime import datetime, timedelta

from main import app
from config import settings
from routers.auth import create_access_token, verify_access_token, ALGORITHM

client = TestClient(app)


class TestJWTTools:
    """JWT 工具函数测试"""

    def test_create_token_returns_string(self):
        token = create_access_token(user_id=1, email="test@test.com")
        assert isinstance(token, str)
        assert len(token) > 20

    def test_verify_valid_token(self):
        token = create_access_token(user_id=42, email="user@test.com")
        payload = verify_access_token(token)
        assert payload is not None
        assert payload["sub"] == "42"
        assert payload["email"] == "user@test.com"

    def test_verify_expired_token(self):
        expire = datetime.utcnow() - timedelta(hours=1)
        token = jwt.encode(
            {"sub": "1", "email": "old@test.com", "exp": expire},
            settings.SECRET_KEY, algorithm=ALGORITHM
        )
        payload = verify_access_token(token)
        assert payload is None

    def test_verify_tampered_token(self):
        token = create_access_token(user_id=1, email="a@b.com")
        tampered = token[:-5] + "XXXXX"
        payload = verify_access_token(tampered)
        assert payload is None

    def test_verify_wrong_secret(self):
        token = jwt.encode(
            {"sub": "1", "email": "a@b.com", "exp": datetime.utcnow() + timedelta(days=1)},
            "wrong-secret", algorithm=ALGORITHM
        )
        payload = verify_access_token(token)
        assert payload is None


_ts = str(int(time.time() * 1000))


class TestRegister:
    """注册端点测试"""

    def test_register_returns_token(self):
        email = f"reg_test_{_ts}_1@example.com"
        resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["email"] == email
        assert isinstance(data["user_id"], int)

    def test_register_duplicate_email_returns_400(self):
        email = f"reg_test_{_ts}_dup@example.com"
        # 第一次注册
        client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        # 重复注册
        resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "otherpass456",
        })
        assert resp.status_code == 400


class TestLogin:
    """登录端点测试"""

    def test_login_returns_token(self):
        email = f"login_test_{_ts}@example.com"
        # 先注册
        client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        # 登录
        resp = client.post("/api/auth/login", json={
            "email": email,
            "password": "testpass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self):
        email = f"login_test_{_ts}_wp@example.com"
        client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        resp = client.post("/api/auth/login", json={
            "email": email,
            "password": "wrongpass",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_email_returns_401(self):
        resp = client.post("/api/auth/login", json={
            "email": f"nonexistent_{_ts}@example.com",
            "password": "whatever",
        })
        assert resp.status_code == 401


class TestRouteProtection:
    """路由认证保护测试"""

    def test_health_does_not_require_auth(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200

    def test_authenticated_request_succeeds(self):
        """用有效 token 访问受保护路由"""
        email = f"route_test_{_ts}@example.com"
        reg_resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        token = reg_resp.json()["access_token"]

        resp = client.get("/api/fragments/", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert isinstance(data["data"]["items"], list)
