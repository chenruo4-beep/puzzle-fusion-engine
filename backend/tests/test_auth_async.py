"""认证端点异步测试 — httpx.AsyncClient 覆盖 auth register/login/me/onboarding"""

import pytest


pytestmark = pytest.mark.asyncio


class TestRegister:
    """POST /api/auth/register"""

    async def test_register_returns_token(self, async_client):
        resp = await async_client.post("/api/auth/register", json={
            "email": "reg_success@test.com",
            "password": "testpass123",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["email"] == "reg_success@test.com"
        assert isinstance(data["user_id"], int)

    async def test_register_duplicate_email_returns_400(self, async_client):
        email = "reg_dup@test.com"
        await async_client.post("/api/auth/register", json={
            "email": email, "password": "testpass123",
        })
        resp = await async_client.post("/api/auth/register", json={
            "email": email, "password": "otherpass456",
        })
        assert resp.status_code == 400
        assert "已被注册" in resp.json()["detail"]

    async def test_register_missing_fields_returns_422(self, async_client):
        resp = await async_client.post("/api/auth/register", json={})
        assert resp.status_code == 422


class TestLogin:
    """POST /api/auth/login"""

    async def test_login_returns_token(self, async_client):
        email = "login_ok@test.com"
        await async_client.post("/api/auth/register", json={
            "email": email, "password": "testpass123",
        })
        resp = await async_client.post("/api/auth/login", json={
            "email": email, "password": "testpass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["email"] == email

    async def test_login_wrong_password_returns_401(self, async_client):
        email = "login_wrong_pw@test.com"
        await async_client.post("/api/auth/register", json={
            "email": email, "password": "testpass123",
        })
        resp = await async_client.post("/api/auth/login", json={
            "email": email, "password": "wrongpass",
        })
        assert resp.status_code == 401
        assert "错误" in resp.json()["detail"]

    async def test_login_nonexistent_email_returns_401(self, async_client):
        resp = await async_client.post("/api/auth/login", json={
            "email": "noone@test.com", "password": "testpass123",
        })
        assert resp.status_code == 401

    async def test_login_with_just_registered(self, async_client):
        """注册后立即用同一组凭证登录应该成功"""
        resp = await async_client.post("/api/auth/register", json={
            "email": "login_immediate@test.com", "password": "pass123",
        })
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        me = await async_client.get("/api/auth/me", headers=headers)
        assert me.status_code == 200
        assert me.json()["email"] == "login_immediate@test.com"


class TestMe:
    """GET /api/auth/me"""

    async def test_me_with_valid_token(self, async_client, async_auth_headers):
        resp = await async_client.get("/api/auth/me", headers=async_auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "email" in data
        assert "onboarded" in data

    async def test_me_without_token_returns_401(self, async_client):
        resp = await async_client.get("/api/auth/me")
        assert resp.status_code == 401

    async def test_me_with_bad_token_returns_401(self, async_client):
        resp = await async_client.get("/api/auth/me", headers={
            "Authorization": "Bearer invalidtoken123",
        })
        assert resp.status_code == 401


class TestOnboarding:
    """POST /api/auth/complete-onboarding"""

    async def test_complete_onboarding(self, async_client, async_auth_headers):
        resp = await async_client.post(
            "/api/auth/complete-onboarding",
            headers=async_auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

        # 新 token 应包含 onboarded=True
        me = await async_client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {data['access_token']}",
        })
        assert me.json()["onboarded"] is True

    async def test_complete_onboarding_without_auth_returns_401(self, async_client):
        resp = await async_client.post("/api/auth/complete-onboarding")
        assert resp.status_code == 401
