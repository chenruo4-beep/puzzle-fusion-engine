"""认证端点高级测试 — 覆盖 X-User-Id header、token 边界等未测试场景"""

import pytest
import httpx

pytestmark = pytest.mark.asyncio


class TestAuthXUserId:
    """X-User-Id Header 认证测试（开发环境）"""

    async def test_x_user_id_auth_success(self, async_client):
        resp = await async_client.post("/api/auth/register", json={
            "email": "xuid_ok@test.com", "password": "testpass123",
        })
        user_id = resp.json()["user_id"]

        me = await async_client.get("/api/auth/me", headers={"X-User-Id": str(user_id)})
        assert me.status_code == 200
        assert me.json()["email"] == "xuid_ok@test.com"

    async def test_x_user_id_nonexistent_returns_401(self, async_client):
        me = await async_client.get("/api/auth/me", headers={"X-User-Id": "99999"})
        assert me.status_code == 401
        assert "不存在" in me.json()["detail"]

    async def test_fragments_with_x_user_id(self, async_client):
        resp = await async_client.post("/api/auth/register", json={
            "email": "xuid_frag@test.com", "password": "testpass123",
        })
        user_id = resp.json()["user_id"]

        listing = await async_client.get(
            "/api/fragments/",
            headers={"X-User-Id": str(user_id)},
        )
        assert listing.status_code == 200


class TestAuthEdgeCases:
    """认证边界情况测试"""

    async def test_register_long_email(self, async_client):
        email = "a" * 200 + "@test.com"
        resp = await async_client.post("/api/auth/register", json={
            "email": email, "password": "testpass123",
        })
        assert resp.status_code in (201, 422)

    async def test_register_short_password(self, async_client):
        resp = await async_client.post("/api/auth/register", json={
            "email": "short_pw@test.com", "password": "12",
        })
        assert resp.status_code in (201, 422)

    async def test_me_with_bearer_malformed(self, async_client):
        resp = await async_client.get("/api/auth/me", headers={
            "Authorization": "Bearer",
        })
        assert resp.status_code == 401

    async def test_me_with_basic_auth(self, async_client):
        resp = await async_client.get("/api/auth/me", headers={
            "Authorization": "Basic dGVzdDp0ZXN0",
        })
        assert resp.status_code == 401

    async def test_no_auth_header_at_all(self, async_client):
        resp = await async_client.get("/api/auth/me")
        assert resp.status_code == 401
        assert "请先登录" in resp.json()["detail"]


class TestTokenEdgeCases:
    """JWT Token 边界测试"""

    async def test_token_with_onboarded_flag(self, async_client):
        """注册后 token 应包含 onboarded=False"""
        resp = await async_client.post("/api/auth/register", json={
            "email": "token_onboard@test.com", "password": "testpass123",
        })
        token = resp.json()["access_token"]

        me = await async_client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}",
        })
        assert me.json()["onboarded"] is False

    async def test_tampered_token_returns_401(self, async_client):
        resp = await async_client.post("/api/auth/register", json={
            "email": "tamper_test@test.com", "password": "testpass123",
        })
        token = resp.json()["access_token"]
        bad_token = token[:-10] + "A" * 10

        me = await async_client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {bad_token}",
        })
        assert me.status_code == 401
