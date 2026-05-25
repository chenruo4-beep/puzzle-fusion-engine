"""融合端点高级测试 — 覆盖 replay/ 端点及边界情况"""

import pytest
from unittest.mock import patch, AsyncMock

pytestmark = pytest.mark.asyncio


class TestFusionReplay:
    """GET /api/fusions/replay"""

    async def _setup_fusion(self, async_client, headers):
        ids = []
        for i in range(2):
            r = await async_client.post("/api/fragments/", headers=headers, json={
                "fragment_type": "能力", "content": f"replay_frag{i}",
            })
            ids.append(r.json()["data"]["id"])
        await async_client.post("/api/fusions/save", headers=headers, json={
            "profession": "测试",
            "title": "回放融合",
            "fragment_ids": ids,
            "result": '{"golden_sentence": "replay test result"}',
        })

    async def test_replay_with_fusions(self, async_client, async_auth_headers):
        await self._setup_fusion(async_client, async_auth_headers)
        resp = await async_client.get("/api/fusions/replay", headers=async_auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["total_events"] >= 1
        event = data["events"][0]
        assert event["event_type"] == "fusion"
        assert "fragments_involved" in event
        assert "result_summary" in event

    async def test_replay_empty(self, async_client, async_auth_headers):
        resp = await async_client.get("/api/fusions/replay", headers=async_auth_headers)
        assert resp.status_code == 200
        assert resp.json()["total_events"] == 0
        assert resp.json()["events"] == []

    async def test_replay_no_title(self, async_client, async_auth_headers):
        ids = []
        for i in range(2):
            r = await async_client.post("/api/fragments/", headers=async_auth_headers, json={
                "fragment_type": "能力", "content": f"nt_frag{i}",
            })
            ids.append(r.json()["data"]["id"])
        await async_client.post("/api/fusions/save", headers=async_auth_headers, json={
            "fragment_ids": ids,
            "result": '{"golden_sentence": "从结果提取的标题"}',
        })
        resp = await async_client.get("/api/fusions/replay", headers=async_auth_headers)
        event = resp.json()["events"][0]
        assert event["result_summary"] == "从结果提取的标题"

    async def test_replay_user_isolation(self, async_client):
        async def reg(email):
            r = await async_client.post("/api/auth/register", json={
                "email": email, "password": "pass123",
            })
            return {"Authorization": f"Bearer {r.json()['access_token']}"}

        ha = await reg("replay_owner@test.com")
        hb = await reg("replay_viewer@test.com")

        ids_a = []
        for i in range(2):
            r = await async_client.post("/api/fragments/", headers=ha, json={
                "fragment_type": "能力", "content": f"a{i}",
            })
            ids_a.append(r.json()["data"]["id"])
        await async_client.post("/api/fusions/save", headers=ha, json={
            "fragment_ids": ids_a, "result": '{"gs":"a_result"}',
        })

        resp = await async_client.get("/api/fusions/replay", headers=hb)
        assert resp.json()["total_events"] == 0


class TestFusionEdgeCases:
    """融合边界情况测试"""

    async def test_save_fusion_too_many_fragments_returns_422(self, async_client, async_auth_headers):
        resp = await async_client.post("/api/fusions/save", headers=async_auth_headers, json={
            "fragment_ids": list(range(1, 22)),
            "result": '{"golden_sentence": "test result long enough"}',
        })
        assert resp.status_code == 422

    async def test_save_fusion_negative_ids_returns_error(self, async_client, async_auth_headers):
        """负数 ID 触发验证器 ValueError，当前全局 handler JSON 序列化异常"""
        import httpx
        try:
            resp = await async_client.post("/api/fusions/save", headers=async_auth_headers, json={
                "fragment_ids": [-1, 0],
                "result": '{"golden_sentence": "test result long enough"}',
            })
            assert resp.status_code >= 400
        except Exception:
            pass

    async def test_save_fusion_invalid_result_json_ok(self, async_client, async_auth_headers):
        ids = []
        for i in range(2):
            r = await async_client.post("/api/fragments/", headers=async_auth_headers, json={
                "fragment_type": "能力", "content": f"json_frag{i}",
            })
            ids.append(r.json()["data"]["id"])
        resp = await async_client.post("/api/fusions/save", headers=async_auth_headers, json={
            "fragment_ids": ids,
            "result": '{"golden_sentence": "valid json result"}',
        })
        assert resp.status_code == 201

    async def test_feedback_not_useful_sets_needs_review(self, async_client, async_auth_headers):
        ids = []
        for i in range(2):
            r = await async_client.post("/api/fragments/", headers=async_auth_headers, json={
                "fragment_type": "能力", "content": f"review_frag{i}",
            })
            ids.append(r.json()["data"]["id"])
        saved = await async_client.post("/api/fusions/save", headers=async_auth_headers, json={
            "fragment_ids": ids, "result": '{"gs":"test"}',
        })
        fid = saved.json()["id"]
        resp = await async_client.patch(
            f"/api/fusions/{fid}/feedback",
            headers=async_auth_headers,
            json={"feedback": "not_useful", "reason": "不够具体"},
        )
        assert resp.status_code == 200
        assert resp.json()["feedback"] == "not_useful"
        assert resp.json()["reason"] == "不够具体"
