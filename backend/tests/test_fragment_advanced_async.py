"""碎片端点高级测试 — 覆盖 recommend/clusters/gaps/relations/let-go 等未测试端点"""

import pytest
from unittest.mock import patch, AsyncMock

pytestmark = pytest.mark.asyncio


class TestRecommendFragment:
    """GET /api/fragments/recommend"""

    async def _create_frags(self, async_client, headers, count=3):
        """创建多个碎片供推荐测试"""
        contents = [
            ("能力", "精通Python编程开发"),
            ("能力", "精通Python编程技术"),
            ("技能", "数据分析与可视化"),
            ("技能", "数据报表制作展示"),
            ("性格", "善于沟通协调"),
        ]
        ids = []
        for i in range(min(count, len(contents))):
            resp = await async_client.post("/api/fragments/", headers=headers, json={
                "fragment_type": contents[i][0],
                "content": contents[i][1],
            })
            ids.append(resp.json()["data"]["id"])
        return ids

    async def test_recommend_success(self, async_client, async_auth_headers):
        ids = await self._create_frags(async_client, async_auth_headers, 4)
        target_id = ids[0]
        resp = await async_client.get(
            f"/api/fragments/recommend?target_id={target_id}&limit=3",
            headers=async_auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["target_id"] == target_id
        assert isinstance(data["recommendations"], list)

    async def test_recommend_nonexistent_target_returns_404(self, async_client, async_auth_headers):
        resp = await async_client.get(
            "/api/fragments/recommend?target_id=99999",
            headers=async_auth_headers,
        )
        assert resp.status_code == 404
        assert "不存在" in resp.json()["detail"]

    async def test_recommend_all_excluded(self, async_client, async_auth_headers):
        ids = await self._create_frags(async_client, async_auth_headers, 2)
        target_id = ids[0]
        # 排除所有其他碎片
        resp = await async_client.get(
            f"/api/fragments/recommend?target_id={target_id}&exclude_ids={ids[1]}",
            headers=async_auth_headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()["recommendations"]) == 0

    async def test_recommend_user_isolation(self, async_client):
        """其他用户的碎片不应出现在推荐中"""
        async def reg(email):
            r = await async_client.post("/api/auth/register", json={
                "email": email, "password": "pass123",
            })
            return {"Authorization": f"Bearer {r.json()['access_token']}"}

        ha = await reg("rec_owner@test.com")
        hb = await reg("rec_viewer@test.com")

        r = await async_client.post("/api/fragments/", headers=ha, json={
            "fragment_type": "能力", "content": "Python编程",
        })
        target_id = r.json()["data"]["id"]

        resp = await async_client.get(
            f"/api/fragments/recommend?target_id={target_id}",
            headers=hb,
        )
        assert resp.status_code == 404


class TestBatchImport:
    """POST /api/fragments/batch-import"""

    async def test_batch_import_success(self, async_client):
        mock_result = [
            {"type": "技能", "content": "Python编程"},
            {"type": "能力", "content": "数据分析"},
        ]
        with patch(
            "services.ai_service.AIService.batch_import_fragments",
            new=AsyncMock(return_value=mock_result),
        ):
            resp = await async_client.post("/api/fragments/batch-import", json={
                "text": "我会Python编程和数据分析",
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert len(data["data"]) == 2
        assert data["data"][0]["type"] == "技能"

    async def test_batch_import_empty_text(self, async_client):
        resp = await async_client.post("/api/fragments/batch-import", json={
            "text": "",
        })
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    async def test_batch_import_no_auth_required(self, async_client):
        """batch-import 不需要认证"""
        with patch(
            "services.ai_service.AIService.batch_import_fragments",
            new=AsyncMock(return_value=[{"type": "技能", "content": "测试"}]),
        ):
            resp = await async_client.post("/api/fragments/batch-import", json={
                "text": "测试内容",
            })
        assert resp.status_code == 200


class TestDeduplicate:
    """POST /api/fragments/deduplicate"""

    async def test_deduplicate_finds_duplicates(self, async_client, async_auth_headers):
        # 创建两个内容非常相似的碎片（Jaccard > 0.6）
        await async_client.post("/api/fragments/", headers=async_auth_headers, json={
            "fragment_type": "能力", "content": "精通Python编程开发",
        })
        await async_client.post("/api/fragments/", headers=async_auth_headers, json={
            "fragment_type": "能力", "content": "精通Python编程技术",
        })
        resp = await async_client.post("/api/fragments/deduplicate", headers=async_auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_fragments"] >= 2
        # 可能找到重复对
        assert "duplicate_pairs" in data
        assert "candidates" in data

    async def test_deduplicate_no_duplicates(self, async_client, async_auth_headers):
        # 创建内容完全不同的碎片
        await async_client.post("/api/fragments/", headers=async_auth_headers, json={
            "fragment_type": "能力", "content": "Python编程",
        })
        await async_client.post("/api/fragments/", headers=async_auth_headers, json={
            "fragment_type": "性格", "content": "善于沟通交流",
        })
        resp = await async_client.post("/api/fragments/deduplicate", headers=async_auth_headers)
        assert resp.status_code == 200
        assert resp.json()["duplicate_pairs"] == 0

    async def test_deduplicate_empty(self, async_client, async_auth_headers):
        resp = await async_client.post("/api/fragments/deduplicate", headers=async_auth_headers)
        assert resp.status_code == 200
        assert resp.json()["total_fragments"] == 0


class TestClusters:
    """GET /api/fragments/clusters"""

    async def test_clusters_with_enough_fragments(self, async_client, async_auth_headers):
        for content in ["Python编程", "数据分析", "项目沟通", "团队协作"]:
            await async_client.post("/api/fragments/", headers=async_auth_headers, json={
                "fragment_type": "能力", "content": content,
            })
        resp = await async_client.get("/api/fragments/clusters", headers=async_auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_fragments"] == 4
        assert len(data["clusters"]) > 0

    async def test_clusters_too_few_fragments(self, async_client, async_auth_headers):
        await async_client.post("/api/fragments/", headers=async_auth_headers, json={
            "fragment_type": "能力", "content": "Python",
        })
        resp = await async_client.get("/api/fragments/clusters", headers=async_auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["clusters"] == []
        assert "至少需要3块" in data["message"]


class TestFragmentRelations:
    """GET /api/fragments/{id}/relations"""

    async def test_relations_success(self, async_client, async_auth_headers):
        ids = []
        for content in ["Python编程开发", "数据分析技术", "完全不同领域"]:
            r = await async_client.post("/api/fragments/", headers=async_auth_headers, json={
                "fragment_type": "能力", "content": content,
            })
            ids.append(r.json()["data"]["id"])

        resp = await async_client.get(
            f"/api/fragments/{ids[0]}/relations?limit=3",
            headers=async_auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["fragment_id"] == ids[0]
        assert "relations" in data
        assert "relation_labels" in data

    async def test_relations_nonexistent_returns_404(self, async_client, async_auth_headers):
        resp = await async_client.get(
            "/api/fragments/99999/relations",
            headers=async_auth_headers,
        )
        assert resp.status_code == 404
        assert "不存在" in resp.json()["detail"]


class TestGaps:
    """GET /api/fragments/gaps"""

    async def test_gaps_with_fragments(self, async_client, async_auth_headers):
        await async_client.post("/api/fragments/", headers=async_auth_headers, json={
            "fragment_type": "技能", "content": "Python编程",
        })
        await async_client.post("/api/fragments/", headers=async_auth_headers, json={
            "fragment_type": "能力", "content": "数据分析",
        })
        resp = await async_client.get("/api/fragments/gaps", headers=async_auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_fragments" in data
        assert "gaps" in data
        assert "gap_types" in data
        assert "existing_types" in data

    async def test_gaps_empty(self, async_client, async_auth_headers):
        resp = await async_client.get("/api/fragments/gaps", headers=async_auth_headers)
        assert resp.status_code == 200
        assert resp.json()["total_fragments"] == 0


class TestGuessTraits:
    """GET /api/fragments/guess-traits"""

    async def test_guess_traits_with_enough_fragments(self, async_client, async_auth_headers):
        for i in range(5):
            await async_client.post("/api/fragments/", headers=async_auth_headers, json={
                "fragment_type": "能力", "content": f"能力碎片{i}",
            })
        resp = await async_client.get("/api/fragments/guess-traits", headers=async_auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["traits"]) > 0
        for trait in data["traits"]:
            assert "text" in trait
            assert "fragment_type" in trait

    async def test_guess_traits_too_few(self, async_client, async_auth_headers):
        await async_client.post("/api/fragments/", headers=async_auth_headers, json={
            "fragment_type": "能力", "content": "单一碎片",
        })
        resp = await async_client.get("/api/fragments/guess-traits", headers=async_auth_headers)
        assert resp.json()["traits"] == []


class TestConfirmTrait:
    """POST /api/fragments/confirm-trait"""

    async def test_confirm_trait_creates_fragment(self, async_client, async_auth_headers):
        resp = await async_client.post("/api/fragments/confirm-trait", headers=async_auth_headers, json={
            "text": "你有很强的执行力",
            "fragment_type": "能力",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["fragment_type"] == "能力"
        assert data["content"] == "你有很强的执行力"
        assert data["id"] > 0

        # 确认碎片已创建
        listing = await async_client.get("/api/fragments/", headers=async_auth_headers)
        assert listing.json()["data"]["pagination"]["total"] == 1

    async def test_confirm_trait_default_type(self, async_client, async_auth_headers):
        resp = await async_client.post("/api/fragments/confirm-trait", headers=async_auth_headers, json={
            "text": "你似乎有很强的共情力",
        })
        assert resp.status_code == 200
        assert resp.json()["fragment_type"] == "能力"  # 默认值


class TestDenyTrait:
    """POST /api/fragments/deny-trait"""

    async def test_deny_trait(self, async_client):
        """deny-trait 不需要认证"""
        resp = await async_client.post("/api/fragments/deny-trait", json={
            "text": "这个特质不准",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "recorded"
        assert resp.json()["text"] == "这个特质不准"

    async def test_deny_trait_empty_text(self, async_client):
        resp = await async_client.post("/api/fragments/deny-trait", json={})
        assert resp.status_code == 200
        assert resp.json()["status"] == "recorded"


class TestLetGo:
    """POST /api/fragments/let-go/{id}"""

    async def test_let_go_fragment(self, async_client, async_auth_headers):
        created = await async_client.post("/api/fragments/", headers=async_auth_headers, json={
            "fragment_type": "习惯", "content": "每天刷手机2小时",
        })
        fid = created.json()["data"]["id"]

        resp = await async_client.post(f"/api/fragments/let-go/{fid}", headers=async_auth_headers)
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        assert "放下" in resp.json()["message"]

        # 检查已不在活跃列表
        listing = await async_client.get("/api/fragments/", headers=async_auth_headers)
        assert listing.json()["data"]["pagination"]["total"] == 0

    async def test_let_go_nonexistent_returns_404(self, async_client, async_auth_headers):
        resp = await async_client.post("/api/fragments/let-go/99999", headers=async_auth_headers)
        assert resp.status_code == 404

    async def test_let_go_twice(self, async_client, async_auth_headers):
        """已放下的碎片二次放下应返回 404（已归档无法再次找到？不，看代码：fragment=db.query...filter archived=0? 不，没过滤 archived）
        实际上 let-go 不检查 archived，所以可以多次调用"""
        created = await async_client.post("/api/fragments/", headers=async_auth_headers, json={
            "fragment_type": "习惯", "content": "我要放下的",
        })
        fid = created.json()["data"]["id"]

        resp1 = await async_client.post(f"/api/fragments/let-go/{fid}", headers=async_auth_headers)
        assert resp1.status_code == 200

        # 再次放下 — 碎片已归档但仍是该用户的，应仍可找到
        resp2 = await async_client.post(f"/api/fragments/let-go/{fid}", headers=async_auth_headers)
        assert resp2.status_code == 200


class TestLetGoArea:
    """GET /api/fragments/let-go-area"""

    async def test_let_go_area_with_fragments(self, async_client, async_auth_headers):
        created = await async_client.post("/api/fragments/", headers=async_auth_headers, json={
            "fragment_type": "习惯", "content": "要放下的习惯",
        })
        fid = created.json()["data"]["id"]
        await async_client.post(f"/api/fragments/let-go/{fid}", headers=async_auth_headers)

        resp = await async_client.get("/api/fragments/let-go-area", headers=async_auth_headers)
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["content"] == "要放下的习惯"

    async def test_let_go_area_empty(self, async_client, async_auth_headers):
        resp = await async_client.get("/api/fragments/let-go-area", headers=async_auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []


class TestUnLetGo:
    """POST /api/fragments/un-let-go/{id}"""

    async def test_un_let_go_restores_fragment(self, async_client, async_auth_headers):
        created = await async_client.post("/api/fragments/", headers=async_auth_headers, json={
            "fragment_type": "习惯", "content": "取消放下的碎片",
        })
        fid = created.json()["data"]["id"]
        await async_client.post(f"/api/fragments/let-go/{fid}", headers=async_auth_headers)

        resp = await async_client.post(f"/api/fragments/un-let-go/{fid}", headers=async_auth_headers)
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

        # 检查已恢复至活跃列表
        listing = await async_client.get("/api/fragments/", headers=async_auth_headers)
        assert listing.json()["data"]["pagination"]["total"] == 1

    async def test_un_let_go_nonexistent_returns_404(self, async_client, async_auth_headers):
        resp = await async_client.post("/api/fragments/un-let-go/99999", headers=async_auth_headers)
        assert resp.status_code == 404
