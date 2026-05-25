"""融合端点异步测试 — httpx.AsyncClient 覆盖 /api/fusions/* 端点，AI Provider 模拟"""

import pytest
from unittest.mock import patch, AsyncMock


pytestmark = pytest.mark.asyncio


def _mock_fusion_result(**overrides):
    """构造模拟的融合分析结果"""
    result = {
        "golden_sentence": "你的组合很独特，能把技术和人际结合起来",
        "profile_tag": "技术+社交达人",
        "confidence": 75,
        "directions": [
            {
                "title": "技术咨询方向",
                "why_this_works": "你有技术背景，又懂人际沟通，可以做技术顾问",
                "market_hint": "中小企业需要技术咨询",
                "difficulty": "medium",
                "time_to_first_result": "2-4周",
                "roadmap": [
                    {
                        "step": 1,
                        "time": "第1周",
                        "action": "整理你的技术经验",
                        "scenic_spot": "瞭望台",
                        "scenic_spot_icon": "🏛️",
                        "checklist": ["列出你会的技术", "写一段自我介绍"],
                        "completion_marker": "完成技能清单",
                        "verification_cost": "🟢",
                    }
                ],
                "used_fragments": ["能力: 编程", "性格: 善于沟通"],
                "next_action": "打开微信，给3个朋友发消息问他们最近有没有技术难题",
                "common_pitfalls": ["一开始就想做大全，反而做不起来"],
            }
        ],
        "mini_directions": [
            {"title": "周末技术工坊", "type": "服务", "tagline": "教邻居用手机"}
        ],
        "insight": "你的组合别人很难复制，因为技术和沟通需要多年的积累",
        "skill_gaps": ["项目管理经验", "定价策略"],
        "fragment_connections": [
            {
                "fragment_a": "能力: 编程",
                "fragment_b": "性格: 善于沟通",
                "connection": "编程能力强加上善于沟通，可以做技术培训",
            }
        ],
    }
    result.update(overrides)
    return result


def _mock_spark_result(**overrides):
    result = {
        "title": "创意小火花",
        "spark": "编程+写作可以组合成技术博客",
        "action": "打开笔记软件，写下3个你会的技术话题",
    }
    result.update(overrides)
    return result


class TestFusionAnalyze:
    """POST /api/fusions/analyze"""

    async def test_analyze_success(self, async_client):
        with patch(
            "services.ai_service.AIService.fuse_fragments",
            new=AsyncMock(return_value=_mock_fusion_result()),
        ):
            resp = await async_client.post("/api/fusions/analyze", json={
                "profession": "软件工程师",
                "fragments": [
                    {"type": "能力", "content": "编程"},
                    {"type": "性格", "content": "善于沟通"},
                    {"type": "知识", "content": "Python"},
                ],
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        # cognitive_profile 可能追加 style 前缀到 golden_sentence
        gs = data["data"]["golden_sentence"]
        assert "独特" in gs or "组合" in gs
        assert len(data["data"]["directions"]) == 1
        assert data["data"]["confidence"] == 75

    async def test_analyze_with_goal(self, async_client):
        with patch(
            "services.ai_service.AIService.fuse_fragments",
            new=AsyncMock(return_value=_mock_fusion_result()),
        ):
            resp = await async_client.post("/api/fusions/analyze", json={
                "profession": "设计师",
                "fragments": [
                    {"type": "技能", "content": "UI设计"},
                    {"type": "能力", "content": "用户研究"},
                    {"type": "知识", "content": "心理学"},
                ],
                "goal": "我想做自由职业",
            })
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    async def test_analyze_less_than_2_fragments_returns_400(self, async_client):
        resp = await async_client.post("/api/fusions/analyze", json={
            "profession": "测试",
            "fragments": [{"type": "能力", "content": "只有一块"}],
        })
        assert resp.status_code == 400
        assert "至少" in resp.json()["detail"]

    async def test_analyze_empty_fragments_returns_400(self, async_client):
        resp = await async_client.post("/api/fusions/analyze", json={
            "profession": "测试",
            "fragments": [],
        })
        assert resp.status_code == 400

    async def test_analyze_missing_profession(self, async_client):
        resp = await async_client.post("/api/fusions/analyze", json={
            "fragments": [
                {"type": "能力", "content": "a"},
                {"type": "技能", "content": "b"},
            ],
        })
        # profession 在 FusionAnalyzeRequest 中没有默认值 — 应 422
        assert resp.status_code == 422

    async def test_analyze_ai_service_error_returns_500(self, async_client):
        with patch(
            "services.ai_service.AIService.fuse_fragments",
            new=AsyncMock(side_effect=Exception("AI 服务异常")),
        ):
            resp = await async_client.post("/api/fusions/analyze", json={
                "profession": "测试",
                "fragments": [
                    {"type": "能力", "content": "a"},
                    {"type": "技能", "content": "b"},
                    {"type": "知识", "content": "c"},
                ],
            })
        assert resp.status_code == 500
        assert "失败" in resp.json()["detail"]


class TestFusionSpark:
    """POST /api/fusions/spark"""

    async def test_spark_success(self, async_client):
        with patch(
            "services.ai_service.AIService.spark_fragments",
            new=AsyncMock(return_value=_mock_spark_result()),
        ):
            resp = await async_client.post("/api/fusions/spark", json={
                "profession": "测试",
                "fragments": [
                    {"type": "能力", "content": "编程"},
                    {"type": "技能", "content": "写作"},
                ],
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "title" in data["data"]
        assert "spark" in data["data"]
        assert "action" in data["data"]

    async def test_spark_less_than_2_fragments_returns_400(self, async_client):
        resp = await async_client.post("/api/fusions/spark", json={
            "profession": "测试",
            "fragments": [{"type": "能力", "content": "只有一块"}],
        })
        assert resp.status_code == 400

    async def test_spark_ai_service_error_returns_500(self, async_client):
        with patch(
            "services.ai_service.AIService.spark_fragments",
            new=AsyncMock(side_effect=Exception("Spark 失败")),
        ):
            resp = await async_client.post("/api/fusions/spark", json={
                "profession": "测试",
                "fragments": [
                    {"type": "能力", "content": "a"},
                    {"type": "技能", "content": "b"},
                ],
            })
        assert resp.status_code == 500


class TestFusionSave:
    """POST /api/fusions/save"""

    async def _create_frags(self, async_client, headers, n=2):
        ids = []
        for i in range(n):
            resp = await async_client.post("/api/fragments/", headers=headers, json={
                "fragment_type": "能力", "content": f"frag{i}",
            })
            ids.append(resp.json()["data"]["id"])
        return ids

    async def test_save_fusion(self, async_client, async_auth_headers):
        ids = await self._create_frags(async_client, async_auth_headers, 2)
        resp = await async_client.post("/api/fusions/save", headers=async_auth_headers, json={
            "profession": "测试",
            "title": "我的融合",
            "fragment_ids": ids,
            "result": '{"golden_sentence": "test result"}',
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "我的融合"
        assert data["profession"] == "测试"
        assert data["user_id"] > 0
        assert data["iteration"] == 1

    async def test_save_fusion_without_profession(self, async_client, async_auth_headers):
        ids = await self._create_frags(async_client, async_auth_headers, 2)
        resp = await async_client.post("/api/fusions/save", headers=async_auth_headers, json={
            "fragment_ids": ids,
            "result": '{"golden_sentence": "test result"}',
        })
        assert resp.status_code == 201

    async def test_save_fusion_too_few_fragments_returns_422(self, async_client, async_auth_headers):
        resp = await async_client.post("/api/fusions/save", headers=async_auth_headers, json={
            "profession": "测试",
            "fragment_ids": [1],
            "result": '{"golden_sentence": "test result"}',
        })
        assert resp.status_code == 422

    async def test_save_fusion_result_too_short_returns_422(self, async_client, async_auth_headers):
        ids = await self._create_frags(async_client, async_auth_headers, 2)
        resp = await async_client.post("/api/fusions/save", headers=async_auth_headers, json={
            "profession": "测试",
            "fragment_ids": ids,
            "result": "short",
        })
        assert resp.status_code == 422

    async def test_save_fusion_without_auth_returns_401(self, async_client):
        resp = await async_client.post("/api/fusions/save", json={
            "profession": "测试",
            "fragment_ids": [1, 2],
            "result": '{"golden_sentence": "test result"}',
        })
        assert resp.status_code == 401


class TestListFusions:
    """GET /api/fusions/"""

    async def test_list_empty(self, async_client, async_auth_headers):
        resp = await async_client.get("/api/fusions/", headers=async_auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["items"] == []

    async def test_list_after_save(self, async_client, async_auth_headers):
        # 先创建碎片
        frags = []
        for i in range(2):
            r = await async_client.post("/api/fragments/", headers=async_auth_headers, json={
                "fragment_type": "能力", "content": f"f{i}",
            })
            frags.append(r.json()["data"]["id"])

        await async_client.post("/api/fusions/save", headers=async_auth_headers, json={
            "profession": "测试",
            "fragment_ids": frags,
            "result": '{"golden_sentence": "test"}',
        })

        resp = await async_client.get("/api/fusions/", headers=async_auth_headers)
        data = resp.json()["data"]
        assert len(data["items"]) == 1
        assert data["pagination"]["total"] == 1

    async def test_list_pagination(self, async_client, async_auth_headers):
        frags = []
        for i in range(2):
            r = await async_client.post("/api/fragments/", headers=async_auth_headers, json={
                "fragment_type": "能力", "content": f"f{i}",
            })
            frags.append(r.json()["data"]["id"])

        for _ in range(3):
            await async_client.post("/api/fusions/save", headers=async_auth_headers, json={
                "fragment_ids": frags, "result": '{"gs":"t"}',
            })

        resp = await async_client.get(
            "/api/fusions/?page=1&page_size=2",
            headers=async_auth_headers,
        )
        data = resp.json()["data"]
        assert len(data["items"]) == 2
        assert data["pagination"]["total"] == 3
        assert data["pagination"]["pages"] == 2

    async def test_list_user_isolation(self, async_client):
        async def reg(email):
            r = await async_client.post("/api/auth/register", json={
                "email": email, "password": "pass123",
            })
            return {"Authorization": f"Bearer {r.json()['access_token']}"}

        async def make_frag(h, n=2):
            ids = []
            for i in range(n):
                r = await async_client.post("/api/fragments/", headers=h, json={
                    "fragment_type": "能力", "content": f"f{i}",
                })
                ids.append(r.json()["data"]["id"])
            return ids

        ha = await reg("fusion_iso_a@test.com")
        hb = await reg("fusion_iso_b@test.com")

        ids_a = await make_frag(ha)
        await async_client.post("/api/fusions/save", headers=ha, json={
            "fragment_ids": ids_a, "result": '{"gs":"a"}',
        })

        resp_b = await async_client.get("/api/fusions/", headers=hb)
        assert resp_b.json()["data"]["pagination"]["total"] == 0

    async def test_list_without_auth_returns_401(self, async_client):
        resp = await async_client.get("/api/fusions/")
        assert resp.status_code == 401


class TestGetFusion:
    """GET /api/fusions/{id}"""

    async def test_get_fusion_by_id(self, async_client, async_auth_headers):
        frags = []
        for i in range(2):
            r = await async_client.post("/api/fragments/", headers=async_auth_headers, json={
                "fragment_type": "能力", "content": f"f{i}",
            })
            frags.append(r.json()["data"]["id"])

        saved = await async_client.post("/api/fusions/save", headers=async_auth_headers, json={
            "profession": "测试",
            "title": "融合详情",
            "fragment_ids": frags,
            "result": '{"golden_sentence": "test detail"}',
        })
        fid = saved.json()["id"]

        resp = await async_client.get(f"/api/fusions/{fid}", headers=async_auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "融合详情"
        assert data["profession"] == "测试"

    async def test_get_nonexistent_returns_404(self, async_client, async_auth_headers):
        resp = await async_client.get("/api/fusions/99999", headers=async_auth_headers)
        assert resp.status_code == 404

    async def test_get_other_users_fusion_returns_404(self, async_client):
        async def reg(email):
            r = await async_client.post("/api/auth/register", json={
                "email": email, "password": "pass123",
            })
            return {"Authorization": f"Bearer {r.json()['access_token']}"}

        ha = await reg("fusion_owner@test.com")
        hb = await reg("fusion_viewer@test.com")

        # A 创建碎片+融合
        ids_a = []
        for i in range(2):
            r = await async_client.post("/api/fragments/", headers=ha, json={
                "fragment_type": "能力", "content": f"f{i}",
            })
            ids_a.append(r.json()["data"]["id"])
        saved = await async_client.post("/api/fusions/save", headers=ha, json={
            "fragment_ids": ids_a, "result": '{"gs":"secret"}',
        })
        fid = saved.json()["id"]

        # B 试图查看 — 应 404 (非自己的)
        resp = await async_client.get(f"/api/fusions/{fid}", headers=hb)
        assert resp.status_code == 404


class TestFusionFeedback:
    """PATCH /api/fusions/{id}/feedback"""

    async def _setup_fusion(self, async_client, headers):
        ids = []
        for i in range(2):
            r = await async_client.post("/api/fragments/", headers=headers, json={
                "fragment_type": "能力", "content": f"fb_frag{i}",
            })
            ids.append(r.json()["data"]["id"])
        saved = await async_client.post("/api/fusions/save", headers=headers, json={
            "fragment_ids": ids, "result": '{"golden_sentence": "feedback test"}',
        })
        return saved.json()["id"]

    async def test_feedback_useful(self, async_client, async_auth_headers):
        fid = await self._setup_fusion(async_client, async_auth_headers)
        resp = await async_client.patch(
            f"/api/fusions/{fid}/feedback",
            headers=async_auth_headers,
            json={"feedback": "useful"},
        )
        assert resp.status_code == 200
        assert resp.json()["feedback"] == "useful"

    async def test_feedback_not_useful_with_reason(self, async_client, async_auth_headers):
        fid = await self._setup_fusion(async_client, async_auth_headers)
        resp = await async_client.patch(
            f"/api/fusions/{fid}/feedback",
            headers=async_auth_headers,
            json={"feedback": "not_useful", "reason": "太笼统了"},
        )
        assert resp.status_code == 200
        assert resp.json()["feedback"] == "not_useful"
        assert resp.json()["reason"] == "太笼统了"

    async def test_feedback_nonexistent_fusion_returns_404(self, async_client, async_auth_headers):
        resp = await async_client.patch(
            "/api/fusions/99999/feedback",
            headers=async_auth_headers,
            json={"feedback": "useful"},
        )
        assert resp.status_code == 404

    async def test_feedback_without_auth_returns_401(self, async_client):
        resp = await async_client.patch(
            "/api/fusions/1/feedback",
            json={"feedback": "useful"},
        )
        assert resp.status_code == 401
